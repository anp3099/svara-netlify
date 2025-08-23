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

const CAMPAIGN_KEYS = ["campaignId", "campaign_id", "campaign", "campaignID", "campaignid", "campaignKey"];
const LEAD_KEYS = [
  "leadId","lead_id","lead","leadKey","lead_key",
  "contactId","contact_id",
  "prospectId","prospect_id",
  "personId","person_id",
  "recordId","record_id",
];

const LEADS_TABLE_CANDIDATES = [
  "leads","lead","contacts","prospects","people","persons","records",
  "realLeadDatabase","leadDatabase","realLeads",
];

const PREFERRED_JOIN = ["campaignsLeads","campaign_leads","campaigns_leads","campaignLead","leadCampaign"];

const keysOf = (obj: any): string[] => Object.keys(obj || {});

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

function findJoinTableKey(db: any): string | null {
  for (const k of PREFERRED_JOIN) if (typeof db?.[k]?.create === "function") return k;
  const found = keysOf(db).find(
    (k) => /campaign/i.test(k) && /lead/i.test(k) && typeof db?.[k]?.create === "function",
  );
  return found ?? null;
}

function findLeadsTableKey(db: any): string | null {
  for (const k of LEADS_TABLE_CANDIDATES) {
    const t = db?.[k];
    if (t && (typeof t.update === "function" || typeof t.upsert === "function" || typeof t.patch === "function"))
      return k;
  }
  const discovered = keysOf(db).find((k) => {
    if (/campaign/i.test(k)) return false;
    if (!/lead|contact|prospect|people|person|record/i.test(k)) return false;
    const t = db?.[k];
    return typeof t?.update === "function" || typeof t?.upsert === "function" || typeof t?.patch === "function";
  });
  return discovered ?? null;
}

/** Try to count rows using the best available method. */
async function countWhere(table: any, where: any): Promise<number> {
  try {
    if (typeof table.count === "function") {
      const n = await table.count({ where });
      if (Number.isFinite(n)) return n as number;
    }
  } catch {}
  try {
    // Fallback: list many and count length (use a reasonably high cap)
    const rows = await table.list?.({ where, limit: 5000 });
    if (Array.isArray(rows)) return rows.length;
  } catch {}
  return 0;
}

/** Find which field name works on the table for a given campaignId. */
async function discoverWorkingField(table: any, fieldCandidates: string[], value: string): Promise<string | null> {
  for (const f of fieldCandidates) {
    try {
      const rows = await table.list?.({ where: { [f]: value }, limit: 1 });
      if (Array.isArray(rows)) return f;
    } catch {}
  }
  return null;
}

/* -------------------------------- handler ------------------------------ */
export const handler: Handler = async (event) => {
  // --- STATS MODE ---
  // GET /.netlify/functions/campaigns?stats=1&ids=camp_a,camp_b
  if (event.httpMethod === "GET") {
    const q = event.queryStringParameters || {};
    if (q.stats) {
      const ids = String(q.ids || "").split(",").map((s) => s.trim()).filter(Boolean);
      const blink = getBlink();
      const db: any = blink?.db;
      if (!db || ids.length === 0) {
        return json(200, { ok: true, counts: {}, joinKey: null, leadsKey: null, reason: "no-db-or-ids" });
      }

      const joinKey = findJoinTableKey(db);
      const leadsKey = findLeadsTableKey(db);

      const counts: Record<string, number> = {};
      if (joinKey) {
        const join = db[joinKey];
        // discover which campaign field works on the join
        const campaignField = await discoverWorkingField(join, CAMPAIGN_KEYS, ids[0]) || "campaignId";
        for (const id of ids) {
          counts[id] = await countWhere(join, { [campaignField]: id });
        }
        return json(200, { ok: true, counts, joinKey, leadsKey });
      }

      if (leadsKey) {
        const leadsTbl = db[leadsKey];
        const campField = await discoverWorkingField(leadsTbl, CAMPAIGN_KEYS, ids[0]) || "campaignId";
        for (const id of ids) {
          counts[id] = await countWhere(leadsTbl, { [campField]: id });
        }
        return json(200, { ok: true, counts, joinKey, leadsKey });
      }

      return json(200, { ok: true, counts: {}, joinKey: null, leadsKey: null, reason: "no-join-or-leads" });
    }

    // simple health/debug
    return json(200, { ok: true, path: event.path, rawUrl: (event as any).rawUrl ?? null, tables: [] });
  }

  // --- ATTACH MODE ---
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

    const tryCreate = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
      for (const ck of CAMPAIGN_KEYS) {
        for (const lk of LEAD_KEYS) {
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

    const updateOne = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
      for (const f of CAMPAIGN_KEYS) {
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
