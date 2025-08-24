// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* Load .env locally; harmless on Netlify where env is injected */
try { (eval as any)("require")("dotenv").config(); } catch {}

/** Try several require paths; fall back to globalThis.blink */
function getBlink(): any {
  let req: any; try { req = (eval as any)("require"); } catch {}
  for (const p of [
    "../../src/blink/server",
    "../../src/blink/client",
    "../../src/lib/blink",
    "../../lib/blink",
    "../../../src/lib/blink",
  ]) {
    try {
      const m = req?.(p);
      if (m?.blink) return m.blink;
      if (m?.default) return m.default;
      if (m) return m;
    } catch {}
  }
  return (globalThis as any).blink ?? null;
}

/* helpers */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const pick = (obj: any, keys: string[]) => {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return null;
};

function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = [
    "leads","lead","contacts","prospects","people","persons","records",
    "realLeadDatabase","leadDatabase","realLeads",
  ];
  for (const k of preferred) {
    if (typeof db?.[k]?.list === "function") return k;
  }
  return keys.find(k =>
    /lead|contact|prospect|people|person|record/i.test(k) &&
    typeof db?.[k]?.list === "function"
  ) ?? null;
}

const normalize = (r: any) => ({
  id:        pick(r, ["id", "key", "_id", "uuid"]),
  company:   pick(r, ["company", "companyName", "org", "business", "organization", "employer"]),
  name:      pick(r, ["name", "fullName", "full_name", "contact", "person"]),
  email:     pick(r, ["email", "workEmail", "businessEmail", "work_email", "business_email"]),
  industry:  pick(r, ["industry", "vertical", "sector"]),
  size:      pick(r, ["size", "companySize", "employees", "employeeCount"]),
  revenue:   pick(r, ["revenue", "annualRevenue", "arr", "yrRevenue"]),
  location:  pick(r, ["location", "city", "region", "state", "country"]),
  score:     Number(pick(r, ["score", "fit", "leadScore"])) || 0,
  raw: r,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return send(405, { error: "Method not allowed" });

  const blink = getBlink();
  const db: any = blink?.db;

  // quick debug to confirm you're hitting the Netlify function at all
  if (event.queryStringParameters?.debug) {
    return send(200, {
      ok: true,
      path: event.path,
      matchedFn: "leads",
      hasDb: !!db,
      keys: db ? Object.keys(db) : [],
    });
  }

  if (!db) return send(200, { ok: false, rows: [], reason: "db-unavailable" });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, rows: [], table: null });

  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "50", 10) || 50, 200);
  const rawRows = (await db[leadsKey].list?.({ limit })) ?? [];

  // If someone explicitly asks for the old "store" shape, keep it available.
  if (event.queryStringParameters?.store) {
    return send(200, {
      store: "leads",
      items: rawRows,
      cursor: null,
      counters: { count: rawRows.length },
    });
  }

  // Default (normalized) shape for your grid
  const rows = rawRows.map(normalize);
  return send(200, { ok: true, rows, table: leadsKey });
};
