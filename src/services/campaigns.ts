// src/services/campaigns.ts
// Works without importing "@/lib/blink" (Netlify build-safe)

export type AttachResult = { inserted: number; skipped: number };
type CampaignRow = { id: string; name: string; status?: string; createdAt?: string; totalLeads?: number };

let _blink: any | null = null;
async function getBlinkClient(): Promise<any | null> {
  if (_blink !== null) return _blink;
  try {
    // Lazy import so Vite/Netlify can resolve it only if present
    const mod: any = await import("@/blink/client");
    _blink = mod?.blink ?? mod?.default ?? mod ?? null;
  } catch {
    _blink = (globalThis as any).blink ?? null;
  }
  return _blink;
}

function normalizeCampaign(r: any): CampaignRow {
  return {
    id: r?.id ?? r?.key,
    name: r?.name ?? r?.title ?? "Untitled",
    status: r?.status ?? r?.state ?? undefined,
    createdAt: r?.createdAt ?? r?.created_at ?? undefined,
  };
}

async function httpJSON<T = any>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const campaignsService = {
  /** List + merge counts from serverless stats (fallback to 0 if unavailable). */
  async list(userId?: string): Promise<CampaignRow[]> {
    try {
      const blink = await getBlinkClient();
      const rows =
        (await blink?.db?.campaigns?.list?.({
          where: userId ? { userId } : undefined,
          orderBy: { createdAt: "desc" },
          limit: 100,
        })) ?? [];
      const mapped: CampaignRow[] = rows.map(normalizeCampaign);

      // ask the Netlify function for counts
      const ids = mapped.map((c) => c.id).filter(Boolean);
      if (ids.length) {
        const qs = `/.netlify/functions/campaigns?stats=1&ids=${encodeURIComponent(ids.join(","))}`;
        const stats = await httpJSON<{ ok: boolean; counts: Record<string, number> }>(qs);
        if (stats?.ok && stats.counts) {
          for (const c of mapped) c.totalLeads = stats.counts[c.id] ?? 0;
        } else {
          for (const c of mapped) c.totalLeads = c.totalLeads ?? 0;
        }
      }
      return mapped;
    } catch {
      return [];
    }
  },

  async create(input: {
    userId: string;
    name: string;
    description?: string;
    productId: string;
    id?: string;
  }): Promise<{ id: string; name: string }> {
    const blink = await getBlinkClient();
    if (!blink?.db?.campaigns?.create) throw new Error("DB unavailable to create campaign");
    const payload = {
      id: input.id ?? (globalThis.crypto?.randomUUID?.() ?? `camp_${Date.now()}`),
      userId: input.userId,
      name: input.name,
      description: input.description ?? "",
      productId: input.productId,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    const created = await blink.db.campaigns.create(payload);
    return { id: created.id ?? payload.id, name: created.name ?? payload.name };
  },

  async attachLeads(campaignId: string, leadIds: string[]): Promise<AttachResult> {
    const ids = Array.from(new Set(leadIds)).filter(Boolean);
    if (!campaignId || ids.length === 0) return { inserted: 0, skipped: 0 };

    // server endpoints first
    const apiOrder = [
      `/.netlify/functions/campaigns?id=${encodeURIComponent(campaignId)}`,
      `/api/campaigns/${encodeURIComponent(campaignId)}/leads`,
      `/api/campaigns/add-leads`,
      `/api/campaigns/attach`,
    ];

    for (const url of apiOrder) {
      const res = await httpJSON<AttachResult>(url, {
        method: "POST",
        body: JSON.stringify({ campaignId, leadIds: ids }),
      });
      if (res && Number.isFinite(res.inserted) && Number.isFinite(res.skipped)) return res;
    }

    // DB fallbacks
    const blink = await getBlinkClient();
    const db: any = blink?.db;
    if (!db) return { inserted: 0, skipped: 0 };

    const keys = Object.keys(db);
    const joinKey = keys.find((k) => /campaign/i.test(k) && /lead/i.test(k) && typeof db[k]?.create === "function") || null;

    let inserted = 0;
    let skipped = 0;

    if (joinKey) {
      for (const lid of ids) {
        try {
          await db[joinKey].create({ campaignId, leadId: lid });
          inserted++;
        } catch (e: any) {
          if (/duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""))) skipped++;
        }
      }
      return { inserted, skipped };
    }

    const leadsKey = keys.find((k) => /^leads$/i.test(k) && typeof db[k]?.update === "function") || "leads";
    if (db[leadsKey]?.update) {
      for (const lid of ids) {
        try {
          await db[leadsKey].update(lid, { campaignId });
          inserted++;
        } catch (e: any) {
          if (/duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""))) skipped++;
        }
      }
      return { inserted, skipped };
    }

    return { inserted: 0, skipped: 0 };
  },
};

export default campaignsService;
export { campaignsService };
