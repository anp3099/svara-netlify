// src/lib/leadsApi.ts
export type Lead = {
  id: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  domain?: string;
  linkedin?: string;
  location?: string;
  score?: number;
  captured_at?: string;
  source?: string;
};

type RawItem = any;

function mapItem(x: RawItem): Lead {
  // Some builds return {items:[...]}; yours already returns flattened objects.
  const v = x?.value ? JSON.parse(x.value) : x;

  const id =
    x?.key ||
    v?.email ||
    crypto.randomUUID();

  const company =
    v.company || v.company_name || v.person_company_name || "Unknown Company";

  return {
    id,
    email: v.email,
    full_name: v.full_name,
    first_name: v.first_name,
    last_name: v.last_name,
    title: v.title || v.person_job_title || v.person_headline,
    company,
    domain: v.domain,
    linkedin: v.linkedin || v.person_linkedin_url,
    location: v.location || v.person_location,
    score: typeof v.score === "number" ? v.score : (v.verification?.score ?? 0),
    captured_at: v.captured_at,
    source: v.source,
  };
}

export async function fetchLeads(limit = 50, cursor?: string) {
  const qs = new URLSearchParams({ store: "leads", limit: String(limit) });
  if (cursor) qs.set("cursor", cursor);

  const res = await fetch(`/api/leads?${qs}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to load leads (${res.status})`);

  const data = await res.json();
  // Your endpoint returns { items: [...], cursor?: string }
  const rawItems = Array.isArray(data?.items) ? data.items : data;
  return {
    items: rawItems.map(mapItem),
    cursor: data?.cursor as string | undefined,
  };
}
