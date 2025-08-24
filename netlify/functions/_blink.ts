// Re-export Blink from your app so Netlify's bundler can statically include it.
// If you only have one of these files, keep that import and delete the other.
import * as server from "../../src/blink/server";
import * as client from "../../src/blink/client";

// Pick whichever export exists.
export const blink =
  (server as any).blink ??
  (server as any).default ??
  (client as any).blink ??
  (client as any).default;
