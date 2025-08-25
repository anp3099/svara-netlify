// netlify/functions/leads.ts
import type { Handler } from "@netlify/functions";
import { getBlink, blinkDebug } from "./_blink";

const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

/* --------------------------- normalization --------------------------- */

type AnyRow = Record<string, any>;
const pick = (...vals: any[]) => vals.find(v => v !== undefined && v !== null) ?? null;

function normalizeFromDb(r: AnyRow) {
  return {
    id:        pick(r?.id, r?.key, r?._id, r?.uuid, r?.email),
    company:   pick(r?.company, r?.companyName, r?.org, r?.business),
    name:      pick(r?.name, r?.fullName, r?.full_name, r?.contact, r?.person),
    email:     pick(r?.email, r?.contactEmail, r?.workEmail, r?.businessEmail, r?.work_email, r?.business_email),
    industry:  pick(r?.industry, r?.vertical),
    size:      pick(r?.size, r?.companySize, r?.employees),
    revenue:   pick(r?.revenue, r?.annualRevenue),
    location:  pick(r?.location, r?.city, r?.region, r?.state),
    score:     pick(r?.score, r?.fit, 0),
    raw:       r,
  };
}

function normalizeFromKv(item: { key: string; value: AnyRow }) {
  const v = item?.value ?? {};
  return {
    id:        pick(v?.id, item?.key, v?.email),
    company:   pick(v?.company, v?.companyName, v?.org, v?.business),
    name:      pick(v?.name, v?.fullName, v?.full_name, v?.contact, v?.person),
    email:     pick(v?.email, v?.contactEmail, v?.workEmail, v?.businessEmail),
    industry:  pick(v?.industry, v?.vertical),
    size:      pick(v?.size, v?.companySize, v?.employees),
    revenue:   pick(v?.revenue, v?.annualRevenue),
    location:  pick(v?.location, v?.city, v?.region, v?.state),
    score:     pick(v?.score, v?.fit, 0),
    raw:       item,
  };
}

/* ----------------------------- helpers ------------------------------ */

function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = ["leads","lead","contacts","prospects","people","persons","records","leadDatabase","realLeads","realLeadDatabase"];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && typeof t.list === "function") return k;
  }
  return keys.find(k => /lead|contact|prospect|people|person|record/i.test(k) && typeof db?.[k]?.list === "function") ?? null;
}

async function kvHandle(blink: any) {
  // try several shapes of KV
  const b = blink ?? {};
  const kv =
    b.kv?.store?.("Leads") ??
    b.kv?.stores?.Leads ??
    (typeof b.kv === "function" ? b.kv("Leads") : null) ??
    b.kv?.Leads ??
    null;
  return kv;
}

/* -------------------------------- API -------------------------------- */

export const handler: Handler = async (event) => {
  // quick diagnostics
  if (event.httpMethod === "GET" && event.queryStringParameters?.debug) {
    const diag = await blinkDebug();
    return send(200, { ok: true, matchedFn: "leads", ...diag });
  }

  // load blink (DB / KV provider)
  const blink = await getBlink();

  /* -------- GET: list leads (normalized, for your UI) -------- */
  if (event.httpMethod === "GET") {
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || "50", 10) || 50, 500);

    // 1) DB path
    const db: any = (blink as any)?.db;
    const key = db ? findLeadsTableKey(db) : null;
    if (db && key) {
      const list = (await db[key].list?.({ limit })) ?? [];
      const rows = list.map(normalizeFromDb);
      return send(200, { ok: true, rows, source: "db", table: key });
    }

    // 2) KV path (what you currently have)
    const kv = await kvHandle(blink);
    if (kv?.list) {
      // many KV libs support `{ limit }`; safe default if not
      const out = await kv.list({ limit }).catch(() => null);
      const items: Array<{ key: string; value: AnyRow }> =
        out?.items ?? out?.rows ?? out ?? [];
      const rows = items.map(normalizeFromKv);
      return send(200, { ok: true, rows, source: "kv", store: "Leads", count: rows.length });
    }

    // 3) nothing found
    return send(200, { ok: true, rows: [], source: "none" });
  }

  /* -------- POST: upsert rows into KV (safe even w/out DB) -------- */
  if (event.httpMethod === "POST") {
    // Accept either JSON body { rows: [...] } or CSV text/csv (optional)
    const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
    let rowsIn: AnyRow[] = [];

    if (/json/i.test(contentType)) {
      try {
        const body = JSON.parse(event.body || "{}");
        rowsIn = Array.isArray(body?.rows) ? body.rows : [];
      } catch {
        rowsIn = [];
      }
    } else if (/text\/csv/i.test(contentType)) {
      // tiny CSV parser for: email,company,name,industry,location,size,revenue
      const text = event.body || "";
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines.shift()?.split(",").map(s => s.trim()) ?? [];
      rowsIn = lines.map(line => {
        const cells = line.split(",").map(s => s.trim());
        const obj: AnyRow = {};
        header.forEach((h, i) => (obj[h] = cells[i]));
        return obj;
      });
    }

    if (!rowsIn.length) return send(400, { ok: false, error: "no-rows" });

    const kv = await kvHandle(blink);
    if (!kv?.put && !kv?.set && !kv?.upsert) {
      return send(501, { ok: false, error: "kv-unavailable" });
    }

    let inserted = 0, skipped = 0, failed = 0;

    // simple key rule: prefer email, otherwise id, otherwise random
    for (const r of rowsIn) {
      const v = r || {};
      const key: string =
        (v.email || v.contactEmail || v.workEmail || v.businessEmail || v.id || v.key || "")
          .toString()
          .toLowerCase()
          .trim() || `lead_${Math.random().toString(36).slice(2,9)}`;

      // minimal stored value
      const value = {
        id: key,
        email: v.email ?? v.contactEmail ?? null,
        company: v.company ?? v.companyName ?? v.org ?? null,
        name: v.name ?? v.fullName ?? null,
        industry: v.industry ?? null,
        size: v.size ?? v.employees ?? null,
        revenue: v.revenue ?? null,
        location: v.location ?? v.city ?? v.state ?? v.region ?? null,
        ...(v.raw ? { raw: v.raw } : {}),
      };

      try {
        if (typeof kv.upsert === "function") {
          await kv.upsert(key, value);
        } else if (typeof kv.put === "function") {
          await kv.put(key, value);
        } else if (typeof kv.set === "function") {
          await kv.set(key, value);
        } else {
          throw new Error("no kv write method");
        }
        inserted++;
      } catch (e: any) {
        // treat duplicate-ish messages as skipped
        const msg = String(e?.message ?? e ?? "");
        if (/duplicate|exists|conflict|unique/i.test(msg)) skipped++;
        else failed++;
      }
    }

    return send(200, { ok: true, inserted, skipped, failed, store: "Leads" });
  }

  return send(405, { ok: false, error: "method-not-allowed" });
};
