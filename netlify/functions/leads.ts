// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* ---------------------------- tiny helpers ---------------------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

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
    // add any custom names you use here:
    "lead_db",
    "lead_database",
  ];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && (typeof t.list === "function" || typeof t.update === "function" || typeof t.upsert === "function"))
      return k;
  }
  // heuristic fallback
  return (
    keys.find((k) => {
      if (/campaign/i.test(k)) return false;
      if (!/lead|contact|prospect|people|person|record/i.test(k)) return false;
      const t = db?.[k];
      return typeof t?.list === "function" || typeof t?.update === "function" || typeof t?.upsert === "function";
    }) ?? null
  );
}

function getId(r: any): string | null {
  return (
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
    null
  );
}

export const handler: Handler = async (event) => {
  const blink = getBlink();
  const db: any = blink?.db;

  const debug = event.queryStringParameters?.debug ? true : false;
  const limit = Math.max(1, Math.min(200, Number(event.queryStringParameters?.limit ?? 20)));

  if (!db) {
    return send(200, {
      ok: false,
      reason: "DB unavailable on server",
      rows: [],
      ...(debug ? { tables: [] } : {}),
    });
  }

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) {
    return send(200, {
      ok: true,
      rows: [],
      reason: "no-leads-table",
      ...(debug ? { tables: Object.keys(db || {}) } : {}),
    });
  }

  // Try list; if your adapter needs different args, adapt here.
  let rawRows: any[] = [];
  try {
    rawRows = (await db[leadsKey].list?.({ limit })) ?? [];
  } catch {
    // silently ignore; return empty
  }

  const rows = (Array.isArray(rawRows) ? rawRows : []).map((r) => {
    const id = getId(r);
    const email = r?.email ?? r?.workEmail ?? r?.work_email ?? r?.businessEmail ?? r?.business_email ?? null;
    const name =
      r?.name ??
      r?.fullName ??
      r?.full_name ??
      r?.firstName && r?.lastName ? `${r.firstName} ${r.lastName}` : null ??
      r?.company ??
      email ??
      "(no name)";
    return { id, name, email, raw: r };
  });

  // filter out rows without an ID so the console snippet stays clean
  const filtered = rows.filter((x) => x.id);

  return send(200, {
    ok: true,
    table: leadsKey,
    rows: filtered,
    ...(debug ? { tables: Object.keys(db || {}) } : {}),
  });
};
