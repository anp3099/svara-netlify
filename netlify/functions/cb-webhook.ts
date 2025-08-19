import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// ----- Types ----- //
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
};

// ----- Helpers ----- //
const ok = (data: any, statusCode = 200) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

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

// light score you can tweak later
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

// ----- Blob Stores ----- //
async function store(name: string) {
  return getStore({ name });
}
async function getCounters() {
  const s = await store("leads-counters");
  const raw = await s.get("counters");
  return raw ? JSON.parse(raw) : null;
}
async function setCounters(data: any) {
  const s = await store("leads-counters");
  await s.set("counters", JSON.stringify(data));
}

// ----- Handler ----- //
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return ok({ error: "POST only" }, 405);

  // Secret (x-webhook-secret header OR ?secret=)
  const headerSecret = event.headers["x-webhook-secret"] || "";
  const qs = new URLSearchParams(event.rawQuery || "");
  const querySecret = qs.get("secret") || "";
  const secret = process.env.LEADS_WEBHOOK_SECRET || "";
  if (secret && headerSecret !== secret && querySecret !== secret) {
    return ok({ error: "Unauthorized" }, 401);
  }

  // Optional source label, e.g. /api/cb-webhook?source=enrichment
  const cbSource = qs.get("source") || "conversion_blitz";

  // Parse JSON
  let body: any = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return ok({ error: "Invalid JSON" }, 400);
  }

  // Accept both single and array + CB preview structure
  const leads: CBLead[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.leads)
    ? body.leads
    : [body];

  const DAILY_CAP = Number(process.env.DAILY_CAP || 70);
  const MONTHLY_CAP = Number(process.env.MONTHLY_CAP || 2000);
  const HUNTER = process.env.HUNTER_API_KEY || "";
  const MIN_SCORE = Number(process.env.HUNTER_MIN_SCORE || 80);

  // counters
  const counters = (await getCounters()) || {};
  const { day, month } = todayKeys();
  if (counters.date !== day) counters.dayCount = 0, (counters.date = day);
  if (counters.month !== month) counters.monthCount = 0, (counters.month = month);

  const leadsStore = await store("leads");        // accepted
  const queueStore = await store("leads-queue");  // queued (cap reached)
  const dedupeStore = await store("leads-dedupe");// seen keys

  let accepted = 0, queued = 0, duplicates = 0, rejected = 0;

  for (const raw of leads) {
    // Map CB preview keys -> our fields (be tolerant)
    const first_name =
      raw.first_name || raw.person_first_name || raw.firstname || raw.firstName;
    const last_name =
      raw.last_name || raw.person_last_name || raw.lastname || raw.lastName;
    const full_name =
      raw.full_name ||
      raw.person_full_name ||
      [first_name, last_name].filter(Boolean).join(" ").trim();
    const title = raw.title || raw.person_job_title || raw.headline;
    const company = raw.company || raw.person_company || raw.company_name;
    const domain = raw.domain || raw.company_domain || raw.company_website;
    let email = normEmail(
      raw.email || raw.person_business_email || raw.person_email
    );
    const linkedin = raw.linkedin || raw.person_linkedin || raw.linkedin_url;
    const location =
      raw.location || raw.person_location || raw.person_city;

    // dedupe key
    const dedupeKey =
      email ||
      (domain && full_name ? `${domain}::${full_name.toLowerCase()}` : undefined);
    if (!dedupeKey) {
      rejected++;
      continue;
    }
    if (await dedupeStore.get(dedupeKey)) {
      duplicates++;
      continue;
    }

    // Find email if missing
    if (!email && HUNTER && domain && full_name) {
      try {
        email = normEmail(await hunterFind(full_name, domain, HUNTER));
      } catch {}
    }
    if (!email) {
      rejected++;
      continue;
    }

    // Verify email
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
      full_name: full_name || undefined,
      first_name: first_name || undefined,
      last_name: last_name || undefined,
      title,
      company,
      domain,
      email,
      linkedin,
      location,
      verification,
      status: "ready",
    };
    finalLead.score = scoreLead(finalLead);

    // caps
    if (counters.dayCount >= DAILY_CAP || counters.monthCount >= MONTHLY_CAP) {
      await queueStore.set(crypto.randomUUID(), JSON.stringify(finalLead));
      queued++;
      await dedupeStore.set(dedupeKey, "1");
      continue;
    }

    // accept
    await leadsStore.set(`cb:${email}`, JSON.stringify(finalLead));
    await dedupeStore.set(dedupeKey, "1");
    counters.dayCount++;
    counters.monthCount++;
    accepted++;
  }

  await setCounters(counters);

  return ok({
    received: leads.length,
    accepted,
    queued,
    duplicates,
    rejected,
    dayCount: counters.dayCount,
    monthCount: counters.monthCount,
  });
};
