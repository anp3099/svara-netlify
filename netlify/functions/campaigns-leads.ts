// netlify/functions/campaigns-leads.ts
import type { Handler } from "@netlify/functions";

type AttachResult = { inserted: number; skipped: number };
const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

function findTable(db: any, pattern: RegExp, needs: Array<"create" | "update" | "upsert" | "patch">) {
  const keys = Object.keys(db || {});
  for (const k of keys) {
    if (!pattern.test(k)) continue;
    const t = db[k];
    if (needs.some((m) => typeof t?.[m] === "function")) return t;
  }
  return null;
}

// Try a few import paths so this works with your repo layout.
// Adjust to your real server-side blink export if you know it.
function getBlink(): any {
  try { const m = require("../../src/lib/blink"); return m.default ?? m.blink ?? m; } catch {}
  try { const m = require("../../lib/blink");     return m.default ?? m.blink ?? m; } catch {}
  try { const m = require("@/lib/blink");        return m.default ?? m.blink ?? m; } catch {}
  try { const m = require("@/blink/client");     return m.blink ?? m.default ?? m; } catch {}
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const idFromQuery = event.queryStringParameters?.id;
  const body = (() => {
    try { return JSON.parse(event.body || "{}"); } catch { return {}; }
  })();
  const campaignId = String(idFromQuery || body?.campaignId || "");
  const leadIds = Array.isArray(body?.leadIds) ? body.leadIds.filter(Boolean) : [];

  if (!campaignId || !leadIds.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "campaignId and leadIds[] required" }) };
  }

  const blink = getBlink();
  const db: any = blink?.db;
  if (!db) return { statusCode: 500, body: JSON.stringify({ error: "DB unavailable on server" }) };

  // Locate tables
  const join = findTable(db, /campaign.*lead|lead.*campaign|^campaign[_]?leads?$/i, ["create", "upsert"]);
  const leadsTbl = findTable(db, /^leads?$|prospect|contact|people|persons|records/i, ["create","update","upsert","patch"]);

  // Ensure leads exist (for FK)
  if (leadsTbl) {
    const me = await blink.auth?.me?.().catch(() => null);
    for (const lid of Array.from(new Set(leadIds))) {
      const shapes = [{ id: lid, userId: me?.id }, { id: lid, user_id: me?.id }, { id: lid }];
      for (const s of shapes) {
        try {
          if (typeof leadsTbl.upsert === "function") { await leadsTbl.upsert({ where: { id: lid }, update: {}, create: s }); break; }
          if (typeof leadsTbl.create === "function") { await leadsTbl.create(s); break; }
        } catch (e) { if (isDup(e)) break; }
      }
    }
  }

  let inserted = 0, skipped = 0;

  // Prefer join table
  if (join) {
    const tryJoin = async (lid: string): Promise<"ok"|"dup"|"fail"> => {
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
      const r = await tryJoin(lid);
      if (r === "ok") inserted++; else if (r === "dup") skipped++;
    }
    return { statusCode: 200, body: JSON.stringify({ inserted, skipped } as AttachResult) };
  }

  // Last resort: stamp campaignId on the leads table
  if (leadsTbl) {
    for (const lid of Array.from(new Set(leadIds))) {
      try {
        if (typeof leadsTbl.update === "function") await leadsTbl.update(lid, { campaignId });
        else if (typeof leadsTbl.patch === "function") await leadsTbl.patch(lid, { campaignId });
        else if (typeof leadsTbl.upsert === "function") await leadsTbl.upsert({ where: { id: lid }, update: { campaignId }, create: { id: lid, campaignId } });
        inserted++;
      } catch (e) { if (isDup(e)) skipped++; }
    }
    return { statusCode: 200, body: JSON.stringify({ inserted, skipped } as AttachResult) };
  }

  return { statusCode: 500, body: JSON.stringify({ error: "Join table and leads table not found" }) };
};
