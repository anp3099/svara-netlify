// src/lib/leadsApi.ts
// Unified client for Leads. Prefer the Netlify Function (/.netlify/functions/leads)
// and fall back to any existing SPA endpoint that returns { store:'leads', items:[...] }.
// Always NORMALIZES fields so the grid no longer shows "Unknown".

export type NormalizedLead = {
  id: string | null;
  company: string | null;
  name: string | null;
  email: string | null;
  industry: string | null;
  size: string | number | null;
  revenue: string | number | null;
  location: string | null;
  score: number;
  raw: any;
};

type FnShape = { ok?: boolean; rows?: any[]; table?: string | null };
type StoreShape = { store?: string; items?: any[]; cursor?: any; counters?: any };

const first = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const buildName = (r: any) => {
  const direct =
    first(r, ["name", "fullName", "full_name", "contact", "person"]) ?? null;
  if (direct) return String(direct);

  const fn = first(r, ["firstName", "first_name"]);
  const ln = first(r, ["lastName", "last_name"]);
  const joined = [fn, ln].filter(Boolean).join(" ");
  return joined || null;
};

const normalize = (row: any): NormalizedLead => {
  // KV shape is often { key, value: {...} }; unwrap if present
  const r = row?.value && typeof row.value === "object" ? row.value : row;

  const id =
    first(row, ["id", "key", "_id", "uuid"]) ??
    first(r, ["id", "key", "_id", "uuid"]);

  const email =
    first(r, [
      "email",
      "contactEmail",
      "workEmail",
      "businessEmail",
      "work_email",
      "business_email",
    ]) ?? null;

  return {
    id: id ?? null,
    company:
      first(r, [
        "company",
        "companyName",
        "org",
        "organization",
        "business",
        "employer",
      ]) ?? null,
    name: buildName(r),
    email,
    industry: first(r, ["industry", "vertical", "sector"]) ?? null,
    size:
      first(r, ["size", "companySize", "employees", "employeeCount"]) ?? null,
    revenue:
      first(r, ["revenue", "annualRevenue", "arr", "yrRevenue"]) ?? null,
    location:
      first(r, ["location", "city", "region", "state", "country"]) ?? null,
    score: Number(first(r, ["score", "fit", "leadScore"])) || 0,
    raw: row,
  };
};

async function getJSON(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch leads and always return a normalized array the table can render.
 * Order of preference:
 *   1) Netlify Function (explicit path) → /.netlify/functions/leads
 *   2) SPA/KV fallback → /api/leads returning { store:'leads', items:[...] }
 */
export async function getLeadsNormalized(
  limit = 50
): Promise<NormalizedLead[]> {
  const q = `limit=${encodeURIComponent(limit)}`;

  // 1) Netlify Function (explicit path to avoid SPA intercepts)
  const fnData = (await getJSON(
    `/.netlify/functions/leads?${q}`
  )) as FnShape | null;
  if (fnData && Array.isArray(fnData.rows)) {
    return fnData.rows.map(normalize);
  }

  // 2) Fallback to SPA/KV store
  const spaData = (await getJSON(`/api/leads?${q}`)) as StoreShape | null;
  if (spaData && Array.isArray(spaData.items)) {
    return spaData.items.map(normalize);
  }

  return [];
}

// Optional alias some callers might prefer
export const fetchLeads = getLeadsNormalized;
