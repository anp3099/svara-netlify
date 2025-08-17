import { getFunctionBaseUrl } from '@/lib/prodConfig'

export async function validateSequence(payload: any, overrideBase?: string) {
  const base = overrideBase ? String(overrideBase).replace(/\/$/, '') : getFunctionBaseUrl()
  const url = `${base}/validate-sequence`

  // Timeout-able fetch with 30s timeout
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 30000)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { ok: false, status: 504, data: null, raw: 'Request timed out' }
    }
    return { ok: false, status: 0, data: null, raw: String(err?.message || err) }
  } finally {
    clearTimeout(id)
  }

  const text = await res.text()
  let parsed: any = null
  try { parsed = text ? JSON.parse(text) : null } catch (e) { parsed = text }

  return {
    ok: res.ok,
    status: res.status,
    data: parsed,
    raw: text
  }
}
