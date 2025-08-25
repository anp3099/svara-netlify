// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";
import { blink } from "./_blink";

/* ---------------- tiny helpers ---------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

/* -------------- table discovery --------------- */
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
      (k) => /lead|contact|prospect|people|person|record/i.test(k) && typeof db?.[k]?.list === "function",
    ) ?? null
  );
}

/* --------------------- API --------------------- */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return send(405, { error: "Method not allowed" });

  // debug mode
  if (event.queryStringParameters?.debug) {
    const db: any = (blink as any)?.db;
    return send(200, {
      ok: true,
      matchedFn: "leads",
      hasDb: Boolean(db),
      keys: db ? Object.keys(db) : [],
    });
  }

  const db: any = (blink as any)?.db;
  if (!db) return send(200, { ok: false, rows: [], reason: "db-unavailable" });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, rows: [], table: null });

  const limit = Math.min(parseInt(event.queryStringParameters?.limit || "50", 10) || 50, 200);
  const rows = (await db[leadsKey].list?.({ limit })) ?? [];

  const items = rows.map((r: any) => {
    // Build a full name from parts (avoid mixing ?? and || without parens)
    const nameFromParts = [r?.firstName ?? r?.first_name, r?.lastName ?? r?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    const safeNameFromParts = (nameFromParts || undefined); // if empty string, treat as undefined

    return {
      id:
        r?.id ??
        r?.key ??
        r?._id ??
        r?.uuid ??
        r?.contactId ??
        r?.contact_id ??
        r?.leadId ??
        r?.lead_id ??
        null,
      company: r?.company ?? r?.companyName ?? r?.org ?? r?.business ?? null,
      // Use only ?? in this chain; the only || is wrapped above
      name: (r?.name ?? r?.fullName ?? r?.full_name ?? safeNameFromParts) ?? null,
      email: r?.email ?? r?.workEmail ?? r?.businessEmail ?? r?.work_email ?? r?.business_email ?? null,
      industry: r?.industry ?? r?.vertical ?? null,
      size: r?.size ?? r?.companySize ?? r?.employees ?? null,
      revenue: r?.revenue ?? r?.annualRevenue ?? null,
      location: r?.location ?? r?.city ?? r?.region ?? r?.state ?? null,
      score: r?.score ?? r?.fit ?? 0,
      raw: r,
    };
  });

  // Shape that your UI understands
  return send(200, { store: "Leads", items, cursor: null, counters: {} });
};
