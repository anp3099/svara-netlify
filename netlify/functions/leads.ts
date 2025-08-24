// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* Load .env locally; harmless on Netlify where env is injected */
try { (eval as any)("require")("dotenv").config(); } catch {}

/* ------------------------- Blink loader (multi-path) ------------------------- */
function getBlink(): any {
  let req: any;
  try { req = (eval as any)("require"); } catch {}
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

/* ------------------------------- tiny helpers ------------------------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = [
    "leads", "lead",
    "contacts", "prospects", "people", "persons", "records",
    "realLeadDatabase", "leadDatabase", "realLeads",
  ];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && typeof t.list === "function") return k;
  }
  return (
    keys.find(
      (k) =>
        /lead|contact|prospect|people|person|record/i.test(k) &&
        typeof db?.[k]?.list === "function",
    ) ?? null
  );
}

/* Normalize a lead row so the UI never shows “Unknown” unless truly missing */
function normalizeLead(r: any) {
  return {
    id:
      r?.id ?? r?.key ?? r?._id ?? r?.uuid ?? null,
    company:
      r?.company ?? r?.companyName ?? r?.org ?? r?.organization ?? r?.business ?? null,
    name:
      r?.name ?? r?.fullName ?? r?.full_name ?? r?.contact ?? r?.person ?? r?.firstLast ?? null,
    email:
      r?.email ?? r?.workEmail ?? r?.work_email ?? r?.businessEmail ?? r?.business_email ?? null,
    industry:
      r?.industry ?? r?.vertical ?? r?.sector ?? null,
    size:
      r?.size ?? r?.companySize ?? r?.company_size ?? r?.employees ?? r?.employeeCount ?? null,
    revenue:
      r?.revenue ?? r?.annualRevenue ?? r?.annual_revenue ?? null,
    location:
      r?.location ?? r?.city ?? r?.region ?? r?.state ?? r?.country ?? null,
    score:
      r?.score ?? r?.fit ?? r?.leadScore ?? 0,
    raw: r,
  };
}

/* ---------------------------------- API ---------------------------------- */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return send(405, { error: "Method not allowed" });

  const blink = getBlink();
  const db: any = blink?.db;
  if (!db) return send(200, { ok: false, rows: [], items: [], reason: "db-unavailable" });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, rows: [], items: [], table: null });

  const limit = Math.min(
    parseInt(event.queryStringParameters?.limit || "50", 10) || 50,
    200,
  );
  const cursor = event.queryStringParameters?.cursor ?? null;

  // Call list(); support both array and object responses
  let result: any;
  try {
    result = await db[leadsKey].list?.(
      cursor ? { limit, cursor } : { limit }
    );
  } catch (e) {
    return send(200, { ok: false, rows: [], items: [], reason: String(e || "list-failed") });
  }

  const items: any[] = Array.isArray(result)
    ? result
    : (result?.items ?? result?.rows ?? []);

  const rows = items.map(normalizeLead);

  const out = {
    ok: true,
    table: leadsKey,
    // canonical for the UI
    rows,
    // keep older consumers working
    items,
    cursor: result?.cursor ?? null,
    counters: result?.counters ?? null,
  };

  return send(200, out);
};
