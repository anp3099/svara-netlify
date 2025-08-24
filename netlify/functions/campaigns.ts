// netlify/functions/campaigns.ts
import type { Handler } from "@netlify/functions";

/* ---------------------------- tiny helpers ---------------------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

type AttachResult = { inserted: number; skipped: number; reason?: string; debug?: any };

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

const get = (obj: any, keys: string[]) => {
  for (const k of keys) if (obj && k in obj) return obj[k];
  return undefined;
};

// tiny guard so one slow op can’t stall everything
const withSoftTimeout = async <T>(p: Promise<T>, ms = 3000): Promise<T | { __timeout: true }> =>
  await Promise.race([
    p,
    new Promise<{ __timeout: true }>((r) => setTimeout(() => r({ __timeout: true }), ms)),
  ]);

/* ------------------------- load Blink on server ------------------------ */
/** Try several require paths; fall back to globalThis.blink (client build). */
function getBlink(): any {
  let req: any;
  try {
    // eslint-disable-next-line no-eval
    req = (eval as any)("require");
  } catch {}
  const tryPaths = [
    "../../src/blink/server",
    "../../src/blink/client",
    "../../src/lib/blink",
    "../../lib/blink",
    "../../../src/lib/blink",
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

/* -------------------------- table discovery --------------------------- */
function findJoinTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = [
    "campaignsLeads",
    "campaign_leads",
    "campaigns_leads",
    "campaignLead",
    "leadCampaign",
  ];
  for (const k of preferred)
    if (typeof db?.[k]?.create === "function" || typeof db?.[k]?.list === "function") return k;

  return (
    keys.find(
      (k) =>
        /campaign/i.test(k) &&
        /lead/i.test(k) &&
        (typeof db?.[k]?.create === "function" || typeof db?.[k]?.list === "function"),
    ) ?? null
  );
}

function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
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
    if (t && (typeof t.list === "function" || typeof t.update === "function" || typeof t.upsert === "function"))
      return k;
  }
  return (
    keys.find((k) => {
      if (/campaign/i.test(k)) return false;
      if (!/lead|contact|prospect|people|person|record/i.test(k)) return false;
      const t = db?.[k];
      return typeof t?.list === "function" || typeof t?.update === "function" || typeof t?.upsert === "function";
    }) ?? null
  );
}

function findCampaignsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = ["campaigns", "campaign"];
  for (const k of preferred) if (typeof db?.[k]?.list === "function") return k;
  return keys.find((k) => /campaign/i.test(k) && typeof db?.[k]?.list === "function") ?? null;
}

/* ------------------------------ counting ------------------------------ */
function getCampaignIdFromRow(r: any): string | undefined {
  return get(r, ["campaignId", "campaign_id", "campaign", "campaignID", "campaignid", "campaignKey"]);
}
function getLeadIdFromRow(r: any): string | undefined {
  return (
    get(r, ["leadId", "lead_id", "lead", "leadKey", "lead_key"]) ??
    get(r, ["contactId", "contact_id"]) ??
    get(r, ["prospectId", "prospect_id"]) ??
    get(r, ["personId", "person_id"]) ??
    get(r, ["recordId", "record_id"])
  );
}

