import { getStore } from "@netlify/blobs";

export const config = { path: "/api/cb-webhook" };

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
  // any other fields from CB are fine, we spread them into the final object
};

// ----- Helpers ----- //
const j = (d: any, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { "content-type": "application/json" },
  });

const todayKeys = () => {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return { day: `${yyyy}-${mm}-${dd}`, month: `${yyyy}-${mm}` };
};

const normEmail = (e?: string | null) => (e ? e.trim().toLowerCase() : undefined);

// Hunter helpers (optional)
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

// simple lead score you can adjust later
const scoreLead = (l: any) => {
  const title = (l.title || "").toLowerCase();
  let s = 0;
  if (/(founder|owner|ceo|coo)/.test(title)) s += 40;
  if (/(vp|head|director)/.test(title)) s += 30;
  if (/(sales|growth|marketing)/.test(title)) s += 20;
  const v = Number(l.verification?.score ?? 0);
  if (v >= 90) s += 20;
  return Math.min(100, s);
};

// counters (stored in blobs)
async function getCounters() {
  const store = await getStore({ name: "leads-counters" });
  const raw = await store.get("counters");
  return raw ? JSON.parse(raw) : {};
}
async function setCounters(data: any) {
  const store = await getStore({ name: "leads-counters" });
  await store.set("counters", JSON.stringify(data));
}

export default async (req: Request) => {
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  // Secret (header OR ?secret=)
  const headerSecret = req.headers.get("x-webhook-secret") || "";
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret") || "";
  const secret = process.env.LEADS_WEBHOOK_SECRET || "";
  if (secret && headerSecret !== secret && querySecret !== secret) {
    return j({ error: "Unauthorized" }, 401);
  }

  const cbSource = url.searchParams.get("source") || "conversion_blitz";
  let body: any;
  try {
    body = await req.json();
  } catch {
    return j({ error: "Invalid JSON" }, 400);
  }

  const leads: CBLead[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.leads)
    ? body.leads
    : [body];

  const DAILY_CAP = Number(process.env.DAILY_CAP || 70);
  const MONTHLY_CAP = Number(process.env.MONTHLY_CAP || 2000);
  const HUNTER = process.env.HUNTER_API_KEY || "";
  const MIN_SCORE = Number(process.env.HUNTER_MIN_SCORE || 80);

  const counters = (await getCounters()) || {};
  const { day, month } = todayKeys();
  if (counters.date !== day) counters.dayCount = 0, (counters.date = day);
  if (counters.month !== month) counters.monthCount = 0, (counters.month = month);

  const leadsStore = await getStore({ name: "leads" });        // accepted
  const queueStore = await getStore({ name: "leads-queue" });  // queued
  const dedupeStore = await getStore({ name: "leads-dedupe" }); // seen keys

  let accepted = 0,
    queued = 0,
    duplicates = 0,
    rejected = 0;

  for (const raw of leads) {
    const full = raw.full_name || `${raw.first_name ?? ""} ${raw.last_name ?? ""}`.trim();
    const domain = raw.domain?.trim();
    let email = normEmail(raw.email);

    // dedupe key
    const dedupeKey = email || (domain && full ? `${domain}::${full.toLowerCase()}` : undefined);
    if (!dedupeKey) { rejected++; continue; }
    if (await dedupeStore.get(dedupeKey)) { duplicates++; continue; }

    // enrich with Hunter if needed
    if (!email && HUNTER && domain && full) {
      try { email = normEmail(await hunterFind(full, domain, HUNTER)); } catch {}
    }
    if (!email) { rejected++; continue; }

    // verify
    let verification: any = null;
    if (HUNTER) {
      try { verification = await hunterVerify(email, HUNTER); } catch {}
      const score = Number(verification?.score ?? 0);
      if (score && score < MIN_SCORE) { rejected++; continue; }
    }

    const finalLead: any = {
      source: cbSource,
      captured_at: new Date().toISOString(),
      ...raw,
      full_name: full || undefined,
      email,
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

    // accept and store (keyed by email)
    await leadsStore.set(`cb:${email}`, JSON.stringify(finalLead));
    await dedupeStore.set(dedupeKey, "1");
    counters.dayCount++; counters.monthCount++;
    accepted++;
  }

  await setCounters(counters);

  return j({
    received: leads.length,
    accepted,
    queued,
    duplicates,
    rejected,
    dayCount: counters.dayCount,
    monthCount: counters.monthCount,
  });
};
