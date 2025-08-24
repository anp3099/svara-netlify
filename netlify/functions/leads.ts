// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* ---------------------------- helpers ---------------------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});
const first = <T = any>(obj: any, keys: string[], fallback: T | null = null): T | null => {
  for (const k of keys) if (obj && k in obj && obj[k] != null) return obj[k];
  return fallback;
};

/* ------------------------ load Blink on server ------------------------ */
/** Try common require paths, then fall back to globalThis.blink. */
function getBlink(): any {
  let req: any;
  try {
    // eslint-disable-next-line no-eval
    req = (eval as any)("require");
  } catch {}
  const tries = [
    "../../src/blink/server",
    "../../src/blink/client",
    "../../src/lib/blink",
    "../../lib/blink",
    "../../../src/lib/blink",
  ];
  for (const p of tries) {
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
    if (t && (typeof t.list === "function" || typeof t.update === "function" || typeof t.upsert === "function")) {
      return k;
    }
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

/* ------------------------------ mapping ------------------------------ */
function pickId(r: any): string | null {
  return (
    first<string>(r, ["id", "key", "_id", "uuid"]) ??
    first<string>(r, ["leadId", "lead_id", "contactId", "contact_id", "recordId", "record_id"]) ??
    null
  );
}
function pickName(r: any): string {
  const full =
    first<string>(r, ["name", "fullName", "full_name"]) ??
    [first<string>(r, ["firstName", "first_name"]) || "", first<string>(r, ["lastName", "last_name"]) || ""]
      .join(" ")
      .trim();
  return full || first<string>(r, ["company"]) || "(no name)";
}
function pickEmail(r: any): string | null {
  return (
    first<string>(r, [
      "email",
      "workEmail",
      "work_email",
      "businessEmail",
      "business_email",
      "personalEmail",
      "personal_email",
      "contactEmail",
    ]) ?? null
  );
}

/* -------------------------------- API --------------------------------- */
export const handler: Handler = async (event) => {
  // Health/debug
  if (event.httpMethod === "GET" && !event.queryStringParameters) {
    return send(200, { ok: true, hint: "use ?limit=20", path: event.path });
  }

  if (event.httpMethod !== "GET") return send(405, { error: "Method not allowed" });

  const blink = getBlink();
  const db: any = blink?.db;
  if (!db) return send(200, { ok: false, reason: "DB unavailable on server", rows: [] });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, reason: "no-leads-table", rows: [] });

  // limit clamp 1..200 (default 50)
  const limitRaw = parseInt(String(event.queryStringParameters?.limit ?? "50"), 10);
  const limit = isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;

  // Try to scope to the current user if possible (ignore failures silently)
  const me = await blink.auth?.me?.().catch(() => null);
  const candidates: any[] = me?.id ? [{ where: { userId: me.id }, limit }, { where: { user_id: me.id }, limit }] : [];
  candidates.push({ limit }); // final fallback with no filter

  let rawRows: any[] = [];
  for (const opts of candidates) {
    try {
      rawRows = (await db[leadsKey].list?.(opts)) ?? [];
      if (Array.isArray(rawRows)) break;
    } catch {
      // try next option
    }
  }

  const rows = (rawRows || [])
    .map((r) => {
      const id = pickId(r);
      return id
        ? {
            id,
            name: pickName(r),
            email: pickEmail(r),
          }
        : null;
    })
    .filter(Boolean);

  return send(200, { ok: true, table: leadsKey, count: rows.length, rows });
};
