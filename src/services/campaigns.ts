// src/services/campaigns.ts
import { blink } from "@/blink/client";

/** Generate stable unique ids for campaigns/join-rows */
const uid = (prefix: string) =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export type CampaignInput = {
  userId: string;
  name: string;
  description?: string;
  productId: string;
};

export type AttachResult = { inserted: number; skipped: number };

function getJoinTable() {
  // Work with both camelCase and snake_case
  const dbAny = blink.db as any;
  const table =
    dbAny.campaignLeads ??
    dbAny.campaign_leads ??
    dbAny.campaignLead ??
    dbAny.campaign_lead;
  if (!table) throw new Error("campaignLeads join table not found in SDK");
  return table;
}

export const campaignService = {
  /** List campaigns for the current user */
  async list(userId: string) {
    return blink.db.campaigns.list({
      where: { userId }, // SDK converts to snake_case for you
      orderBy: { createdAt: "desc" },
    });
  },

  /** Create a campaign with a UUID id */
  async create(input: CampaignInput) {
    const record = {
      id: uid("cmp"),
      userId: input.userId,
      productId: input.productId,
      name: input.name.trim(),
      description: (input.description || "").trim(),
      status: "draft",
      totalLeads: 0,
      contactedLeads: 0,
      responses: 0,
      conversions: 0,
    };
    await blink.db.campaigns.create(record);
    return record;
  },

  /** Attach a set of leads to a campaign (deduped) */
  async attachLeads(campaignId: string, leadIds: string[]): Promise<AttachResult> {
    if (!leadIds.length) return { inserted: 0, skipped: 0 };

    const join = getJoinTable();

    // Find already-attached rows (try $in, fall back to filter in memory)
    let existing: any[] = [];
    try {
      existing = await join.list({
        where: { campaignId, leadId: { $in: leadIds } },
        limit: leadIds.length,
      });
    } catch {
      // some backends don't support $in
      existing = await join.list({ where: { campaignId }, limit: 10000 });
      existing = existing.filter((r: any) =>
        leadIds.includes(String(r.leadId ?? r.lead_id))
      );
    }

    const existingSet = new Set(
      existing.map((r: any) => String(r.leadId ?? r.lead_id))
    );

    let inserted = 0;
    let skipped = 0;

    for (const leadId of leadIds) {
      if (existingSet.has(String(leadId))) {
        skipped++;
        continue;
      }
      try {
        await join.create({
          id: uid("cmpl"),
          campaignId,
          leadId,
          status: "pending",
        });
        inserted++;
      } catch {
        // Unique/constraint -> treat as skipped
        skipped++;
      }
    }

    return { inserted, skipped };
  },
};

export default campaignService;
