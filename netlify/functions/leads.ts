// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";
import { getBlink } from "./_blink";

/* ----------------------------- utils ----------------------------- */
const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

/** Try to find a “Leads” store (KV or table) in blink.db */
function findLeadsStore(db: any): any | null {
  if (!db) return null;

  // common, case-insensitive names
  const candidates = [
    "Leads",
    "leads",
    "LeadDatabase",
    "leadDatabase",
    "records",
    "contacts",
    "prospects",
  ];

  for (const k of Object.keys(db)) {
    if (candidates.includes(k) || /lead/i.test(k)) {
      const t = db[k];
      if (t && (typeof t.list === "function" || typeof t.put === "function" || typeof t.upsert === "function")) {
        return t;
      }
    }
  }
  return null;
}

type KvItem = { key: string; value: any };
type RelItem = any;

/** Normalize 1 item (KV or relational) into the UI-friendly shape */
function normalizeOne(x: any) {
  // KV style: { key, value }
  if (x && typeof x === "object" && "key" in x) {
    const v = (x as KvItem).value ?? {};
    return {
      id: (x as KvItem).key ?? v.id ?? null,
      company: v.company ?? v.companyName ?? v.org ?? null,
      name: v.name ?? v.fullName ?? null,
      email: v.email ?? v.contactEmail ?? v.workEmail ?? v.businessEmail ?? null,
      industry: v.industry ?? null,
      raw: x,
    };
  }
  // Relational style: row with columns
  const r = x as RelItem;
  return {
    id: r?.id ?? r?.key ?? r?._id ?? r?.uuid ?? null,
    company: r?.company ?? r?.companyName ?? r?.org ?? null,
    name: r?.name ?? r?.fullName ?? r?.full_name ?? null,
    email: r?.email ?? r?.contactEmail ?? r?.workEmail ?? r?.businessEmail ?? null,
    industry: r?.industry ?? null,
    raw: r,
  };
}

function parseCsv(text: string): Array<Record<string, string>> {
  // minimalist CSV parser: header row + commas, supports quoted fields
  const rows: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\"") {
      if (inQ && text[i + 1] === "\"") { cur += "\""; i++; } else { inQ = !inQ; }
    } else if (c === "\n" && !inQ) {
      rows.push(cur.replace(/\r$/, "")); cur = "";
    } else {
      cur += c;
    }
  }
  if (cur) rows.push(cur.replace(/\r$/, ""));

  if (!rows.length) return [];
  const headers = rows[0].split(",").map(h => h.trim());
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i]) continue;
    const cols: string[] = [];
    // split row by commas respecting quotes (simple again)
    let cell = "", q = false;
    const s = rows[i];
    for (let j = 0; j < s.length; j++) {
      const ch = s[j];
      if (ch === "\"") {
        if (q && s[j + 1] === "\"") { cell += "\""; j++; }
        else { q = !q; }
      } else if (ch === "," && !q) {
        cols.push(cell); cell = "";
      } else {
        cell += ch;
      }
    }
    cols.push(cell);

    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => (rec[h] = (cols[idx] ?? "").trim()));
    out.push(rec);
  }
  return out;
}

function pick<T = any>(obj: any, names: string[]): T | null {
  for (const n of names) {
    if (obj?.[n]) return obj[n] as T;
  }
  return null;
}

/* ------------------------------ handler ------------------------------ */
export const handler: Handler = async (event) => {
  const blink = await getBlink();
  const db = (blink as any)?.db;

  // quick debug
  if (event.httpMethod === "GET" && event.queryStringParameters?.debug) {
    return send(200, {
      ok: true,
      matchedFn: "leads",
      hasDb: Boolean(db),
      keys: db ? Object.keys(db) : [],
    });
  }

  // list a few (works if KV or relational)
  if (event.httpMethod === "GET") {
    const store = findLeadsStore(db);
    if (!store) return send(200, { ok: true, items: [], store: null, reason: "no-store" });

    const limit = Math.min(parseInt(event.queryStringParameters?.limit || "50", 10) || 50, 200);
    const items =
      typeof store.list === "function"
        ? await store.list({ limit }).catch(() => [])
        : [];

    const rows = Array.isArray(items) ? items.map(normalizeOne) : [];
    return send(200, { ok: true, items: rows, store: store?.name ?? "Leads" });
  }

  // imports / batch puts
  if (event.httpMethod === "POST") {
    const store = findLeadsStore(db);
    if (!store) return send(200, { ok: false, reason: "no-store" });

    // KV store should expose .put(key, value)
    const isKv = typeof store.put === "function";

    // 1) CSV?
    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
    let records: Array<{ id: string; value: any }> = [];

    if (/text\/csv/i.test(ct)) {
      const csv = event.body ?? "";
      const rows = parseCsv(csv);

      // try to detect common header names
      for (const r of rows) {
        const id =
          r.id ||
          pick<string>(r, ["key", "email", "contactEmail", "workEmail", "businessEmail"]) ||
          "";

        const value = {
          company: r.company || r.companyName || r.org || null,
          name:
            r.name ||
            r.fullName ||
            [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
            null,
          email: r.email || r.contactEmail || r.workEmail || r.businessEmail || null,
          industry: r.industry || r.vertical || null,
        };

        const key = id || value.email || "";
        if (!key) continue;
        records.push({ id: key, value });
      }
    } else {
      // 2) JSON { records: [{id, value}], id, value }
      try {
        const body = JSON.parse(event.body || "{}");
        if (Array.isArray(body?.records)) {
          records = body.records.filter((x: any) => x?.id && x?.value);
        } else if (body?.id && body?.value) {
          records = [{ id: body.id, value: body.value }];
        }
      } catch {
        // invalid JSON
      }
    }

    if (!records.length) {
      return send(200, { ok: true, inserted: 0, failed: 0, skipped: 0, reason: "no-records" });
    }

    let inserted = 0,
      failed = 0,
      skipped = 0;
    const errors: Array<{ id: string; message: string }> = [];

    // write sequentially (safe for rate limiting)
    for (const rec of records) {
      try {
        if (isKv) {
          await store.put(rec.id, rec.value);
          inserted++;
        } else if (typeof store.upsert === "function") {
          await store.upsert({ where: { id: rec.id }, update: rec.value, create: { id: rec.id, ...rec.value } });
          inserted++;
        } else if (typeof store.create === "function") {
          await store.create({ id: rec.id, ...rec.value });
          inserted++;
        } else {
          failed++;
          errors.push({ id: rec.id, message: "Store is neither KV (.put) nor relational (create/upsert) capable." });
        }
      } catch (e: any) {
        if (isDup(e)) skipped++;
        else {
          failed++;
          errors.push({ id: rec.id, message: String(e?.message ?? e) });
        }
      }
    }

    return send(200, {
      ok: true,
      store: "Leads",
      inserted,
      skipped,
      failed,
      sampleErrors: errors.slice(0, 5),
    });
  }

  return send(405, { error: "Method not allowed" });
};
