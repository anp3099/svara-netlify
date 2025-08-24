// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";

/* Load .env locally; harmless on Netlify where env vars are injected */
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
  return keys.find(k =>
    /lead|contact|prospect|people|person|record/i.test(k) &&
    typeof db?.[k]?.list === "function"
  ) ?? null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return send(405, { error: "Method not allowed" });

  const blink = getBlink();
  const db: any = blink?.db;

  // Quick debug mode so you can verify the function is what answered.
  if (event.queryStringParameters?.debug) {
    return send(200, {
      ok: true,
      matchedFn: "leads",
      path: event.path,
      rawUrl: (event as any).rawUrl ?? null,
      hasDb: Boolean(db),
      tables: db ? Object.keys(db) : [],
    });
  }

  if (!db) return send(200, { ok: false, rows: [], reason: "db-unavailable" });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, rows: [], table: null });

  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "50", 10) || 50, 200);
  const rows = (await db[leadsKey].list?.({ limit })) ?? [];

  const norm = (r: any) => ({
    id: r?.id ?? r?.key ?? r?._id ?? r?.uuid ?? null,
    company: r?.company ?? r?.companyName ?? r?.org ?? r?.business ?? null,
    name: r?.name ?? r?.fullName ?? r?.full_name ?? r?.contact ?? r?.person ?? null,
    email: r?.email ?? r?.workEmail ?? r?.businessEmail ?? r?.work_email ?? r?.business_email ?? null,
    industry: r?.industry ?? r?.vertical ?? null,
    size: r?.size ?? r?.companySize ?? r?.employees ?? null,
    revenue: r?.revenue ?? r?.annualRevenue ?? null,
    location: r?.location ?? r?.city ?? r?.region ?? r?.state ?? null,
    score: r?.score ?? r?.fit ?? 0,
    raw: r,
  });

  return send(200, { ok: true, rows: rows.map(norm), table: leadsKey });
};
