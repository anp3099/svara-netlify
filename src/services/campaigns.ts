// src/services/campaigns.ts

export type AttachResult = { inserted: number; skipped: number };

export type CampaignRow = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  createdAt?: string;
  // optional, we’ll hydrate this from the stats API:
  totalLeads?: number;
};

let _blink: any | null = null;
async function getBlinkClient(): Promise<any | null> {
  if (_blink !== null) return _blink;
  try {
    const mod: any = await import("@/blink/client"); // lazy import
    _blink = mod?.blink ?? mod?.default ?? mod ?? null;
  } catch {
    _blink = (globalThis as any).blink ?? null;
  }
  return _blink;
}

function normalizeCampaign(r: any): CampaignRow {
  return {
    id:
      r?.id ??
      r?.key ??
      r?._id ??
      r?.uuid ??
      r?.campaignId ??
      r?.campaign_id ??
      "",
    name: r?.name ?? r?.title ?? "Untitled",
    description: r?.description ?? r?.desc ?? "",
    status: r?.status ?? r?.state ?? undefined,
    createdAt: r?.createdAt ?? r?.created_at ?? undefined,
  };
}

/* ---------- API first (preferred), DB as fallback ---------- */

async function apiListCampaigns(): Promise<CampaignRow[]> {
  try {
    const res = await fetch("/api/campaigns?list=1");
    if (!res.ok) return [];
    const data = (await res.json()) || {};
    const rows: any[] = Array.isArray(data.rows) ? data.rows : [];
    return rows.map(normalizeCampaign);
  } catch {
    return [];
  }
}

async function apiCountsByCampaign(
  ids: string[]
): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const qs = `/api/campaigns?stats=1&ids=${ids.map(encodeURIComponent).join(",")}`;
  try {
    const res = await fetch(qs);
    if (!res.ok) return {};
    const data = (await res.json()) || {};
    return (data.counts as Record<string, number>) ?? {};
  } catch {
    return {};
  }
}

async function dbListCampaigns(): Promise<CampaignRow[]> {
  try {
    const blink = await getBlinkClient();
    const rows =
      (await blink?.db?.campaigns?.list?.({
        orderBy: { createdAt: "desc" },
        limit: 100,
      })) ?? [];
    return rows.map(normalizeCampaign);
  } catch {
    return [];
  }
}

async function httpJSON<T = any>(url: string, body?: any): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const campaignsService = {
  /** List campaigns (API first, DB as fallback). */
  async list(): Promise<CampaignRow[]> {
    const viaApi = await apiListCampaigns();
    if (viaApi.length) return viaApi;
    return dbListCampaigns();
  },

  /** Get counts and merge them onto the rows as `totalLeads`. */
  async hydrateCounts(rows: CampaignRow[]): Promise<CampaignRow[]> {
    const ids = rows.map((r) => r.id).filter(Boolean);
    const counts = await apiCountsByCampaign(ids);
    return rows.map((r) => ({ ...r, totalLeads: counts[r.id] ?? 0 }));
  },

  /** Expose counts as a map if you prefer to use it separately in a page. */
  async countByCampaign(ids: string[]): Promise<Record<string, number>> {
    return apiCountsByCampaign(ids);
  },

  // Create via DB (unchanged from your working version)
  async create(input: {
    userId: string;
    name: string;
    description?: string;
    productId: string;
    id?: string;
  }): Promise<{ id: string; name: string }> {
    const blink = await getBlinkClient();
    if (!blink?.db?.campaigns?.create) {
      throw new Error("DB unavailable to create campaign");
    }
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

  // Attach leads (unchanged logic; tries API then DB fallbacks)
  async attachLeads(campaignId: string, leadIds: string[]): Promise<AttachResult> {
    const ids = Array.from(new Set(leadIds)).filter(Boolean);
    if (!campaignId || ids.length === 0) return { inserted: 0, skipped: 0 };

    const apiOrder = [
      `/.netlify/functions/campaigns?id=${encodeURIComponent(campaignId)}`,
      `/api/campaigns/${encodeURIComponent(campaignId)}/leads`,
      `/api/campaigns/add-leads`,
      `/api/campaigns/attach`,
    ];

    for (const url of apiOrder) {
      const res = await httpJSON<AttachResult>(url, { campaignId, leadIds: ids });
      if (res && Number.isFinite(res.inserted) && Number.isFinite(res.skipped)) return res;
    }

    // DB fallbacks
    const blink = await getBlinkClient();
    const db: any = blink?.db;
    if (!db) return { inserted: 0, skipped: 0 };

    const keys = Object.keys(db);
    const joinKey =
      keys.find(
        (k) => /campaign/i.test(k) && /lead/i.test(k) && typeof db[k]?.create === "function"
      ) ?? null;

    let inserted = 0;
    let skipped = 0;

    if (joinKey) {
      for (const lid of ids) {
        try {
          await db[joinKey].create({ campaignId, leadId: lid });
          inserted++;
        } catch (e: any) {
          if (/duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""))) {
            skipped++;
          }
        }
      }
      return { inserted, skipped };
    }

    const leadsKey =
      keys.find((k) => /^leads$/i.test(k) && typeof db[k]?.update === "function") || "leads";
    if (db[leadsKey]?.update) {
      for (const lid of ids) {
        try {
          await db[leadsKey].update(lid, { campaignId });
          inserted++;
        } catch (e: any) {
          if (/duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""))) {
            skipped++;
          }
        }
      }
      return { inserted, skipped };
    }

    return { inserted: 0, skipped: 0 };
  },
};

export default campaignsService;
