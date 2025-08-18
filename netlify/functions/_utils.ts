// Simple JSON helpers
export const json = (body: any, init: number | ResponseInit = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status: typeof init === 'number' ? init : init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(typeof init === 'object' ? init.headers : {}) },
  });

export const bad = (msg: string, status = 400) => json({ error: msg }, status);

export const reqJSON = async <T>(req: Request) => {
  try { return (await req.json()) as T; } catch { return undefined as unknown as T; }
};

// Fetch with light retry/backoff
export async function fetchJSON<T>(url: string, init?: RequestInit, tries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, init);
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status}: ${text || r.statusText}`);
      }
      return (await r.json()) as T;
    } catch (e) {
      lastErr = e;
      await new Promise(res => setTimeout(res, 400 * (i + 1)));
    }
  }
  throw lastErr;
}
