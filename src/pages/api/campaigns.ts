// src/pages/api/campaigns.ts
import type { NextApiRequest, NextApiResponse } from "next";

/* ---------------------------- tiny helpers ---------------------------- */
const send = (res: NextApiResponse, code: number, body: any) =>
  res.status(code).json(body);

type AttachResult = { inserted: number; skipped: number; reason?: string; debug?: any };

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

const get = (obj: any, keys: string[]) => {
  for (const k of keys) if (obj && k in obj) return obj[k];
  return undefined;
};

/* ------------------------- load Blink on server ------------------------ */
/** Try several imports/paths; fall back to globalThis.blink. */
async function getBlink(): Promise<any> {
  // already present?
  if ((globalThis as any).blink) return (globalThis as any).blink;

  const tries: Array<() => Promise<any>> = [
    async () => (await import("@/blink/server")).blink,
    async () => (await import("@/blink/server")).default,
    async () => (await import("@/lib/blink")).blink,
    async () => (await import("@/lib/blink")).default,
    async () => (await import("../../blink/server")).blink,
    async () => (await import("../../blink/server")).default,
    async () => (await import("../../../blink/server")).blink,
  ];

  for (const fn of tries) {
    try {
      const b = await fn();
      if (b) {
        (globalThis as any).blink = b;
        return b;
      }
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
    if (typeof db?.[k]?.create === "function" || typeof db?.[k]?.list === "function")
      return k;

  return (
    keys.find(
      (k) =>
        /campaign/i.test(k) &&
        /lead/i.test(k) &&
        (typeof db?.[k]?.create === "function" || typeof db?.[k]?.list === "function")
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
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const debugMode = "debug" in (req.query || {});
  const blink = await getBlink();
  const db: any = blink?.db;

  // --- Health + debug
  if (req.method === "GET" && !("stats" in (req.query || {})) && !("list" in (req.query || {}))) {
    const body: any = {
      ok: true,
      path: "/api/campaigns",
      tables: db ? Object.keys(db) : [],
    };
    if (debugMode) {
      body.debug = [
        { hasBlinkGlobal: Boolean((globalThis as any).blink) },
        { hasDb: Boolean(db) },
      ];
    }
    return send(res, 200, body);
  }

  // --- LIST campaigns (server-side)
  if (req.method === "GET" && "list" in (req.query || {})) {
    if (!db) return send(res, 200, { ok: false, reason: "DB unavailable on server", rows: [] });
    const cKey = findCampaignsTableKey(db);
    if (!cKey) return send(res, 200, { ok: true, rows: [] });

    const rows = (await db[cKey].list?.({ orderBy: { createdAt: "desc" }, limit: 100 })) ?? [];
    const norm = (r: any) => ({
      id: r?.id ?? r?.key ?? r?._id ?? r?.uuid ?? r?.campaignId ?? r?.campaign_id ?? null,
      name: r?.name ?? r?.title ?? "Untitled",
      createdAt: r?.createdAt ?? r?.created_at ?? null,
      raw: r,
    });
    return send(res, 200, { ok: true, rows: rows.map(norm), table: cKey });
  }

  // --- STATS counts per campaign
  if (req.method === "GET" && "stats" in (req.query || {})) {
    const idsRaw = String(req.query?.ids ?? "");
    const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return send(res, 200, { ok: true, counts: {}, reason: "no-ids" });
    if (!db) return send(res, 200, { ok: true, counts: {}, reason: "db-unavailable" });

    const joinKey = findJoinTableKey(db);
    const leadsKey = findLeadsTableKey(db);
    const counts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));

    if (joinKey) {
      const rows = (await db[joinKey].list?.({ limit: 10000 })) ?? [];
      for (const r of rows) {
        const cid = getCampaignIdFromRow(r);
        const lid = getLeadIdFromRow(r);
        if (cid && lid && cid in counts) counts[cid] += 1;
      }
      return send(res, 200, { ok: true, counts, joinKey, leadsKey });
    }

    if (leadsKey) {
      const rows = (await db[leadsKey].list?.({ limit: 10000 })) ?? [];
      for (const r of rows) {
        const cid = getCampaignIdFromRow(r);
        if (cid && cid in counts) counts[cid] += 1;
      }
      return send(res, 200, { ok: true, counts, joinKey, leadsKey });
    }

    return send(res, 200, { ok: true, counts: {}, reason: "no-join-or-leads", joinKey, leadsKey });
  }

  // --- ATTACH leads
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const body = (() => {
    try {
      return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch {
      return {};
    }
  })();

  const campaignId = (req.query?.id as string) ?? body?.campaignId ?? null;
  const leadIds: string[] = Array.isArray(body?.leadIds) ? body.leadIds.filter(Boolean) : [];

  if (!campaignId) return send(res, 400, { error: "campaignId missing" });
  if (!leadIds.length) return send(res, 400, { error: "leadIds[] required" });
  if (!db) return send(res, 200, { inserted: 0, skipped: 0, reason: "DB unavailable on server" } as AttachResult);

  const dbKeys = Object.keys(db);
  const joinKey = findJoinTableKey(db);
  const leadsKey = findLeadsTableKey(db);

  // Ensure leads exist if we can (helpful when join has FK constraints)
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

  let inserted = 0, skipped = 0;

  // 1) Join table path
  if (joinKey) {
    const join = db[joinKey];
    const campaignFields = ["campaignId", "campaign_id", "campaign", "campaignID", "campaignid", "campaignKey"];
    const leadFields = [
      "leadId","lead_id","lead","leadKey","lead_key",
      "contactId","contact_id","prospectId","prospect_id","personId","person_id","recordId","record_id",
    ];

    const tryCreate = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
      for (const ck of campaignFields) {
        for (const lk of leadFields) {
          try {
            await join.create({ [ck]: campaignId, [lk]: lid });
            return "ok";
          } catch (e) {
            if (isDup(e)) return "dup";
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

    return send(res, 200, { inserted, skipped, debug: { joinKey, leadsKey, dbKeys } } as AttachResult);
  }

  // 2) Fallback: stamp a campaign field on the lead rows
  if (leadsKey) {
    const leadsTbl: any = db[leadsKey];
    const candidates = ["campaignId", "campaign_id", "campaign", "campaignKey"];

    const updateOne = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
      for (const f of candidates) {
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

    for (const lid of new Set(leadIds)) {
      const r = await updateOne(lid);
      if (r === "ok") inserted++;
      else if (r === "dup") skipped++;
    }

    return send(res, 200, { inserted, skipped, debug: { joinKey, leadsKey, dbKeys } } as AttachResult);
  }

  return send(res, 200, {
    inserted: 0,
    skipped: 0,
    reason: "No suitable join/leads table discovered",
    debug: { dbKeys: Object.keys(db || {}) },
  } as AttachResult);
}
