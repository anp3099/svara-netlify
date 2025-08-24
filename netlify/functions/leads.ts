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

/* ----------------------- discover the leads table ---------------------- */
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

/* ------------------------------ normalize ----------------------------- */
function normLeadRow(r: any) {
  const id =
    r?.id ??
    r?.key ??
    r?._id ??
    r?.uuid ??
    r?.leadId ??
    r?.lead_id ??
    r?.contactId ??
    r?.contact_id ??
    r?.prospectId ??
    r?.prospect_id ??
    r?.personId ??
    r?.person_id ??
    r?.recordId ??
    r?.record_id ??
    null;

  const name =
    r?.name ??
    r?.fullName ??
    r?.full_name ??
    [r?.firstName ?? r?.first_name, r?.lastName ?? r?.last_name].filter(Boolean).join(" ").trim() ||
    null;

  const email =
    r?.email ??
    r?.workEmail ??
    r?.work_email ??
    r?.businessEmail ??
    r?.business_email ??
    null;

  return { id, name, email, raw: r };
}

/* -------------------------------- API --------------------------------- */
export const handler: Handler = async (event) => {
  // only GET is supported
  if (event.httpMethod !== "GET") {
    return send(405, { error: "Method not allowed" });
  }

  const blink = getBlink();
  const db: any = blink?.db;

  // health
  if (!event.queryStringParameters || Object.keys(event.queryStringParameters).length === 0) {
    return send(200, {
      ok: true,
      path: event.path,
      rawUrl: (event as any).rawUrl ?? null,
      hasDB: Boolean(db),
    });
  }

  if (!db) return send(200, { ok: false, reason: "DB unavailable on server", rows: [] });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, rows: [], reason: "no-leads-table" });

  const limit = Math.max(1, Math.min(200, Number(event.queryStringParameters?.limit ?? 20)));
  const offset = Math.max(0, Number(event.queryStringParameters?.offset ?? 0));

  let rows: any[] = [];
  try {
    // Prefer list({ limit, offset }) if available
    if (typeof db[leadsKey].list === "function") {
      rows = (await db[leadsKey].list({ limit, offset })) ?? [];
    } else if (typeof db[leadsKey].all === "function") {
      rows = await db[leadsKey].all();
      rows = rows.slice(offset, offset + limit);
    } else {
      rows = [];
    }
  } catch (e: any) {
    return send(200, { ok: false, reason: String(e?.message ?? e ?? "unknown"), rows: [] });
  }

  const out = (Array.isArray(rows) ? rows : []).map(normLeadRow).filter((x) => x.id);
  return send(200, { ok: true, table: leadsKey, rows: out });
};

export default handler;
