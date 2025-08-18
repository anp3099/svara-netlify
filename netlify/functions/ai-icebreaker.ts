import { json, bad, reqJSON } from './_utils';

export default async (req: Request) => {
  if (req.method !== 'POST') return bad('POST only', 405);
  const key = process.env.OPENAI_API_KEY;
  if (!key) return bad('Missing OPENAI_API_KEY', 500);

  const body = await reqJSON<{ companyName?: string; companyUrl?: string; aboutText?: string; role?: string; }>(req);

  const system = `You are a helpful SDR assistant.
Generate ONE genuine 1–2 sentence icebreaker for a cold email.
Use only the provided info. No assumptions. Avoid hype.`;

  const user = `Company: ${body.companyName || 'Unknown'}
Website: ${body.companyUrl || 'Unknown'}
Role: ${body.role || 'Unknown'}
About:
${(body.aboutText || '').slice(0, 2000)}`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!r.ok) return bad(`OpenAI error ${r.status}`, 500);
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return json({ icebreaker: text });
};
