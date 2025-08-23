// netlify/functions/campaigns.ts
import type { Handler } from "@netlify/functions";

const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

type AttachResult = { inserted: number; skipped: number };
const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

// Find a DB table by name pattern and required methods
function findTable(
  db: any,
  pattern: RegExp,
  needs: Array<"create" | "update" | "upsert" | "patch">
) {
  const keys = Object.keys(db || {});
  for (const k of keys) {
    if (!pattern.test(k)) continue;
    const t = db[k];
    if (needs.some((m) => typeof t?.[m] === "function")) return t;
  }
  return null;
}

// Prefer a helper if you already have one; then try common paths
function getBlink(): any {
  try {
    const u = require("./_utils");
    if (typeof u.getBlink === "function") {
      const b = u.getBlink();
      if (b) return b;
    }
  } catch {}
  try { const m = require("../../src/lib/blink"); return m.default ?? m.blink ?? m; } catch {}
  try { const m = require("../../lib/blink");     return m.default ?? m.blink ?? m; } catch {}
  try { const m = require("@/lib/blink");        return m.default ?? m.blink ?? m; } catch {}
  try { const m = require("@/blink/client");     return m.blink ?? m.default ?? m; } catch {}
  return (globalThis as any).blink ?? null;
}

// Pull campaignId from query, body, or any path bits Netlify exposes
function extractCampaignId(event: any, body: any): string | null {
  let id = event?.queryStringParameters?.id || body?.campaignId || "";

  const haystack =
    (event?.path || "") +
    " " +
    (event?.rawUrl || "") +
    " " +
    (event?.headers?.["x-nf-original-pathname"] || "") +
    " " +
    (event?.headers?.["x-original-uri"] || "");

  const m =
    haystack.match(/\/campaigns\/([^/]+)\/leads\/?(\?|$)/i) ||
    haystack.match(/\/api\/campaigns\/([^/]+)\/leads\/?(\?|$)/i);

  if (!id && m) id = m[1];
  return id || null;
}

export const handler: Handler = async (event) => {
  // Handy health/debug
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
  if (!db) return json(500, { error: "DB unavailable on server" });

  const join = findTable(db, /campaign.*lead|lead.*campaign|^campaign[_]?leads?$/i, ["create", "upsert"]);
  const leadsTbl = findTable(db, /^leads?$|prospect|contact|people|persons|records/i, ["create", "update", "upsert", "patch"]);

  // Ensure leads exist for possible FKs
  if (leadsTbl) {
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

  if (join) {
    const attachOne = async (lid: string): Promise<"ok"|"dup"|"fail"> => {
      const shapes = [
        { campaignId, leadId: lid },
        { campaign_id: campaignId, lead_id: lid },
        { campaign: campaignId, lead: lid },
      ];
      for (const s of shapes) {
        try { await join.create(s); return "ok"; }
        catch (e) { if (isDup(e)) return "dup"; }
      }
      if (typeof join.upsert === "function") {
        try {
          await join.upsert({ where: { campaignId_leadId: { campaignId, leadId: lid } }, update: {}, create: { campaignId, leadId: lid } });
          return "ok";
        } catch (e) { if (isDup(e)) return "dup"; }
      }
      return "fail";
    };

    for (const lid of Array.from(new Set(leadIds))) {
      const r = await attachOne(lid);
      if (r === "ok") inserted++;
      else if (r === "dup") skipped++;
    }
    return json(200, { inserted, skipped } as AttachResult);
  }

  if (leadsTbl) {
    for (const lid of Array.from(new Set(leadIds))) {
      try {
        if (typeof leadsTbl.update === "function") await leadsTbl.update(lid, { campaignId });
        else if (typeof leadsTbl.patch === "function") await leadsTbl.patch(lid, { campaignId });
        else if (typeof leadsTbl.upsert === "function") await leadsTbl.upsert({ where: { id: lid }, update: { campaignId }, create: { id: lid, campaignId } });
        inserted++;
      } catch (e) { if (isDup(e)) skipped++; }
    }
    return json(200, { inserted, skipped } as AttachResult);
  }

  return json(500, { error: "Join table and leads table not found" });
};
