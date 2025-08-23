// src/services/campaigns.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import blink from "@/lib/blink";

export type AttachResult = { inserted: number; skipped: number };

function genId(prefix = "camp"): string {
  const uuid = (globalThis.crypto?.randomUUID?.() as string | undefined) ?? null;
  if (uuid) return uuid;
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rnd}`;
}
const dedupe = <T,>(a: T[]) => Array.from(new Set(a.filter(Boolean) as T[]));
const isDup = (e: any) => /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

async function tryPostJSON<T = any>(url: string, body: any): Promise<T | null> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as T | null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/** Utility: find a table key by regex and ensure it has at least one of the methods */
function findTable(db: any, pattern: RegExp, needs: Array<"create" | "update" | "upsert" | "patch">) {
  const keys = Object.keys(db || {});
  for (const k of keys) {
    if (!pattern.test(k)) continue;
    const t = db[k];
    if (!t) continue;
    if (needs.some((m) => typeof t[m] === "function")) return { key: k, table: t };
  }
  return null;
}

const campaignsService = {
  async list(userId?: string): Promise<Array<{ id: string; name: string }>> {
    const where = userId ? { userId } : undefined;
    const rows = await (blink as any).db?.campaigns?.list?.({
      where,
      orderBy: { createdAt: "desc" },
    });
    if (!Array.isArray(rows)) return [];
    return rows
      .map((c: any) => ({ id: c.id ?? c.ID ?? c.uuid, name: c.name ?? c.title }))
      .filter((c) => c.id && c.name);
  },

  async create(input: {
    userId: string;
    name: string;
    description?: string;
    productId: string;
    id?: string;
  }): Promise<{ id: string; name: string }> {
    const id = input.id ?? genId();
    const payload = {
      id,
      userId: input.userId,
      name: input.name,
      description: input.description ?? "",
      productId: input.productId,
      // If your DB wants snake_case uncomment:
      // user_id: input.userId,
      // product_id: input.productId,
    };
    const created = await (blink as any).db?.campaigns?.create?.(payload);
    if (!created) throw new Error("Failed to create campaign (no response)");
    return { id, name: input.name };
  },

  /** Attach with robust fallbacks and “ensure leads exist” preflight */
  async attachLeads(campaignId: string, leadIds: string[]): Promise<AttachResult> {
    const ids = dedupe(leadIds);
    if (!campaignId) throw new Error("attachLeads: campaignId required");
    if (!ids.length) return { inserted: 0, skipped: 0 };

    // 1) API attempts first (if server implemented)
    const apiAttempts = [
      { url: `/api/campaigns/${campaignId}/leads`, body: { leadIds: ids } },
      { url: `/api/campaigns/add-leads`, body: { campaignId, leadIds: ids } },
      { url: `/api/campaigns/attach`, body: { campaignId, leadIds: ids } },
    ];
    for (const a of apiAttempts) {
      const json = await tryPostJSON<AttachResult>(a.url, a.body);
      if (json && typeof json.inserted === "number" && typeof json.skipped === "number") {
        return json;
      }
    }

    // Common DB handles
    const db: any = (blink as any).db ?? (blink as any);
    if (!db) throw new Error("Database handle unavailable");

    // Helper: attempt join-table insertion with multiple shapes
    const tryJoinInsert = async (join: any, lid: string): Promise<"ok" | "dup" | "fail"> => {
      const shapes = [
        { campaignId, leadId: lid },
        { campaign_id: campaignId, lead_id: lid },
        { campaign: campaignId, lead: lid },
      ];
      for (const s of shapes) {
        try {
          await join.create(s);
          return "ok";
        } catch (e) {
          if (isDup(e)) return "dup";
        }
      }
      // Some ORMs expose upsert with composite key
      if (typeof join.upsert === "function") {
        try {
          await join.upsert({
            where: { campaignId_leadId: { campaignId, leadId: lid } },
            update: {},
            create: { campaignId, leadId: lid },
          });
          return "ok";
        } catch (e) {
          if (isDup(e)) return "dup";
        }
      }
      return "fail";
    };

    // 2) Discover join table
    const joinCandidates = [
      /campaign.*lead/i,
      /lead.*campaign/i,
      /^campaignLeads$/i,
      /^campaign_leads$/i,
      /^campaigns_leads$/i,
      /^campaignLead$/i,
      /^campaign_lead$/i,
    ];
    let join: any = null;
    for (const rx of joinCandidates) {
      const hit = findTable(db, rx, ["create", "upsert"]);
      if (hit) { join = hit.table; break; }
    }

    // 3) Identify a leads table (for preflight + last resort)
    const leadTablePatterns = [
      /^leads?$/i,
      /prospect/i,
      /contact/i,
      /people|persons|records/i,
    ];
    let leadsTable: any = null;
    for (const rx of leadTablePatterns) {
      const hit = findTable(db, rx, ["create", "update", "patch", "upsert"]);
      if (hit) { leadsTable = hit.table; break; }
    }

    // 4) If join exists, try to insert now
    let inserted = 0, skipped = 0;
    if (join) {
      for (const lid of ids) {
        const r = await tryJoinInsert(join, lid);
        if (r === "ok") inserted++;
        else if (r === "dup") skipped++;
      }
      if (inserted + skipped > 0) return { inserted, skipped };
    }

    // 5) Ensure leads exist (stub create) then retry join
    if (leadsTable) {
      const me = await (blink as any).auth?.me?.().catch(() => null);
      for (const lid of ids) {
        const shapes = [
          { id: lid, userId: me?.id },
          { id: lid, user_id: me?.id },
          { uuid: lid, userId: me?.id },
          { leadId: lid, userId: me?.id },
          { key: lid, userId: me?.id },
          { id: lid }, // ultra-minimal
        ];
        let createdOnce = false;
        for (const s of shapes) {
          try {
            if (typeof leadsTable.upsert === "function") {
              await leadsTable.upsert({ where: { id: lid }, update: {}, create: s });
              createdOnce = true; break;
            }
            if (typeof leadsTable.create === "function") {
              await leadsTable.create(s);
              createdOnce = true; break;
            }
          } catch (e) {
            if (isDup(e)) { createdOnce = true; break; }
            // try next shape
          }
        }
      }

      // Retry join if we have one
      if (join) {
        inserted = 0; skipped = 0;
        for (const lid of ids) {
          const r = await tryJoinInsert(join, lid);
          if (r === "ok") inserted++;
          else if (r === "dup") skipped++;
        }
        if (inserted + skipped > 0) return { inserted, skipped };
      }
    }

    // 6) Last resort: set campaignId on the lead rows directly
    if (leadsTable) {
      inserted = 0; skipped = 0;
      for (const lid of ids) {
        try {
          if (typeof leadsTable.update === "function") {
            await leadsTable.update(lid, { campaignId });
          } else if (typeof leadsTable.patch === "function") {
            await leadsTable.patch(lid, { campaignId });
          } else if (typeof leadsTable.updateWhere === "function") {
            await leadsTable.updateWhere({ where: { id: lid }, data: { campaignId } });
          } else {
            throw new Error("No update* method on leads table");
          }
          inserted++;
        } catch (e) {
          if (isDup(e)) skipped++;
        }
      }
      if (inserted + skipped > 0) return { inserted, skipped };
    }

    // If we got here, we truly couldn't write anything
    throw new Error("No rows attached (possible schema mismatch)");
  },
};

export default campaignsService;
export { campaignsService };
