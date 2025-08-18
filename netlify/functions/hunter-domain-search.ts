import { json, bad, fetchJSON } from './_utils';

export default async (req: Request) => {
  const url = new URL(req.url);
  const domain = url.searchParams.get('domain');
  const key = process.env.HUNTER_API_KEY;
  if (!key) return bad('Missing HUNTER_API_KEY', 500);
  if (!domain) return bad('Missing ?domain', 400);

  const data = await fetchJSON<any>(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${key}`);
  return json({ source: 'hunter.domain-search', data: data?.data ?? data });
};
