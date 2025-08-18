// netlify/functions/cb-webhook.ts

// Expose it at: https://<your-domain>/api/cb-webhook
export const config = { path: "/api/cb-webhook" };

/* ----------------------- Types ----------------------- */
type CBLead = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  domain?: string;
  email?: string;
  linkedin?: string;
  location?: string;
  [k: string]: any;
};

/* --------------------- Utilities --------------------- */
const json = (d: any, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { "content-type": "application/json" },
  });

const bad = (m: string, s = 400) => json({ error: m }, s);

// Read env from either Deno or Node
const envGet = (k: string): string | undefined => {
  // Deno first (Edge / Netlify web functions)
  try {
    // @ts-ignore
    if (typeof Deno !== "undefined" && Deno?.env?.get) return Deno.env.get(k);
  } catch {}
  // Node fallback
  try {
    // @ts-ignore
    if (typeof process !== "undefined") return process?.env?.[k];
  } catch {}
  return undefined;
};

// Netlify Blobs store
async function getStore(name: string) {
  const mod = await import("@netlify/blobs");
  return mod.getStore({ name });
}

function todayKeys() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return { day: `${yyyy}-${mm}-${dd}`, month: `${yyyy}-${mm}` };
}

function normEmail(e?: string | null) {
  return e ? e.trim().toLowerCase() : undefined;
}

/* ------------ Map CB payload → internal shape ---------- */
function mapCBToInternal(raw: any): CBLead {
  const first =
    raw.first_name ||
    raw.person_first_name ||
    raw.firstname ||
    undefined;

  const last =
    raw.last_name ||
    raw.person_last_name ||
    raw.lastname ||
    undefined;

  const email =
    raw.email ||
    raw.person_business_email ||
    raw.person_personal_email ||
    raw.business_email ||
    raw.personal_email ||
    undefined;

  const domain =
    raw.domain ||
    raw.company_domain ||
    raw.domain_name ||
    raw.website ||
    undefined;

  const title =
    raw.title ||
    raw.person_job_title ||
    raw.job_title ||
    undefined;

  const company =
    raw.company ||
    raw.company_name ||
    undefined;

  const linkedin =
    raw.linkedin ||
    raw.person_linkedin ||
    raw.linkedin_profile ||
    undefined;

  const location =
    raw.location ||
    raw.person_location ||
    raw.city ||
    raw.state ||
    raw.country ||
    undefined;

  const full_name =
    raw.full_name ||
    [first, last].filter(Boolean).join(" ") ||
    undefined;

  return {
    full_name,
    first_name: first,
    last_name: last,
    title,
    company,
    domain,
    email,
    linkedin,
    location,
  };
}

/* --------------- Hunter helpers (optional) -------------- */
async function hunterVerify(email: string, apiKey: string) {
  const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(
    email
  )}&api_key=${apiKey}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data ?? null;
}

