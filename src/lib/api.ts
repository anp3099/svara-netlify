// src/lib/api.ts
// When the site runs on Blink (production), call your Netlify Functions
// using an absolute base URL passed via Vite env: VITE_API_BASE_URL.
// In local dev, we can still call relative paths.

const PROD_API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const isProd = import.meta.env.MODE === "production";

export function apiUrl(path: string) {
  return isProd ? `${PROD_API_BASE}${path}` : path;
}