/* -------------------------------- API --------------------------------- */
export const handler: Handler = async (event) => {
  const blink = getBlink();
  const db: any = blink?.db;

  // Health/debug
  if (event.httpMethod === "GET" && !event.queryStringParameters?.stats && !event.queryStringParameters?.list) {
    return send(200, {
      ok: true,
      path: event.path,
      tables: db ? Object.keys(db) : [],
      debug: (db && Object.keys(db).slice(0, 20)) || [],
    });
  }

  // LIST campaigns (server-visible)
  if (event.httpMethod === "GET" && event.queryStringParameters?.list) {
    if (!db) return send(200, { ok: false, reason: "DB unavailable on server", rows: [] });
    const cKey = findCampaignsTableKey(db);
    if (!cKey) return send(200, { ok: true, rows: [], reason: "no-campaigns-table" });

    const rows = (await withSoftTimeout(db[cKey].list?.({ orderBy: { createdAt: "desc" }, limit: 100 }), 4000)) as
      | any[]
      | { __timeout: true };
    if ((rows as any)?.__timeout) return send(200, { ok: false, rows: [], reason: "list-timeout", table: cKey });

    const norm = (r: any) => ({
      id: r?.id ?? r?.key ?? r?._id ?? r?.uuid ?? r?.campaignId ?? r?.campaign_id ?? null,
      name: r?.name ?? r?.title ?? "Untitled",
      createdAt: r?.createdAt ?? r?.created_at ?? null,
      raw: r,
    });
    return send(200, { ok: true, rows: (rows as any[]).map(norm), table: cKey });
  }

  // STATS: counts per campaign
  if (event.httpMethod === "GET" && event.queryStringParameters?.stats) {
    const ids = (event.queryStringParameters?.ids ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return send(200, { ok: true, counts: {}, reason: "no-ids" });
    if (!db) return send(200, { ok: true, counts: {}, reason: "db-unavailable" });

    const joinKey = findJoinTableKey(db);
    const leadsKey = findLeadsTableKey(db);
    const counts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));

    // Prefer join table
    if (joinKey) {
      const rows = (await withSoftTimeout(db[joinKey].list?.({ limit: 10000 }), 5000)) as
        | any[]
        | { __timeout: true };
      if ((rows as any)?.__timeout)
        return send(200, { ok: true, counts, reason: "join-list-timeout", joinKey, leadsKey });
      for (const r of rows as any[]) {
        const cid = getCampaignIdFromRow(r);
        const lid = getLeadIdFromRow(r);
        if (cid && lid && cid in counts) counts[cid] += 1;
      }
      return send(200, { ok: true, counts, joinKey, leadsKey });
    }

    // Fallback: stamp on leads
    if (leadsKey) {
      const rows = (await withSoftTimeout(db[leadsKey].list?.({ limit: 10000 }), 5000)) as
        | any[]
        | { __timeout: true };
      if ((rows as any)?.__timeout)
        return send(200, { ok: true, counts, reason: "leads-list-timeout", joinKey, leadsKey });
      for (const r of rows as any[]) {
        const cid = getCampaignIdFromRow(r);
        if (cid && cid in counts) counts[cid] += 1;
      }
      return send(200, { ok: true, counts, joinKey, leadsKey });
    }

    return send(200, { ok: true, counts: {}, reason: "no-join-or-leads", joinKey, leadsKey });
  }

  // ATTACH
  if (event.httpMethod !== "POST") return send(405, { error: "Method not allowed" });

  const body = (() => {
    try {
      return JSON.parse(event.body || "{}");
    } catch {
      return {};
    }
  })();

  const campaignId = event.queryStringParameters?.id ?? body?.campaignId ?? null;
  const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds.filter(Boolean) : [];

  if (!campaignId) return send(400, { error: "campaignId missing" });
  if (!leadIds.length) return send(400, { error: "leadIds[] required" });
  if (!db) return send(200, { inserted: 0, skipped: 0, reason: "DB unavailable on server" } as AttachResult);

  const dbKeys = Object.keys(db);
  const joinKey = findJoinTableKey(db);
  const leadsKey = findLeadsTableKey(db);

  let inserted = 0,
    skipped = 0;

  // 1) Join table path
  if (joinKey) {
    const join = db[joinKey];
    const campaignFields = ["campaignId", "campaign_id", "campaign", "campaignID", "campaignid", "campaignKey"];
    const leadFields = [
      "leadId",
      "lead_id",
      "lead",
      "leadKey",
      "lead_key",
      "contactId",
      "contact_id",
      "prospectId",
      "prospect_id",
      "personId",
      "person_id",
      "recordId",
      "record_id",
    ];

    const tryCreate = async (lid: string): Promise<"ok" | "dup" | "fail" | "timeout"> => {
      for (const ck of campaignFields) {
        for (const lk of leadFields) {
          const res = await withSoftTimeout(join.create({ [ck]: campaignId, [lk]: lid }), 3000);
          if ((res as any)?.__timeout) return "timeout";
          try {
            // if create resolved without throw, assume success
            inserted++;
            return "ok";
          } catch (e) {
            if (isDup(e)) {
              skipped++;
              return "dup";
            }
            // try next combination
          }
        }
      }
      // allow upsert pattern if available
      if (typeof join.upsert === "function") {
        const res = await withSoftTimeout(
          join.upsert({
            where: { campaignId_leadId: { campaignId, leadId: lid } },
            update: {},
            create: { campaignId, leadId: lid },
          }),
          3000,
        );
        if ((res as any)?.__timeout) return "timeout";
        try {
          inserted++;
          return "ok";
        } catch (e) {
          if (isDup(e)) {
            skipped++;
            return "dup";
          }
        }
      }
      return "fail";
    };

    for (const lid of new Set(leadIds)) {
      const r = await tryCreate(lid);
      if (r === "fail" || r === "timeout") {
        // don’t stall; just count as skipped with reason in debug
        skipped++;
      }
    }

    return send(
      200,
      { inserted, skipped, debug: { path: "join", joinKey, leadsKey, dbKeys } } as AttachResult,
    );
  }

  // 2) Fallback: stamp campaignId on lead rows
  if (leadsKey) {
    const leadsTbl: any = db[leadsKey];
    const candidates = ["campaignId", "campaign_id", "campaign", "campaignKey"];

    const updateOne = async (lid: string): Promise<void> => {
      for (const f of candidates) {
        const patch = { [f]: campaignId };
        // try update/patch/upsert with a short guard
        const tryOps = [
          typeof leadsTbl.update === "function"
            ? withSoftTimeout(leadsTbl.update(lid, patch), 3000)
            : Promise.resolve({ __skip: true }),
          typeof leadsTbl.patch === "function"
            ? withSoftTimeout(leadsTbl.patch(lid, patch), 3000)
            : Promise.resolve({ __skip: true }),
          typeof leadsTbl.upsert === "function"
            ? withSoftTimeout(leadsTbl.upsert({ where: { id: lid }, update: patch, create: { id: lid, ...patch } }), 3000)
            : Promise.resolve({ __skip: true }),
        ];

        for (const op of tryOps) {
          const res = await op;
          if ((res as any)?.__timeout) continue;
          try {
            inserted++;
            return;
          } catch (e) {
            if (isDup(e)) {
              skipped++;
              return;
            }
            // try next op
          }
        }
      }
      skipped++;
    };

    for (const lid of new Set(leadIds)) await updateOne(lid);

    return send(
      200,
      { inserted, skipped, debug: { path: "leads-stamp", joinKey, leadsKey, dbKeys } } as AttachResult,
    );
  }

  return send(200, {
    inserted: 0,
    skipped: 0,
    reason: "No suitable join/leads table discovered",
    debug: { dbKeys },
  });
};
