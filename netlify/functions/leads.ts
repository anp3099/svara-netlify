// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* Load .env locally; harmless on Netlify */
try { (eval as any)("require")("dotenv").config(); } catch {}

/* Resolve blink from several possible build paths or global */
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

const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const prefers = [
  "leads","lead","contacts","prospects","people","persons","records",
  "realLeadDatabase","leadDatabase","realLeads",
];

function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  for (const k of prefers) {
    const t = db?.[k];
    if (t && typeof t.list === "function") return k;
  }
  return keys.find(k => /lead|contact|prospect|people|person|record/i.test(k) && typeof db?.[k]?.list === "function") ?? null;
}

/** Some stores return { key, value }; unwrap to value if present. */
const unbox = (r: any) => (r && typeof r === "object" && "value" in r && Object.keys(r).length <= 2 ? r.value : r);

/** Normalize any row shape to the table expects. */
function normRow(row: any) {
  const r = unbox(row) ?? {};
  const id =
    r.id ?? r.key ?? r._id ?? r.uuid ??
    r.email ?? r.workEmail ?? r.businessEmail ?? null;

  return {
    id,
    company: r.company ?? r.companyName ?? r.org ?? r.business ?? r.organization ?? null,
    name: r.name ?? r.fullName ?? r.full_name ?? r.contact ?? r.person ?? r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : null,
    email: r.email ?? r.workEmail ?? r.businessEmail ?? r.work_email ?? r.business_email ?? null,
    industry: r.industry ?? r.vertical ?? null,
    size: r.size ?? r.companySize ?? r.employees ?? r.employeeCount ?? null,
    revenue: r.revenue ?? r.annualRevenue ?? r.annual_revenue ?? null,
    location: r.location ?? r.city ?? r.region ?? r.state ?? r.country ?? null,
    score: r.score ?? r.fit ?? 0,
    raw: r,
  };
}

export const handler: Handler = async (event) => {
  const blink = getBlink();
  const db: any = blink?.db;

  // Debug: prove this is the function and whether we see a DB
  if (event.queryStringParameters?.debug) {
    const matchedFn = "leads";
    const hasDb = !!db;
    const keys = hasDb ? Object.keys(db) : [];
    return send(200, { ok: true, path: event.path, matchedFn, hasDb, keys });
  }

  if (event.httpMethod !== "GET") return send(405, { error: "Method not allowed" });
  if (!db) return send(200, { ok: false, rows: [], reason: "db-unavailable" });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, rows: [], table: null });

  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "50", 10) || 50, 200);

  // Try the primary list() call
  let rows: any[] = (await db[leadsKey].list?.({ limit })) ?? [];

  // If the table is KV-ish and returned `{ store, items }`, unwrap that too.
  // (Some Blink adapters do this.)
  if (!Array.isArray(rows) && rows?.items && Array.isArray(rows.items)) {
    rows = rows.items;
  }

  const out = rows.map(normRow).filter(x => x.id);

  return send(200, { ok: true, rows: out, table: leadsKey, count: out.length });
};
