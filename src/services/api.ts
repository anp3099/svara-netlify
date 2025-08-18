export async function hunterDomain(domain: string) {
  return fetch(`/api/hunter-domain-search?domain=${encodeURIComponent(domain)}`).then(r => r.json());
}
export async function hunterFindEmail(full_name: string, domain: string) {
  const u = new URLSearchParams({ full_name, domain });
  return fetch(`/api/hunter-email-finder?${u}`).then(r => r.json());
}
export async function hunterVerify(email: string) {
  return fetch(`/api/hunter-verify?email=${encodeURIComponent(email)}`).then(r => r.json());
}
export async function pdlSearch(payload: {
  query?: string; title?: string; company?: string; location?: string; size?: string; limit?: number;
}) {
  return fetch('/api/pdl-person-search', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload)}).then(r => r.json());
}
export async function googleSearch(q: string, num = 10) {
  return fetch(`/api/google-search?q=${encodeURIComponent(q)}&num=${num}`).then(r => r.json());
}
export async function aiIcebreaker(input: { companyName?: string; companyUrl?: string; aboutText?: string; role?: string; }) {
  return fetch('/api/ai-icebreaker', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(input) }).then(r => r.json());
}
