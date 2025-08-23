// netlify/functions/campaigns.ts
import type { Handler } from "@netlify/functions";

/* ---------------------------- small helpers ---------------------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

type AttachResult = { inserted: number; skipped: number; reason?: string; debug?: any };

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

function keysOf(obj: any): string[] {
  return Object.keys(obj || {});
}

function findJoinTableKey(db: any): string | null {
  const keys = keysOf(db);
  // likely names first
  const preferred = [
    "campaignsLeads",
    "campaign_leads",
    "campaigns_leads",
    "campaignLead",
    "leadCampaign",
  ];
  for (const k of preferred) if (typeof db?.[k]?.create === "function") return k;

  // generic discovery
  const found =
    keys.find(
      (k) =>
        /campaign/i.test(k) &&
        /lead/i.test(k) &&
        typeof db?.[k]?.create === "function"
    ) ?? null;

  return found;
}

function findLeadsTableKey(db: any): string | null {
  const keys = keysOf(db);

  // Try obvious ones
  const preferred = [
    "leads",
    "lead",
    "contacts",
    "prospects",
    "people",
    "persons",
    "records",
    "realLeadDatabase",
    "leadDatabase",
    "realLeads",
  ];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && (typeof t.update === "function" || typeof t.upsert === "function" || typeof t.patch === "function"))
      return k;
  }

  // Heuristic: include anything with "lead" but NOT "campaign"
  const discovered = keys.find((k) => {
    if (/campaign/i.test(k)) return false;
    if (!/lead|contact|prospect|people|person|record/i.test(k)) return false;
    const t = db?.[k];
    return typeof t?.update === "function" || typeof t?.upsert === "function" || typeof t?.patch === "function";
  });

  return discovered ?? null;
}

/** Avoid fragile aliased imports. Try common paths, else global. */
function getBlink(): any {
  let req: any;
  try {
    // eslint-disable-next-line no-eval
    req = (eval as any)("require");
  } catch {}
  const tryPaths = [
    "../../src/blink/client",
    "../../src/lib/blink",
    "../../lib/blink",
  ];
  for (const p of tryPaths) {
    try {
      const m = req(p);
      if (m?.blink) return m.blink;
      if (m?.default) return m.default;
      return m;
    } catch {}
  }
  return (globalThis as any).blink ?? null;
}

function extractCampaignId(event: any, body: any): string | null {
  let id = event?.queryStringParameters?.id || body?.campaignId || "";
  const haystack = [
    event?.path || "",
    (event as any)?.rawUrl || "",
    event?.headers?.["x-nf-original-pathname"] || "",
    event?.headers?.["x-original-uri"] || "",
  ].join(" ");
  const m =
    haystack.match(/\/campaigns\/([^/]+)\/leads\/?(\?|$)/i) ||
    haystack.match(/\/api\/campaigns\/([^/]+)\/leads\/?(\?|$)/i);
  if (!id && m) id = m[1];
  return id || null;
}

/* -------------------------------- handler ------------------------------ */
export const handler: Handler = async (event) => {
  // Health check
  if (event.httpMethod === "GET") {
    return json(200, { ok: true, path: event.path, rawUrl: (event as any).rawUrl ?? null });
  }
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = (() => { try { return JSON.parse(event.body || "{}"); } catch { return {}; } })();
  const campaignId = extractCampaignId(event, body);
  const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds.filter(Boolean) : [];

  if (!campaignId) return json(400, { error: "campaignId missing" });
  if (!leadIds.length) return json(400, { error: "leadIds[] required" });

  const blink = getBlink();
  const db: any = blink?.db;
  if (!db) return json(200, { inserted: 0, skipped: 0, reason: "DB unavailable on server" } as AttachResult);

  const dbKeys = keysOf(db);
  const joinKey = findJoinTableKey(db);
  const leadsKey = findLeadsTableKey(db);

  // Try to ensure leads exist if we have a leads table (for FK safety)
  if (leadsKey) {
    const leadsTbl: any = db[leadsKey];
    const me = await blink.auth?.me?.().catch(() => null);
    for (const lid of Array.from(new Set(leadIds))) {
      const candidates = [{ id: lid, userId: me?.id }, { id: lid, user_id: me?.id }, { id: lid }];
      for (const c of candidates) {
        try {
          if (typeof leadsTbl.upsert === "function") { await leadsTbl.upsert({ where: { id: lid }, update: {}, create: c }); break; }
          if (typeof leadsTbl.create === "function") { await leadsTbl.create(c); break; }
        } catch (e) { if (isDup(e)) break; }
      }
    }
  }

  let inserted = 0, skipped = 0;

  // 1) Join table path (most correct)
  if (joinKey) {
    const join = db[joinKey];

    const campaignKeys = ["campaignId", "campaign_id", "campaign", "campaignID", "campaignid", "campaignKey"];
    const leadKeys = [
      "leadId", "lead_id", "lead", "leadKey", "lead_key",
      "contactId", "contact_id",
      "prospectId", "prospect_id",
      "personId", "person_id",
      "recordId", "record_id",
    ];

    const tryCreate = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
      for (const ck of campaignKeys) {
        for (const lk of leadKeys) {
          try {
            await join.create({ [ck]: campaignId, [lk]: lid });
            return "ok";
          } catch (e) {
            if (isDup(e)) return "dup";
            // keep trying other shapes
          }
        }
      }
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

    for (const lid of Array.from(new Set(leadIds))) {
      const r = await tryCreate(lid);
      if (r === "ok") inserted++;
      else if (r === "dup") skipped++;
    }

    if (inserted > 0 || skipped > 0) {
      return json(200, { inserted, skipped, debug: { joinKey, leadsKey, dbKeys } } as AttachResult);
    }
  }

  // 2) Stamp campaign on leads if join doesn't work
  if (leadsKey) {
    const leadsTbl: any = db[leadsKey];
    const campaignFieldCandidates = ["campaignId", "campaign_id", "campaign", "campaignKey"];

    const updateOne = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
      for (const f of campaignFieldCandidates) {
        const patch = { [f]: campaignId };
        try {
          if (typeof leadsTbl.update === "function") { await leadsTbl.update(lid, patch); return "ok"; }
          if (typeof leadsTbl.patch === "function")  { await leadsTbl.patch(lid, patch);  return "ok"; }
          if (typeof leadsTbl.upsert === "function") {
            await leadsTbl.upsert({ where: { id: lid }, update: patch, create: { id: lid, ...patch } });
            return "ok";
          }
        } catch (e) {
          if (isDup(e)) return "dup";
        }
      }
      return "fail";
    };

    for (const lid of Array.from(new Set(leadIds))) {
      const r = await updateOne(lid);
      if (r === "ok") inserted++;
      else if (r === "dup") skipped++;
    }

    return json(200, {
      inserted,
      skipped,
      reason: inserted === 0 && skipped === 0 ? "Leads table present but no compatible campaign field" : undefined,
      debug: { joinKey, leadsKey, dbKeys },
    } as AttachResult);
  }

  // 3) Nothing matched — return debug so we can tune quickly
  return json(200, {
    inserted: 0,
    skipped: 0,
    reason: "No suitable join table or leads table discovered",
    debug: { joinKey, leadsKey, dbKeys },
  } as AttachResult);
};
