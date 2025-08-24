// netlify/functions/campaigns.ts
import type { Handler } from "@netlify/functions";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

type AttachResult = {
  inserted: number;
  skipped: number;
  reason?: string;
  debug?: any;
};

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

const get = (obj: any, keys: string[]) => {
  for (const k of keys) if (obj && k in obj) return obj[k];
  return undefined;
};

/* ------------------------------------------------------------------ */
/* Load Blink on the server (try several common paths)                 */
/* ------------------------------------------------------------------ */
function getBlink(): any {
  let req: any;
  try {
    // eslint-disable-next-line no-eval
    req = (eval as any)("require");
  } catch {
    req = undefined;
  }

  const tryPaths = [
    // typical “server” entry
    "../../src/blink/server",
    "../../../src/blink/server",

    // app-local client/server shims
    "../../src/blink/client",
    "../../../src/blink/client",
    "../../src/lib/blink",
    "../../../src/lib/blink",
    "../../lib/blink",
    "../../../lib/blink",
  ];

  if (req) {
    for (const p of tryPaths) {
      try {
        const m = req(p);
        if (m?.blink) return m.blink;
        if (m?.default) return m.default;
        return m;
      } catch {
        // keep trying
      }
    }
  }

  // last resort: something put it on globalThis
  return (globalThis as any).blink ?? null;
}

