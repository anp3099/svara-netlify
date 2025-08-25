// netlify/functions/leads-import.ts
import type { Handler } from "@netlify/functions";
import { getBlink } from "./_blink";

/* Load .env locally; harmless on Netlify where env vars are injected */
try {
  (eval as any)("require")("dotenv").config();
} catch {}

/* ------------------------------- CSV utils ------------------------------- */
/** Simple CSV parser: handles quotes, commas, and newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let i = 0;
  const n = text.length;
  let inQuotes = false;

  const pushCell = () => {
    row.push(cur);
    cur = "";
  };
  const pushRow = () => {
    // ignore trailing empty line
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          cur += '"'; // escaped quote
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        cur += ch;
        i++;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushCell();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue; // normalize CRLF
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  // last cell/row
  pushCell();
  pushRow();
  return rows;
}

/** Turn CSV into objects using header row. */
function csvToObjects(csv: string): Record<string, string>[] {
  const rows = parseCSV(csv);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => (h || "").trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const o: Record<string, string> = {};
    const cells = rows[r];
    headers.forEach((h, c) => (o[h] = (cells[c] ?? "").trim()));
    out.push(o);
  }
  return out;
}

/* ------------------------ DB discovery / normalization ------------------- */
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
    if (t && (typeof t.upsert === "function" || typeof t.create === "function")) return k;
  }
  return (
    keys.find(
      (k) =>
        /lead|contact|prospect|people|person|record/i.test(k) &&
        (typeof db?.[k]?.upsert === "function" || typeof db?.[k]?.create === "function"),
    ) ?? null
  );
}

/** make a safe id: prefer email; else compact "company:name"; else a random id */
function makeId(row: Record<string, string>): string {
  const email =
    row.email || row.Email || row.contactEmail || row["Contact Email"] || row["contact email"];
  if (email) return email.toLowerCase();

  const company =
    row.company ||
    row.Company ||
    row.companyName ||
    row["Company Name"] ||
    row.org ||
    row.business ||
    "";
  const name =
    row.name ||
    row.Name ||
    row.contact ||
    row.Contact ||
    [row.firstName || row["First Name"] || "", row.lastName || row["Last Name"] || ""]
      .filter(Boolean)
      .join(" ");

  const base = [company, name].filter(Boolean).join(":").toLowerCase();
  if (base) {
    return base
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9:@._-]+/g, "")
      .slice(0, 120);
  }
  return `lead_${Math.random().toString(36).slice(2, 10)}`;
}

/** map your CSV columns to a normalized lead object */
function normalize(row: Record<string, string>) {
  const id = makeId(row);
  const company =
    row.company ||
    row.Company ||
    row.companyName ||
    row["Company Name"] ||
    row.org ||
    row.business ||
    null;

  // Prefer one combined name when present, else stitch first/last
  const nameRaw =
    row.name || row.Name || row.contact || row.Contact || row.person || row["Full Name"] || "";
  const first = row.firstName || row["First Name"] || "";
  const last = row.lastName || row["Last Name"] || "";
  const name = nameRaw || [first, last].filter(Boolean).join(" ") || null;

  const email =
    row.email ||
    row.Email ||
    row.contactEmail ||
    row["Contact Email"] ||
    row.workEmail ||
    row.businessEmail ||
    row.work_email ||
    row.business_email ||
    null;

  const industry = row.industry || row.Industry || row.vertical || null;
  const size = row.size || row["Company Size"] || row.employees || row.employeeCount || null;
  const revenue = row.revenue || row["Annual Revenue"] || null;
  const location =
    row.location ||
    row.city ||
    row.City ||
    row.region ||
    row.Region ||
    row.state ||
    row.State ||
    row.country ||
    row.Country ||
    null;

  // Number-ish score
  const scoreStr = row.score || row.Score || "";
  const score = Number.isFinite(+scoreStr) ? +scoreStr : 0;

  return { id, company, name, email, industry, size, revenue, location, score };
}

/* -------------------------------- handler -------------------------------- */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const blink = await getBlink();
    const db: any = (blink as any)?.db;
    if (!db) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, reason: "db-unavailable" }),
      };
    }

    const leadsKey = findLeadsTableKey(db);
    if (!leadsKey) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, reason: "no-leads-table" }),
      };
    }
    const leadsTbl: any = db[leadsKey];

    // Decode CSV body (Netlify may base64-encode)
    const csv = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : (event.body || "");

    const rows = csvToObjects(csv);
    const dry = String(event.queryStringParameters?.dry ?? "").toLowerCase() === "1";

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const r of rows) {
      const doc = normalize(r);

      if (dry) {
        // just count what would be done
        if (doc.id) inserted++;
        continue;
      }

      try {
        if (typeof leadsTbl.upsert === "function") {
          await leadsTbl.upsert({
            where: { id: doc.id },
            update: {
              company: doc.company,
              name: doc.name,
              email: doc.email,
              industry: doc.industry,
              size: doc.size,
              revenue: doc.revenue,
              location: doc.location,
              score: doc.score,
            },
            create: doc,
          });
          // we don't know if it was insert or update; do a lightweight guess:
          // If you want precise counts, you could query first; keeping simple here.
          inserted++;
        } else if (typeof leadsTbl.create === "function") {
          await leadsTbl.create(doc);
          inserted++;
        } else {
          skipped++;
        }
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? "unknown");
        // Treat duplicates as "updated/skipped", not hard errors
        if (/duplicate|unique|already exists|conflict/i.test(msg)) {
          updated++;
        } else {
          skipped++;
          errors.push({ id: doc.id, error: msg });
        }
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        table: leadsKey,
        total: rows.length,
        inserted,
        updated,
        skipped,
        errors,
      }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        errorType: e?.name || "Error",
        errorMessage: e?.message || String(e),
        trace: (e?.stack || "").split("\n").slice(0, 6),
      }),
    };
  }
};
