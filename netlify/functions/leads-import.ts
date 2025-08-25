// netlify/functions/leads-import.ts
import type { Handler } from "@netlify/functions";
import { getBlink } from "./_blink";

/* ---------- tiny CSV parser (enough for your file) ---------- */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && inQ && n === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (!inQ && (c === "\n" || c === "\r")) {
      if (cur !== "") { rows.push(cur); cur = ""; }
      continue;
    }
    cur += c;
  }
  if (cur !== "") rows.push(cur);
  if (!rows.length) return [];
  const hdr = rows[0].split(",").map(s => s.trim());
  return rows.slice(1).filter(Boolean).map(line => {
    const cols: string[] = [];
    let buf = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i], n = line[i + 1];
      if (c === '"' && q && n === '"') { buf += '"'; i++; continue; }
      if (c === '"') { q = !q; continue; }
      if (!q && c === ",") { cols.push(buf); buf = ""; continue; }
      buf += c;
    }
    cols.push(buf);
    const out: Record<string, string> = {};
    hdr.forEach((h, i) => (out[h] = (cols[i] ?? "").trim()));
    return out;
  });
}

/* --------------------- DB discovery helpers --------------------- */
function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = [
    "leads", "lead", "contacts", "prospects", "people", "persons",
    "records", "leadDatabase", "realLeads", "realLeadDatabase"
  ];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && (typeof t.upsert === "function" || typeof t.create === "function")) return k;
  }
  return keys.find(k =>
    /lead|contact|prospect|people|person|record/i.test(k) &&
    (typeof db?.[k]?.upsert === "function" || typeof db?.[k]?.create === "function")
  ) ?? null;
}

const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

/* ----------------------------- mapping ----------------------------- */
/** Convert one CSV/JSON row from top-50-list.csv into a normalized lead */
function mapRow(r: Record<string, any>) {
  const first = r.person_first_name ?? r.first_name ?? "";
  const last  = r.person_last_name  ?? r.last_name  ?? "";
  const name  = [first, last].filter(Boolean).join(" ") || r.person_name || null;

  // Prefer business email, else personal
  const email = r.person_business_email || r.person_primary_email || r.person_personal_email || null;

  // Reasonable unique id (email > person_linkedin_id > fallback)
  const id = (email || r.person_linkedin_id || r.company_linkedin_id ||
              (r.company_name && name && `${r.company_name}:${name}`) ||
              crypto.randomUUID());

  return {
    id,
    // company / contact
    companyName: r.company_name || r.person_company_name || null,
    contactName: name,
    contactTitle: r.person_job_title || r.person_headline || null,
    contactEmail: email,
    contactPhone: r.person_phone || null,

    // firmographics
    industry: r.company_industry || null,
    companySize: r.company_size || null,
    revenueRange: r.company_revenue || null,

    // geo + links
    location: r.person_location || r.person_city || r.company_country || null,
    linkedinUrl: r.person_linkedin_url || r.company_linkedin_url || null,
  };
}

/* ------------------------------ handler ------------------------------ */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return send(405, { error: "Method not allowed" });

  const blink = await getBlink();
  const db: any = blink?.db;
  if (!db) return send(200, { ok: false, reason: "db-unavailable" });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: false, reason: "no-leads-table" });

  // Accept JSON { rows: [...] } or raw CSV text
  const ctype = event.headers["content-type"] || event.headers["Content-Type"] || "";
  let rows: Record<string, any>[] = [];
  try {
    if (/json/i.test(ctype)) {
      const b = JSON.parse(event.body || "{}");
      rows = Array.isArray(b?.rows) ? b.rows : [];
    } else {
      const text = event.body || "";
      rows = parseCsv(text);
    }
  } catch {
    return send(400, { ok: false, reason: "bad-body" });
  }

  if (!rows.length) return send(200, { ok: true, inserted: 0, skipped: 0, reason: "no-rows" });

  const leadsTbl: any = db[leadsKey];
  let inserted = 0, skipped = 0;

  for (const raw of rows) {
    const lead = mapRow(raw);

    try {
      if (typeof leadsTbl.upsert === "function") {
        await leadsTbl.upsert({
          where: { id: lead.id },
          update: { ...lead },
          create: { ...lead },
        });
      } else if (typeof leadsTbl.create === "function") {
        await leadsTbl.create(lead);
      } else {
        throw new Error("No upsert/create on leads table");
      }
      inserted++;
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      if (/duplicate|unique|already exists|conflict/i.test(msg)) skipped++;
      else throw e;
    }
  }

  return send(200, { ok: true, table: leadsKey, inserted, skipped });
};
