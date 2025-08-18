import { json, bad, reqJSON } from './_utils';

export default async (req: Request) => {
  if (req.method !== 'POST') return bad('POST only', 405);
  const key = process.env.PDL_API_KEY;
  if (!key) return bad('Missing PDL_API_KEY', 500);

  const body = await reqJSON<any>(req);
  const size = Math.min(Number(body?.limit ?? 25), 100);

  // Simple text query; you can switch to structured filters later.
  const query = [
    body?.query,
    body?.title ? `title:"${body.title}"` : '',
    body?.company ? `company:"${body.company}"` : '',
    body?.location ? `location:"${body.location}"` : '',
    body?.size ? `company_size:"${body.size}"` : '',
  ].filter(Boolean).join(' AND ').trim() || '*';

  const resp = await fetch('https://api.peopledatalabs.com/v5/person/search', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Api-Key': key,
    },
    body: JSON.stringify({ size, query, pretty: true }),
  });

  if (!resp.ok) return bad(`PDL error ${resp.status}`, 500);
  const data = await resp.json();
  return json({ source: 'pdl.person-search', data });
};
