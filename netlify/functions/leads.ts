// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* ---------------------------- tiny helpers ---------------------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const get = (obj: any, keys: string[]) => {
  for (const k of keys) if (obj && k in obj) return obj[k];
  return undefined;
};

/* ------------------------- load Blink on server ------------------------ */
/** Try several require paths; fall back to globalThis.blink. */
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

function getLeadIdFromRow(r: any): string | undefined {
  return (
    get(r, ["id", "key", "_id", "uuid"]) ??
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

  // health
  if (event.httpMethod === "GET" && !event.queryStringParameters?.limit && !event.queryStringParameters?.ids) {
    return send(200, {
      ok: true,
      path: event.path,
      tables: db ? Object.keys(db) : [],
    });
  }

  if (event.httpMethod !== "GET") {
    return send(405, { error: "Method not allowed" });
  }

  if (!db) return send(200, { ok: false, reason: "DB unavailable on server", rows: [] });

  // allow forcing a table via ?table=xxx (optional)
  const forcedKey = event.queryStringParameters?.table ?? null;
  const leadsKey = forcedKey || findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, rows: [], table: null, reason: "no-leads-table" });

  const limit = Math.max(1, Math.min(100, Number(event.queryStringParameters?.limit ?? 20)));
  const q = (event.queryStringParameters?.q ?? "").trim();

  // list a small page of leads
  const rows = (await db[leadsKey].list?.({ limit })) ?? [];

  // normalize a few fields and (optionally) filter by q client-side
  const norm = (r: any) => ({
    id: getLeadIdFromRow(r) ?? null,
    name: r?.fullName ?? r?.name ?? r?.company ?? r?.email ?? "(no name)",
    email: r?.email ?? null,
    company: r?.company ?? null,
    createdAt: r?.createdAt ?? r?.created_at ?? null,
    raw: r,
  });

  let out = rows.map(norm).filter((x: any) => x.id);
  if (q) {
    const needle = q.toLowerCase();
    out = out.filter(
      (x: any) =>
        String(x.name ?? "").toLowerCase().includes(needle) ||
        String(x.email ?? "").toLowerCase().includes(needle) ||
        String(x.company ?? "").toLowerCase().includes(needle) ||
        String(x.id).toLowerCase().includes(needle)
    );
  }

  return send(200, { ok: true, rows: out, table: leadsKey });
};
