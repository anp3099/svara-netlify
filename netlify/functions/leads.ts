// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* ---------------------------- tiny helpers ---------------------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

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

/* ------------------------------ handler ------------------------------- */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return send(405, { ok: false, error: "Method not allowed" });
  }

  const blink = getBlink();
  const db: any = blink?.db;

  if (!db) {
    return send(200, { ok: false, reason: "DB unavailable on server", rows: [] });
  }

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) {
    return send(200, { ok: true, reason: "no-leads-table", rows: [] });
  }

  const limit = Math.max(
    1,
    Math.min( Number(event.queryStringParameters?.limit ?? 20) || 20, 200)
  );

  // Pull some leads
  const rawRows =
    (await db[leadsKey].list?.({ limit })) ??
    [];

  // Normalize a few common fields so the UI/snippets are predictable
  const rows = rawRows.map((r: any) => ({
    id: r?.id ?? r?.key ?? r?._id ?? r?.uuid ?? r?.email ?? null,
    name: r?.name ?? r?.fullName ?? r?.full_name ?? r?.company ?? r?.email ?? "(no name)",
    email:
      r?.email ??
      r?.workEmail ?? r?.work_email ??
      r?.businessEmail ?? r?.business_email ??
      r?.personalEmail ?? r?.personal_email ??
      r?.contact_email ?? null,
    raw: r,
  }));

  return send(200, { ok: true, table: leadsKey, rows });
};
