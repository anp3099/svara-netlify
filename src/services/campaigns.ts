// src/services/campaigns.ts
import { blink } from "@/blink/client";

type CreateArgs = {
  userId: string;
  name: string;
  description?: string;
  productId?: string | null;
};

function genId() {
  // camp_20250823_7h2k9q
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rnd = Math.random().toString(36).slice(2, 8);
  return `camp_${ts}_${rnd}`;
}

async function list(userId?: string) {
  const where = userId ? { userId } : undefined;
  const rows = await (blink as any).db?.campaigns?.list?.({
    where,
    orderBy: { createdAt: "desc" },
    limit: 200,
  });
  return (rows || []).map((c: any) => ({
    id: c.id || c.key,
    userId: c.userId ?? c.user_id,
    productId: c.productId ?? c.product_id ?? null,
    name: c.name || "Untitled",
    description: c.description || "",
    status: c.status || "draft",
    totalLeads: c.totalLeads ?? c.total_leads ?? 0,
    contactedLeads: c.contactedLeads ?? c.contacted_leads ?? 0,
    responses: c.responses ?? 0,
    conversions: c.conversions ?? 0,
    createdAt: c.createdAt ?? c.created_at ?? new Date().toISOString(),
  }));
}

async function create(args: CreateArgs) {
  const db: any = (blink as any).db;
  if (!db?.campaigns?.create) throw new Error("campaigns table is not available");

  // prevent duplicates by (userId, name)
  const existing = await db.campaigns.list({
    where: { userId: args.userId, name: args.name.trim() },
    limit: 1,
  });
  if (existing?.[0]) {
    return {
      ...existing[0],
      id: existing[0].id || existing[0].key,
      _existing: true,
    };
  }

  const row = await db.campaigns.create({
    id: genId(),
    userId: args.userId,
    productId: args.productId ?? null,
    name: args.name.trim(),
    description: args.description?.trim() || "",
    status: "draft",
    totalLeads: 0,
    contactedLeads: 0,
    responses: 0,
    conversions: 0,
    createdAt: new Date().toISOString(),
  });

  return { ...row, id: row.id || row.key };
}

/**
 * Attach leads to a campaign.
 * Looks for a join table first; falls back to tagging the lead with campaignId.
 */
async function attachLeads(campaignId: string, leadIds: string[]) {
  const db: any = (blink as any).db;
  if (!db) throw new Error("DB unavailable");

  const ids = Array.from(new Set(leadIds)).filter(Boolean);
  if (ids.length === 0) return { inserted: 0, skipped: 0 };

  // discover a join table
  const keys = Object.keys(db || {});
  const joinKey =
    keys.find((k) => /campaign/i.test(k) && /lead/i.test(k) && typeof db[k]?.create === "function") ||
    null;

  let inserted = 0;
  let skipped = 0;

  if (joinKey) {
    // best case: dedicated join table
    for (const leadId of ids) {
      try {
        await db[joinKey].create({
          id: `cl_${campaignId}_${leadId}`, // unique per pair
          campaignId,
          leadId,
          createdAt: new Date().toISOString(),
        });
        inserted++;
      } catch (e: any) {
        // duplicate pair or constraint ⇒ treat as skipped
        skipped++;
      }
    }
    return { inserted, skipped };
  }

  // fallback: patch leads table with campaignId
  const leadsKey = keys.find((k) => /^leads$/i.test(k) && typeof db[k]?.update === "function");
  if (!leadsKey) throw new Error("No rows attached (possible schema mismatch)");

  for (const leadId of ids) {
    try {
      await db[leadsKey].update(leadId, { campaignId });
      inserted++;
    } catch {
      skipped++;
    }
  }
  if (inserted === 0) throw new Error("No rows attached (possible schema mismatch)");
  return { inserted, skipped };
}

export const campaignsService = { genId, list, create, attachLeads };
export default campaignsService;
