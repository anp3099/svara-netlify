import { json, bad, fetchJSON } from './_utils';

export default async (req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const num = Math.min(Number(url.searchParams.get('num') ?? 10), 100);
  const key = process.env.SERPAPI_KEY;
  if (!key) return bad('Missing SERPAPI_KEY', 500);
  if (!q) return bad('Missing ?q', 400);

  const params = new URLSearchParams({
    engine: 'google',
    google_domain: 'google.com',
    q, num: String(num),
    api_key: key,
  });

  const resp = await fetchJSON<any>(`https://serpapi.com/search.json?${params.toString()}`);
  const results = (resp.organic_results ?? []).map((r: any) => ({
    title: r.title, link: r.link, snippet: r.snippet,
  }));

  return json({ source: 'serpapi', q, results });
};
