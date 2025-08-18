import { json, bad, fetchJSON } from './_utils';

export default async (req: Request) => {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');
  const key = process.env.HUNTER_API_KEY;
  if (!key) return bad('Missing HUNTER_API_KEY', 500);
  if (!email) return bad('Missing ?email', 400);

  const data = await fetchJSON<any>(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${key}`);
  return json({ source: 'hunter.verify', data: data?.data ?? data });
};
