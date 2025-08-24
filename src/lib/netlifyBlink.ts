// src/lib/netlifyBlink.ts
let cached: any;

export function getBlink(): any {
  if (cached) return cached;

  // harmless on Netlify; useful locally
  try { require('dotenv').config(); } catch {}

  // try server build first
  try {
    const m = require('../../src/blink/server');
    cached = m?.blink ?? m?.default ?? m;
  } catch {}

  // fallback to client build
  if (!cached) {
    try {
      const m = require('../../src/blink/client');
      cached = m?.blink ?? m?.default ?? m;
    } catch {}
  }

  return cached ?? (globalThis as any).blink ?? null;
}