async function hunterFind(full: string, domain: string, apiKey: string) {
  const url = `https://api.hunter.io/v2/email-finder?full_name=${encodeURIComponent(
    full
  )}&domain=${encodeURIComponent(domain)}&api_key=${apiKey}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data?.email ?? null;
}

/* ------------------ Light lead scoring ------------------ */
function scoreLead(l: any) {
  const title = (l.title || "").toLowerCase();
  let s = 0;
  if (/(founder|owner|ceo|coo)/.test(title)) s += 40;
  if (/(vp|head|director)/.test(title)) s += 30;
  if (/(sales|growth|marketing)/.test(title)) s += 20;
  const v = Number(l.verification?.score ?? 0);
  if (v >= 90) s += 20;
  return Math.min(100, s);
}

/* ----------------------- Counters ----------------------- */
async function getCounters() {
  const store = await getStore("leads-counters");
  const raw = await store.get("counters");
  return raw ? JSON.parse(raw) : null;
}

async function setCounters(data: any) {
  const store = await getStore("leads-counters");
  await store.set("counters", JSON.stringify(data));
}

/* ----------------------- Handler ------------------------ */
export default async (req: Request) => {
  if (req.method !== "POST") return bad("POST only", 405);

  // Secret (header OR ?secret=)
  const headerSecret = req.headers.get("x-webhook-secret") || "";
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret") || "";
  const secret = envGet("LEADS_WEBHOOK_SECRET") || "";
  if (secret && headerSecret !== secret && querySecret !== secret) {
    return bad("Unauthorized", 401);
  }

  // Optional source labelling for reporting
  const cbSource = url.searchParams.get("source") || "conversion_blitz";

  // Parse JSON body (array, {leads:[]}, {data:[]}, or single object)
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON");
  }

  const leads: any[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.leads)
    ? body.leads
    : Array.isArray(body?.data)
    ? body.data
    : [body];

  // Caps & config
  const DAILY_CAP = Number(envGet("DAILY_CAP") || 70);
  const MONTHLY_CAP = Number(envGet("MONTHLY_CAP") || 2000);
  const HUNTER = envGet("HUNTER_API_KEY");
  const MIN_SCORE = Number(envGet("HUNTER_MIN_SCORE") || 80);

  // counters
  const counters = (await getCounters()) || {};
  const { day, month } = todayKeys();
  if (counters.date !== day) {
    counters.dayCount = 0;
    counters.date = day;
  }
  if (counters.month !== month) {
    counters.monthCount = 0;
    counters.month = month;
  }

  // stores
  const leadsStore = await getStore("leads");         // accepted leads
  const queueStore = await getStore("leads-queue");   // queued for later
  const dedupeStore = await getStore("leads-dedupe"); // seen keys

  let accepted = 0,
    queued = 0,
    duplicates = 0,
    rejected = 0;

  for (const raw of leads) {
    // Map CB payload → internal shape
    const l = mapCBToInternal(raw);

    const full = l.full_name || `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim();
    const domain = l.domain?.trim();
    let email = normEmail(l.email);

    // dedupe key: prefer email; else "domain::full_name"
    const dedupeKey = email || (domain && full ? `${domain}::${full.toLowerCase()}` : undefined);
    if (!dedupeKey) {
      rejected++;
      continue;
    }
    if (await dedupeStore.get(dedupeKey)) {
      duplicates++;
      continue;
    }

    // If no email but we have full+domain and Hunter is configured, try to find one
    if (!email && HUNTER && domain && full) {
      try {
        email = normEmail(await hunterFind(full, domain, HUNTER));
      } catch {}
    }
    if (!email) {
      rejected++;
      continue;
    }

    // Verify email (optional)
    let verification: any = null;
    if (HUNTER) {
      try {
        verification = await hunterVerify(email, HUNTER);
      } catch {}
      const score = Number(verification?.score ?? 0);
      if (score && score < MIN_SCORE) {
        rejected++;
        continue;
      }
    }

    const finalLead: any = {
      source: cbSource,
      captured_at: new Date().toISOString(),
      ...l,
      full_name: full || undefined,
      email,
      verification,
      status: "ready",
    };
    finalLead["score"] = scoreLead(finalLead);

    // Caps
    if (counters.dayCount >= DAILY_CAP || counters.monthCount >= MONTHLY_CAP) {
      await queueStore.set(crypto.randomUUID(), JSON.stringify(finalLead));
      queued++;
      await dedupeStore.set(dedupeKey, "1");
      continue;
    }

    // Accept
    await leadsStore.set(`cb:${email}`, JSON.stringify(finalLead));
    await dedupeStore.set(dedupeKey, "1");
    counters.dayCount++;
    counters.monthCount++;
    accepted++;
  }

  await setCounters(counters);

  return json({
    received: leads.length,
    accepted,
    queued,
    duplicates,
    rejected,
    dayCount: counters.dayCount,
    monthCount: counters.monthCount,
  });
};
