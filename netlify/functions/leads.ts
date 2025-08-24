// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";
import { getBlink, blinkDebug } from "./_blink";

/* load .env locally; harmless on Netlify */
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
} catch {}

const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

// --- table discovery ---
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

// --- normalizer used by UI/tests ---
function normRow(r: any) {
  return {
    id: r?.id ?? r?.key ?? r?._id ?? r?.uuid ?? null,
    company:
      r?.company ?? r?.companyName ?? r?.org ?? r?.business ?? r?.account ?? null,
    name:
      r?.name ??
      r?.fullName ??
      r?.full_name ??
      r?.contact ??
      r?.person ??
      r?.firstName && r?.lastName
        ? `${r.firstName} ${r.lastName}`.trim()
        : null,
    email:
      r?.email ??
      r?.workEmail ??
      r?.businessEmail ??
      r?.work_email ??
      r?.business_email ??
      null,
    industry: r?.industry ?? r?.vertical ?? null,
    size: r?.size ?? r?.companySize ?? r?.employees ?? null,
    revenue: r?.revenue ?? r?.annualRevenue ?? null,
    location: r?.location ?? r?.city ?? r?.region ?? r?.state ?? null,
    score: r?.score ?? r?.fit ?? 0,
    raw: r,
  };
}

export const handler: Handler = async (event) => {
  // -------- health / debug ----------
  if (event.httpMethod === "GET" && event.queryStringParameters?.debug) {
    const dbg = await blinkDebug();
    return send(200, {
      ok: true,
      path: "/.netlify/functions/leads",
      matchedFn: "Leads",
      ...dbg,
    });
  }

  if (event.httpMethod !== "GET") {
    return send(405, { error: "Method not allowed" });
  }

  const blink = await getBlink();
  const db: any = (blink as any)?.db;

  if (!db) {
    // Still give a correctly shaped response so the UI won’t explode
    return send(200, {
      ok: true,
      store: "Leads",
      items: [],
      cursor: null,
      counters: {},
      reason: "db-unavailable",
    });
  }

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) {
    return send(200, {
      ok: true,
      store: "Leads",
      items: [],
      cursor: null,
      counters: {},
      reason: "leads-table-not-found",
      keys: Object.keys(db || {}),
    });
  }

  const limit = Math.min(
    parseInt(event.queryStringParameters?.limit || "50", 10) || 50,
    200
  );

  const rows = (await db[leadsKey].list?.({ limit })) ?? [];

  // Return in the same “shape” your front-end already consumes when it calls /api/leads
  return send(200, {
    ok: true,
    store: "Leads",
    items: rows.map(normRow),
    cursor: null,
    counters: { returned: rows.length },
    table: leadsKey,
  });
};
