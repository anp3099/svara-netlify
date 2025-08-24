// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* Load .env locally; harmless on Netlify */
try { (eval as any)("require")("dotenv").config(); } catch {}

/** Try several require paths; fall back to globalThis.blink */
function getBlink(): any {
  let req: any;
  try { req = (eval as any)("require"); } catch {}
  const tryPaths = [
    "../../src/blink/server",
    "../../src/blink/client",
    "../../src/lib/blink",
    "../../lib/blink",
    "../../../src/lib/blink",
  ];
  for (const p of tryPaths) {
    try {
      const m = req?.(p);
      if (m?.blink) return m.blink;
      if (m?.default) return m.default;
      if (m) return m;
    } catch {}
  }
  return (globalThis as any).blink ?? null;
}

const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = [
    "leads","lead","contacts","prospects","people","persons","records",
    "realLeadDatabase","leadDatabase","realLeads",
  ];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && typeof t.list === "function") return k;
  }
  return (
    keys.find(
      (k) =>
        /lead|contact|prospect|people|person|record/i.test(k) &&
        typeof db?.[k]?.list === "function"
    ) ?? null
  );
}

/** extract first truthy field */
const pick = (obj: any, fields: string[]): any =>
  fields.reduce((v, f) => (v ?? obj?.[f]), undefined);

const normalize = (r: any) => ({
  id:
    r?.id ?? r?.key ?? r?._id ?? r?.uuid ??
    // common nested shapes
    r?.leadId ?? r?.lead_id ?? r?.contactId ?? r?.contact_id ?? null,

  company:
    pick(r, ["company", "companyName", "org", "business", "organization"]) ??
    pick(r?.company, ["name"]) ??
    null,

  name:
    pick(r, ["name", "fullName", "full_name", "contact", "person"]) ??
    pick(r?.person, ["name", "fullName", "full_name"]) ??
    pick(r?.contact, ["name", "fullName", "full_name"]) ??
    null,

  email:
    pick(r, ["email", "workEmail", "businessEmail", "work_email", "business_email"]) ??
    pick(r?.person, ["email", "workEmail", "businessEmail"]) ??
    pick(r?.contact, ["email", "workEmail", "businessEmail"]) ??
    null,

  industry: pick(r, ["industry", "vertical"]) ?? null,
  size:     pick(r, ["size", "companySize", "employees"]) ?? null,
  revenue:  pick(r, ["revenue", "annualRevenue"]) ?? null,
  location: pick(r, ["location", "city", "region", "state"]) ?? null,
  score:    pick(r, ["score", "fit"]) ?? 0,

  // keep the original in case the UI needs something else
  raw: r,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return send(405, { error: "Method not allowed" });

  const blink = getBlink();
  const db: any = blink?.db;

  if (!db) {
    // keep legacy shape so UI doesn't break even on failure
    return send(200, {
      ok: false,
      store: "leads",
      items: [],
      rows: [],
      reason: "db-unavailable",
    });
  }

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) {
    return send(200, { ok: true, store: "leads", items: [], rows: [], table: null });
  }

  const limit = Math.min(
    parseInt(event.queryStringParameters?.limit || "50", 10) || 50,
    200
  );

  // If your driver supports filters/pagination you can extend this later.
  const raw = (await db[leadsKey].list?.({ limit })) ?? [];
  const items = raw.map(normalize);

  // Return BOTH shapes: legacy (store/items) and new (rows)
  return send(200, {
    ok: true,
    store: "leads",
    items,
    rows: items,
    table: leadsKey,
    cursor: null,
    counters: { returned: items.length },
  });
};