/* ------------------------------------------------------------------ */
/* Table discovery                                                     */
/* ------------------------------------------------------------------ */
function findJoinTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = [
    "campaignsLeads",
    "campaign_leads",
    "campaigns_leads",
    "campaignLead",
    "leadCampaign",
  ];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && (typeof t.create === "function" || typeof t.list === "function")) return k;
  }
  return (
    keys.find((k) => {
      const t = db?.[k];
      return (
        /campaign/i.test(k) &&
        /lead/i.test(k) &&
        (typeof t?.create === "function" || typeof t?.list === "function")
      );
    }) ?? null
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

/* ------------------------------------------------------------------ */
/* Normalizers                                                         */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */
export const handler: Handler = async (event) => {
  const blink = getBlink();
  const db: any = blink?.db;

  const qs = event.queryStringParameters || {};
  const method = event.httpMethod.toUpperCase();
  const wantDebug = "debug" in qs;

  /* ----------------------- Health / Debug (GET) ---------------------- */
  if (method === "GET" && !qs.stats && !qs.list) {
    return send(200, {
      ok: true,
      path: event.path,
      rawUrl: (event as any).rawUrl ?? null,
      tables: db ? Object.keys(db) : [],
    });
  }

  /* ----------------------- LIST campaigns (GET) ---------------------- */
  if (method === "GET" && qs.list) {
    if (!db) return send(200, { ok: false, reason: "DB unavailable on server", rows: [] });
    const cKey = findCampaignsTableKey(db);
    if (!cKey) return send(200, { ok: true, rows: [], table: null });

    const rows =
      (await db[cKey].list?.({
        orderBy: { createdAt: "desc" },
        limit: 100,
      })) ?? [];

    const norm = (r: any) => ({
      id:
        r?.id ??
        r?.key ??
        r?._id ??
        r?.uuid ??
        r?.campaignId ??
        r?.campaign_id ??
        null,
      name: r?.name ?? r?.title ?? "Untitled",
      createdAt: r?.createdAt ?? r?.created_at ?? null,
      raw: wantDebug ? r : undefined,
    });

    return send(200, { ok: true, rows: rows.map(norm), table: cKey });
  }

  /* ------------------- STATS per campaign (GET) ---------------------- */
  if (method === "GET" && qs.stats) {
    const ids = String(qs.ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!ids.length) return send(200, { ok: true, counts: {}, reason: "no-ids" });
    if (!db) return send(200, { ok: true, counts: {}, reason: "db-unavailable" });

    const joinKey = findJoinTableKey(db);
    const leadsKey = findLeadsTableKey(db);
    const counts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));

    if (joinKey) {
      const join = db[joinKey];
      const rows = (await join.list?.({ limit: 10000 })) ?? [];
      for (const r of rows) {
        const cid = getCampaignIdFromRow(r);
        const lid = getLeadIdFromRow(r);
        if (cid && lid && cid in counts) counts[cid] += 1;
      }
      return send(200, { ok: true, counts, joinKey, leadsKey });
    }

    if (leadsKey) {
      const leads = db[leadsKey];
      const rows = (await leads.list?.({ limit: 10000 })) ?? [];
      for (const r of rows) {
        const cid = getCampaignIdFromRow(r);
        if (cid && cid in counts) counts[cid] += 1;
      }
      return send(200, { ok: true, counts, joinKey, leadsKey });
    }

    return send(200, { ok: true, counts: {}, reason: "no-join-or-leads", joinKey, leadsKey });
  }

  /* ------------------------- ATTACH leads (POST) --------------------- */
  if (method !== "POST") return send(405, { error: "Method not allowed" });

  const body = (() => {
    try {
      return JSON.parse(event.body || "{}");
    } catch {
      return {};
    }
  })();

  const campaignId = qs.id ?? body?.campaignId ?? null;
  const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds.filter(Boolean) : [];

  if (!campaignId) return send(400, { error: "campaignId missing" });
  if (!leadIds.length) return send(400, { error: "leadIds[] required" });
  if (!db) return send(200, { inserted: 0, skipped: 0, reason: "DB unavailable on server" } as AttachResult);

  const dbKeys = Object.keys(db);
  const joinKey = findJoinTableKey(db);
  const leadsKey = findLeadsTableKey(db);

  // Try to ensure the lead rows exist (useful for FK constraints)
  if (leadsKey) {
    const me = await blink.auth?.me?.().catch(() => null);
    const leadsTbl: any = db[leadsKey];

    for (const lid of new Set(leadIds)) {
      const candidates = [{ id: lid, userId: me?.id }, { id: lid, user_id: me?.id }, { id: lid }];
      for (const c of candidates) {
        try {
          if (typeof leadsTbl.upsert === "function") {
            await leadsTbl.upsert({ where: { id: lid }, update: {}, create: c });
            break;
          }
          if (typeof leadsTbl.create === "function") {
            await leadsTbl.create(c);
            break;
          }
        } catch (e) {
          if (isDup(e)) break;
        }
      }
    }
  }

  let inserted = 0;
  let skipped = 0;

  // 1) Preferred: dedicated join table
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

    const tryCreate = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
      for (const ck of campaignFields) {
        for (const lk of leadFields) {
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

    for (const lid of new Set(leadIds)) {
      const r = await tryCreate(lid);
      if (r === "ok") inserted++;
      else if (r === "dup") skipped++;
    }

    return send(200, { inserted, skipped, debug: wantDebug ? { joinKey, leadsKey, dbKeys } : undefined } as AttachResult);
  }

  // 2) Fallback: stamp campaignId on lead rows
  if (leadsKey) {
    const leadsTbl: any = db[leadsKey];
    const candidates = ["campaignId", "campaign_id", "campaign", "campaignKey"];

    const updateOne = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
      for (const f of candidates) {
        const patch = { [f]: campaignId };
        try {
          if (typeof leadsTbl.update === "function") {
            await leadsTbl.update(lid, patch);
            return "ok";
          }
          if (typeof leadsTbl.patch === "function") {
            await leadsTbl.patch(lid, patch);
            return "ok";
          }
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

    for (const lid of new Set(leadIds)) {
      const r = await updateOne(lid);
      if (r === "ok") inserted++;
      else if (r === "dup") skipped++;
    }

    return send(200, { inserted, skipped, debug: wantDebug ? { joinKey, leadsKey, dbKeys } : undefined } as AttachResult);
  }

  // 3) Nothing matched
  return send(200, {
    inserted: 0,
    skipped: 0,
    reason: "No suitable join/leads table discovered",
    debug: wantDebug ? { dbKeys } : undefined,
  } as AttachResult);
};
