// netlify/functions/leads-import.ts
import type { Handler } from "@netlify/functions";
import { getBlink } from "./_blink";

const JSON_HEADERS = { "Content-Type": "application/json" };
const send = (code: number, body: unknown) => ({
  statusCode: code,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

type RawRow = Record<string, any>;
type NormLead = {
  id: string | null;
  company?: string | null;
  name?: string | null;
  email?: string | null;
  industry?: string | null;
  size?: string | number | null;
  revenue?: string | number | null;
  location?: string | null;
  score?: number | null;
  raw?: any;
};

function chunk<T>(arr: T[], size = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** tiny id helper */
function rid(prefix = "lead_") {
  return prefix + Math.random().toString(36).slice(2, 10);
}

/** CSV parser that handles commas-in-quotes and double quotes */
function parseCsv(text: string): RawRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (!lines.length) return [];

  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; } else { q = !q; }
      } else if (ch === "," && !q) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const header = split(lines[0]).map(h => h.toLowerCase());
  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = split(lines[i]);
    if (cols.length === 1 && cols[0] === "") continue;
    const obj: RawRow = {};
    header.forEach((h, idx) => (obj[h] = cols[idx] ?? null));
    rows.push(obj);
  }
  return rows;
}

/** Find the leads table key on Blink DB (same style as your other functions) */
function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = [
    "leads","lead","contacts","prospects","people","persons","records",
    "realLeadDatabase","leadDatabase","realLeads",
  ];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && (typeof t.list === "function" || typeof t.update === "function" || typeof t.upsert === "function"))
      return k;
  }
  return (
    keys.find(k => {
      if (/campaign/i.test(k)) return false;
      if (!/lead|contact|prospect|people|person|record/i.test(k)) return false;
      const t = db?.[k];
      return typeof t?.list === "function" || typeof t?.update === "function" || typeof t?.upsert === "function";
    }) ?? null
  );
}

function normOne(r: RawRow): NormLead {
  // accept many header synonyms
  const get = (...names: string[]) => {
    for (const n of names) {
      const v = r[n] ?? r[n.toLowerCase()];
      if (v !== undefined) return v;
    }
    return null;
  };

  const email = (get("email","contactEmail","workEmail","businessEmail") || null)?.toString() || null;
  const id =
    (get("id") as string) ||
    (email as string) ||
    null;

  const name =
    (get("name","fullName","full_name","contact","contactName") as string) ||
    (([get("firstName","firstname"), get("lastName","lastname")].filter(Boolean) as string[]).join(" ") || null);

  return {
    id,
    company: (get("company","companyName","org","business") as string) || null,
    name: name || null,
    email,
    industry: (get("industry","vertical") as string) || null,
    size: (get("size","companySize","employees") as any) ?? null,
    revenue: (get("revenue","annualRevenue") as any) ?? null,
    location: (get("location","city","region","state","country") as string) || null,
    score: Number(get("score","fit") as any) || null,
    raw: r,
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "GET") {
    // quick diagnostics / docs
    return send(200, { ok: true, usage: "POST CSV (text/csv) or JSON { rows:[...] } to /api/leads-import" });
  }
  if (event.httpMethod !== "POST") return send(405, { error: "Method not allowed" });

  const blink = await getBlink();
  const db: any = blink?.db;
  if (!db) return send(200, { ok: false, reason: "db-unavailable" });

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: false, reason: "no-leads-table" });

  const ctype = String(event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  let rows: RawRow[] = [];

  try {
    if (ctype.includes("application/json")) {
      const body = JSON.parse(event.body || "{}");
      rows = Array.isArray(body?.rows) ? body.rows : [];
    } else {
      // treat everything else as CSV (text/csv, text/plain)
      const text = event.body || "";
      rows = parseCsv(text);
    }
  } catch (e: any) {
    return send(400, { ok: false, reason: "parse-failed", message: String(e?.message || e) });
  }

  // normalize
  const normalized = rows.map(normOne).map(r => ({ ...r, id: r.id || rid() }));

  const tbl: any = db[leadsKey];
  let inserted = 0, skipped = 0, failed = 0;
  const errors: { id: string; message: string }[] = [];

  // Process in small batches to avoid timeouts
  for (const group of chunk(normalized, 25)) {
    const results = await Promise.allSettled(
      group.map(async (rec) => {
        const patch: any = {
          company: rec.company ?? undefined,
          name: rec.name ?? undefined,
          email: rec.email ?? undefined,
          industry: rec.industry ?? undefined,
          size: rec.size ?? undefined,
          revenue: rec.revenue ?? undefined,
          location: rec.location ?? undefined,
          score: rec.score ?? undefined,
        };

        // prefer upsert; fallback to create/patch patterns
        if (typeof tbl.upsert === "function") {
          await tbl.upsert({ where: { id: rec.id }, update: patch, create: { id: rec.id, ...patch } });
        } else if (typeof tbl.update === "function") {
          try {
            await tbl.update(rec.id, patch);
          } catch {
            if (typeof tbl.create === "function") await tbl.create({ id: rec.id, ...patch });
            else throw new Error("No upsert/update/create available");
          }
        } else if (typeof tbl.create === "function") {
          await tbl.create({ id: rec.id, ...patch });
        } else {
          throw new Error("No write method on leads table");
        }
      })
    );

    for (const [i, res] of results.entries()) {
      const id = group[i].id || "(unknown)";
      if (res.status === "fulfilled") inserted++;
      else {
        failed++;
        errors.push({ id, message: String((res as any).reason?.message || res) });
      }
    }
  }

  return send(200, { ok: true, table: leadsKey, inserted, failed, skipped, total: normalized.length, errors });
};
