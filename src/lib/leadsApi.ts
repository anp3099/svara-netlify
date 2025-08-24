// src/lib/leadsApi.ts
// Unified client for Leads. It first tries your Netlify function (/api/leads)
// and falls back to any existing SPA endpoint that returns { store:'leads', items:[...] }.
// It also NORMALIZES fields so the grid no longer shows "Unknown".

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

type NetlifyFnShape = { ok?: boolean; rows?: any[]; table?: string | null };
type StoreShape = { store?: string; items?: any[]; cursor?: any; counters?: any };

const pick = (obj: any, keys: string[]) => {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return null;
};

const normalize = (r: any): NormalizedLead => ({
  id: pick(r, ["id", "key", "_id", "uuid"]),
  company: pick(r, ["company", "companyName", "org", "business", "organization", "employer"]),
  name: pick(r, ["name", "fullName", "full_name", "contact", "person"]),
  email: pick(r, ["email", "workEmail", "businessEmail", "work_email", "business_email"]),
  industry: pick(r, ["industry", "vertical", "sector"]),
  size: pick(r, ["size", "companySize", "employees", "employeeCount"]),
  revenue: pick(r, ["revenue", "annualRevenue", "arr", "yrRevenue"]),
  location: pick(r, ["location", "city", "region", "state", "country"]),
  score: Number(pick(r, ["score", "fit", "leadScore"])) || 0,
  raw: r,
});

async function getJSON(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    // In dev 404s return HTML; guard JSON parsing.
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch leads and always return a normalized array the table can render.
 * Tries serverless first (redirected to /.netlify/functions/leads by netlify.toml),
 * then falls back to any existing SPA data source that returns { store:'leads', items:[...] }.
 */
export async function getLeadsNormalized(limit = 50): Promise<NormalizedLead[]> {
  // 1) Netlify function path (your redirects map /api/* -> functions)
  const fnData = (await getJSON(`/api/leads?limit=${encodeURIComponent(limit)}`)) as NetlifyFnShape | null;
  if (fnData && Array.isArray(fnData.rows)) {
    return fnData.rows.map(normalize);
  }

  // 2) Fallback: any SPA "store" response you already return in app (e.g. {store:'leads', items:[...]})
  const spaData = (await getJSON(`/api/leads?limit=${encodeURIComponent(limit)}`)) as StoreShape | null;
  if (spaData && Array.isArray(spaData.items)) {
    return spaData.items.map(normalize);
  }

  // 3) Nothing usable
  return [];
}
