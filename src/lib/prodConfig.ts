export function getFunctionBaseUrl(): string {
  // Prefer VITE_FUNCTION_BASE_URL for production deployments (Netlify environment variable)
  // Fallback to the existing Blink functions domain used in development
  const envBase = (import.meta.env.VITE_FUNCTION_BASE_URL as string) || ''
  if (envBase && envBase.trim().length > 0) return envBase.replace(/\/$/, '')

  // Keep the project's current Blink functions default as a safe fallback
  return 'https://68hyt0cq--validate-sequence.functions.blink.new'
}

export function getAllowedOrigins(): string[] {
  // Allowlist for CORS - can be extended via VITE_ALLOWED_ORIGINS as comma-separated
  const raw = (import.meta.env.VITE_ALLOWED_ORIGINS as string) || ''
  const envList = raw.split(',').map(s => s.trim()).filter(Boolean)
  const defaults = ['https://svara.tech', 'https://www.svara.tech']
  return Array.from(new Set([...defaults, ...envList]))
}
