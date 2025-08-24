// netlify/functions/_blink.ts
// Server-side Blink client for Netlify Functions (no dynamic imports)

// Optional: load .env locally; harmless on Netlify where env vars are injected
try {
  (eval as any)("require")("dotenv").config();
} catch {}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@blinkdotnew/sdk";

// Keep a single instance across warm invocations
let _blink: any | null = null;

export function getBlink() {
  if (_blink) return _blink;

  _blink = createClient({
    projectId: "spark-ai-sales-outreach-saas-platform-68hyt0cq",
    authRequired: true,
  });

  return _blink;
}

export const blink = getBlink();

/** Small helper for diagnostics from other functions (optional). */
export function blinkDebug() {
  const db = (blink as any)?.db;
  return {
    ok: true,
    hasDb: Boolean(db),
    keys: db ? Object.keys(db) : [],
  };
}
