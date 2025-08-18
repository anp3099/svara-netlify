import { json, bad, fetchJSON } from './_utils';

export default async (req: Request) => {
  const url = new URL(req.url);
  const full_name = url.searchParams.get('full_name');
  const domain = url.searchParams.get('domain');
  const key = process.env.HUNTER_API_KEY;
  if (!key) return bad('Missing HUNTER_API_KEY', 500);
  if (!full_name || !domain) return bad('Missing ?full_name and/or ?domain', 400);

  const data = await fetchJSON<any>(`https://api.hunter.io/v2/email-finder?full_name=${encodeURIComponent(full_name)}&domain=${encodeURIComponent(domain)}&api_key=${key}`);
  return json({ source: 'hunter.email-finder', data: data?.data ?? data });
};
