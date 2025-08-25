// netlify/functions/leads-import.ts
import type { Handler } from "@netlify/functions";
import { getBlink } from "./_blink";

// ---------- small helpers ----------
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

const toArray = <T>(x: T | T[] | null | undefined): T[] =>
  Array.isArray(x) ? x : x ? [x] : [];

// Parse minimal CSV (quoted fields supported)
function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;

  const pushCell = () => { row.push(cur); cur = ""; };
  const pushRow  = () => { rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQ = false; continue; }
      cur += ch;
      continue;
    }
    if (ch === '"') { inQ = true; continue; }
    if (ch === ",") { pushCell(); continue; }
    if (ch === "\n") { pushCell(); pushRow(); continue; }
    if (ch === "\r") continue;
    cur += ch;
  }
  // flush
  pushCell(); if (row.length) pushRow();

  if (!rows.length) return [];
  const header = rows[0].map(h => (h || "").trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => !c || !String(c).trim())) continue;
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = (r[j] ?? "").trim();
    out.push(obj);
  }
  return out;
}

// Normalize one CSV row to a common shape
function normalizeRow(r: Record<string, string>) {
  // possible column names we’ll accept
  const pick = (row: any, names: string[], fallback: any = null) => {
    for (const n of names) if (row?.[n]) return row[n];
    return fallback;
  };

  const email   = pick(r, ["email", "contactEmail", "workEmail", "businessEmail"]);
  const id      = pick(r, ["id", "key", "leadId"]) || (email ? `cb:${email}` : null);
  const company = pick(r, ["company", "companyName", "org", "business"]);
  const name    =
    pick(r, ["name", "fullName", "full_name", "contactName", "person"]) ||
    ((r["firstName"] || r["lastName"])
      ? [r["firstName"], r["lastName"]].filter(Boolean).join(" ")
      : null);
  const industry = pick(r, ["industry", "vertical"]);
  const size     = pick(r, ["size", "companySize", "employees"]);
  const revenue  = pick(r, ["revenue", "annualRevenue"]);
  const location = pick(r, ["location", "city", "region", "state"]);
  const score    = pick(r, ["score", "fit"], 0);

  // value object (for KV) or columns (for relational)
  const value = {
    company, name, email, industry, size, revenue, location, score,
    // original row in case you want it later
    _raw: r,
  };

  return { id, key: id, value };
}

// Try a variety of write methods depending on store capabilities
async function writeKV(t: any, key: string, value: any): Promise<"ok" | "dup" | "fail"> {
  const candidates: Array<() => Promise<any>> = toArray([
    t?.put && (() => t.put(key, value)),
    t?.set && (() => t.set(key, value)),
    t?.upsert && (() => t.upsert({ key, value })),
    t?.create && (() => t.create({ key, value })),
    t?.insert && (() => t.insert({ key, value })),
    // generic 2-arg signatures:
    t?.upsert && (() => t.upsert(key, value)),
    t?.create && (() => t.create(key, value)),
  ]).filter(Boolean);

  for (const fn of candidates) {
    try { await fn!(); return "ok"; } catch (e) { if (isDup(e)) return "dup"; }
  }
  return "fail";
}

async function writeRelational(t: any, id: string, value: any): Promise<"ok"|"dup"|"fail"> {
  const row = { id, ...value };
  try {
    if (typeof t?.upsert === "function") {
      await t.upsert({ where: { id }, update: value, create: row });
      return "ok";
    }
  } catch (e) { if (isDup(e)) return "dup"; }
  try {
    if (typeof t?.create === "function") {
      await t.create(row);
      return "ok";
    }
  } catch (e) { if (isDup(e)) return "dup"; }
  return "fail";
}

function findLeadsKey(db: any): string | null {
  const names = Object.keys(db || {});
  const preferred = [
    "Leads","leads","lead","contacts","prospects","people","records",
    "leadDatabase","realLeads","realLeadDatabase"
  ];
  for (const k of preferred) if (db?.[k]) return k;
  return names.find(k => /lead|contact|prospect|people|record/i.test(k)) ?? null;
}

// Limit concurrency
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length) as any;
  let idx = 0, active = 0;
  return await new Promise<R[]>((resolve) => {
    const pump = () => {
      while (active < limit && idx < items.length) {
        const i = idx++;
        active++;
        fn(items[i], i)
          .then(v => out[i] = v)
          .finally(() => { active--; (idx >= items.length && active === 0) ? resolve(out) : pump(); });
      }
    };
    pump();
  });
}

// --------------------------------- handler ---------------------------------
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "OPTIONS") {
    return send(405, { error: "Method not allowed" });
  }
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...JSON_HEADERS,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  const blink = await getBlink();
  const db: any = (blink as any)?.db;
  if (!db) return send(200, { ok: false, reason: "db-unavailable" });

  const leadsKey = findLeadsKey(db);
  if (!leadsKey) return send(200, { ok: false, reason: "no-leads-table" });
  const t = db[leadsKey];

  // detect KV vs relational by sampling list()
  let isKV = false;
  try {
    const sample = await (t?.list?.({ limit: 1 }) ?? null);
    const arr   = sample?.items || sample?.rows || sample;
    const first = Array.isArray(arr) ? arr[0] : null;
    isKV = !!(first && ("key" in first || "value" in first));
  } catch {}

  // accept JSON array OR CSV text
  const ctype = String(event.headers["content-type"] || event.headers["Content-Type"] || "");
  let records: Array<Record<string, string>> = [];
  try {
    if (/application\/json/i.test(ctype)) {
      const parsed = JSON.parse(event.body || "[]");
      records = Array.isArray(parsed) ? parsed : [];
    } else {
      const text = event.body || "";
      records = parseCsv(text);
    }
  } catch (e) {
    return send(400, { ok: false, error: "parse-failed", message: String(e) });
  }

  if (!records.length) return send(200, { ok: true, inserted: 0, skipped: 0, failed: 0, table: leadsKey });

  const toUpsert = records.map(normalizeRow).filter(x => x.id || x.key);
  let inserted = 0, skipped = 0, failed = 0;
  const firstErrors: string[] = [];

  await mapLimit(toUpsert, 6, async (r) => {
    const id = r.id!;
    try {
      const res = isKV
        ? await writeKV(t, r.key!, r.value)
        : await writeRelational(t, id, r.value);
      if (res === "ok") inserted++;
      else if (res === "dup") skipped++;
      else { failed++; }
    } catch (e: any) {
      if (isDup(e)) skipped++;
      else { failed++; firstErrors.length < 3 && firstErrors.push(String(e?.message ?? e)); }
    }
  });

  return send(200, {
    ok: true,
    table: leadsKey,
    isKV,
    inserted, skipped, failed,
    firstErrors,
  });
};
