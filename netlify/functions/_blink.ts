// netlify/functions/_blink.ts
/* A tiny, bundler-safe Blink loader for Netlify Functions.
   Tries several import/require paths, then falls back to globalThis.blink. */

type AnyBlink = { db?: any; auth?: any } | null;

let cached: AnyBlink = null;

async function tryDynamic(path: string): Promise<any | null> {
  try {
    // Dynamic import keeps esbuild happy and works in ESM
    const m = await import(path);
    if (m?.blink) return m.blink;
    if (m?.default) return m.default;
    return m ?? null;
  } catch {
    return null;
  }
}

function tryRequire(path: string): any | null {
  try {
    // Avoid bundler rewriting by using eval
    // eslint-disable-next-line no-eval
    const req = (eval as any)("require") as NodeRequire;
    const m = req(path);
    if (m?.blink) return m.blink;
    if (m?.default) return m.default;
    return m ?? null;
  } catch {
    return null;
  }
}

export async function getBlink(): Promise<AnyBlink> {
  if (cached) return cached;

  // Paths are relative to the compiled function bundle.
  // The files are included via `included_files` in netlify.toml.
  const candidates = [
    "../../src/blink/server",  // prefer server-side
    "../../src/blink/index",
    "../../src/blink/client",
    "../../src/lib/blink",
    "../../lib/blink",
    "../../../src/lib/blink",
  ];

  for (const p of candidates) {
    const m1 = await tryDynamic(p);
    if (m1 && (m1.db || m1.auth)) return (cached = m1 as AnyBlink);

    const m2 = tryRequire(p);
    if (m2 && (m2.db || m2.auth)) return (cached = m2 as AnyBlink);
  }

  // Last resort: a global injected somewhere else (client builds sometimes do this)
  const g = (globalThis as any)?.blink ?? null;
  if (g && (g.db || g.auth)) return (cached = g);

  // Couldn’t find it
  return (cached = null);
}

/** Small helper for diagnostics. */
export async function blinkDebug() {
  const b = await getBlink();
  const db = (b as any)?.db;
  return {
    ok: true,
    hasDb: Boolean(db),
    keys: db ? Object.keys(db) : [],
  };
}
