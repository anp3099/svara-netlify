// netlify/functions/cb-webhook.ts
import { getStore } from "@netlify/blobs";

export const config = { path: "/api/cb-webhook" };

/** ---- tiny env helper works in Deno or Node ---- */
const ENV = (k: string) => {
  try {
    // @ts-ignore
    if (typeof Deno !== "undefined" && Deno?.env?.get) return Deno.env.get(k) || "";
  } catch {}
  // @ts-ignore
  if (typeof process !== "undefined" && process?.env) return process.env[k] || "";
  return "";
};

type AnyObj = Record<string, any>;

const ok = (d: any, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });

/** ---- helpers ---- */
const first = (obj: AnyObj, keys: string[], fallback?: any) => {
  for (const k of keys) {
    const v = deep(obj, k);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

const deep = (obj: AnyObj, path: string) => {
  // supports "a.b.c" and "emails[0]"
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};

const toDomain = (val?: string) => {
  if (!val) return undefined;
  let v = val.trim();
  // strip emails
  const at = v.indexOf("@");
  if (at !== -1) v = v.slice(at + 1);
  // if it's a URL, parse hostname
  try {
    if (/^https?:\/\//i.test(v)) v = new URL(v).hostname;
  } catch {}
  // drop www.
  v = v.replace(/^www\./i, "");
  // keep simple domains only
  if (!v.includes(".")) return undefined;
  return v.toLowerCase();
};

const toEmail = (val?: string) => (val ? val.trim().toLowerCase() : undefined);

const todayKeys = () => {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return { day: `${yyyy}-${mm}-${dd}`, month: `${yyyy}-${mm}` };
};

// Hunter (optional)
async function hunterVerify(email: string, apiKey: string) {
  const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data ?? null;
}
async function hunterFind(full: string, domain: string, apiKey: string) {
  const url = `https://api.hunter.io/v2/email-finder?full_name=${encodeURIComponent(full)}&domain=${encodeURIComponent(domain)}&api_key=${apiKey}`;
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data?.email ?? null;
}

const scoreLead = (l: AnyObj) => {
  const title = (l.title || "").toLowerCase();
  let s = 0;
  if (/(founder|owner|ceo|coo)/.test(title)) s += 40;
  if (/(vp|head|director)/.test(title)) s += 30;
  if (/(sales|growth|marketing)/.test(title)) s += 20;
  const v = Number(l.verification?.score ?? 0);
  if (v >= 90) s += 20;
  return Math.min(100, s);
};

/** counters in blobs */
async function getCounters() {
  const store = await getStore({ name: "leads-counters" });
  const raw = await store.get("counters");
  return raw ? JSON.parse(raw) : {};
}
async function setCounters(data: any) {
  const store = await getStore({ name: "leads-counters" });
  await store.set("counters", JSON.stringify(data));
}

/** ---- normalize one CB record into our schema ---- */
function normalizeOne(raw: AnyObj) {
  // Try to unwrap if CB nests under 'data', 'lead', or 'contact'
  const src = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  const obj = src?.lead || src?.contact || src;

  // Names
  const firstName = first(obj, ["first_name", "person_first_name", "firstname", "firstName"]);
  const lastName  = first(obj, ["last_name", "person_last_name", "lastname", "lastName"]);
  const fullName  = first(obj, ["full_name", "name", "person_full_name"]) || [firstName, lastName].filter(Boolean).join(" ").trim();

  // Company
  const company   = first(obj, ["company", "company_name", "business_name", "organization", "employer"]);

  // Domain / website
  const domainRaw = first(obj, ["domain", "company_domain", "website", "url", "company_website", "site", "company_url"]);
  const domain    = toDomain(domainRaw);

  // Email(s)
  let email = toEmail(first(obj, [
    "email", "person_business_email", "business_email", "work_email",
    "professional_email", "company_email", "contact_email"
  ]));
  // arrays: emails[0], contact.emails[0].email, etc.
  if (!email) {
    const arr = first(obj, ["emails", "contact.emails"]);
    if (Array.isArray(arr) && arr.length) {
      if (typeof arr[0] === "string") email = toEmail(arr[0]);
      else if (arr[0]?.email) email = toEmail(arr[0].email);
    }
  }

  const title     = first(obj, ["title", "job_title", "position", "role"]);
  const linkedin  = first(obj, ["linkedin", "linkedin_url", "person_linkedin_url", "profile"]);
  const location  = first(obj, ["location", "city", "region", "state", "country"]);

  return { raw, first_name: firstName, last_name: lastName, full_name: fullName, company, domain, email, title, linkedin, location };
}

/** ---- main handler ---- */
export default async (req: Request) => {
  if (req.method !== "POST") return ok({ error: "POST only" }, 405);

  const url = new URL(req.url);
  const source = url.searchParams.get("source") || "conversion_blitz";
  const qsSecret = url.searchParams.get("secret") || "";
  const headerSecret = req.headers.get("x-webhook-secret") || "";
  const secret = ENV("LEADS_WEBHOOK_SECRET") || "";
  if (secret && qsSecret !== secret && headerSecret !== secret) return ok({ error: "Unauthorized" }, 401);

  const DAILY_CAP = Number(ENV("DAILY_CAP") || 200);
  const MONTHLY_CAP = Number(ENV("MONTHLY_CAP") || 5000);
  const HUNTER = ENV("HUNTER_API_KEY") || "";
  const MIN_SCORE = Number(ENV("HUNTER_MIN_SCORE") || 0);      // keep 0 for testing
  const LOG_RAW = !!ENV("LOG_RAW");                           // set LOG_RAW=1 to inspect incoming payloads
  const ALLOW_PARTIAL = !!ENV("ALLOW_PARTIAL");               // set ALLOW_PARTIAL=1 to keep records without email (status=pending_email)

  let body: any;
  try { body = await req.json(); } catch { return ok({ error: "Invalid JSON" }, 400); }

  // Optional: log raw payloads for debugging
  if (LOG_RAW) {
    const rawStore = await getStore({ name: "leads-raw" });
    await rawStore.set(`cbraw:${Date.now()}:${Math.random().toString(36).slice(2)}`, JSON.stringify(body));
  }

  // Accept arrays or single object; some CB payloads use { leads: [...] }
  const input = Array.isArray(body) ? body : Array.isArray(body?.leads) ? body.leads : [body];

  // Normalize all
  const items = input.map(normalizeOne);

  // counters
  const counters = (await getCounters()) || {};
  const { day, month } = todayKeys();
  if (counters.date !== day) { counters.dayCount = 0; counters.date = day; }
  if (counters.month !== month) { counters.monthCount = 0; counters.month = month; }

  const leadsStore = await getStore({ name: "leads" });
  const queueStore = await getStore({ name: "leads-queue" });
  const dedupeStore = await getStore({ name: "leads-dedupe" });

  let accepted = 0, queued = 0, duplicates = 0, rejected = 0;

  for (const it of items) {
    let { email, full_name, domain } = it;

    // try to find email if missing but we have enough info
    if (!email && HUNTER && domain && full_name) {
      try { email = toEmail(await hunterFind(full_name, domain, HUNTER)); } catch {}
    }

    // dedupe key: prefer email; fallback to domain + full_name
    const dedupeKey = email || (domain && full_name ? `${domain}::${full_name.toLowerCase()}` : undefined);
    if (!dedupeKey) {
      if (ALLOW_PARTIAL && (domain || full_name)) {
        // Save to queue as pending
        const pending = { ...it, source, captured_at: new Date().toISOString(), status: "pending_email" };
        await queueStore.set(`pending:${Date.now()}:${Math.random()}`, JSON.stringify(pending));
        queued++;
        continue;
      }
      rejected++;
      continue;
    }
    if (await dedupeStore.get(dedupeKey)) { duplicates++; continue; }

    // verify (optional)
    let verification: any = null;
    if (HUNTER && email) {
      try { verification = await hunterVerify(email, HUNTER); } catch {}
      const score = Number(verification?.score ?? 0);
      if (score && score < MIN_SCORE) { rejected++; await dedupeStore.set(dedupeKey, "1"); continue; }
    }

    const finalLead: AnyObj = {
      ...it,
      source,
      captured_at: new Date().toISOString(),
      email,
      verification,
      status: "ready",
    };
    finalLead.score = scoreLead(finalLead);

    // caps
    if (counters.dayCount >= DAILY_CAP || counters.monthCount >= MONTHLY_CAP) {
      await queueStore.set(`q:${Date.now()}:${Math.random()}`, JSON.stringify(finalLead));
      queued++;
      await dedupeStore.set(dedupeKey, "1");
      continue;
    }

    // accept
    const key = email ? `cb:${email}` : `cb:${domain}:${full_name?.toLowerCase()}`;
    await leadsStore.set(key, JSON.stringify(finalLead));
    await dedupeStore.set(dedupeKey, "1");
    counters.dayCount++; counters.monthCount++;
    accepted++;
  }

  await setCounters(counters);

  return ok({
    received: items.length, accepted, queued, duplicates, rejected,
    dayCount: counters.dayCount, monthCount: counters.monthCount
  });
};
