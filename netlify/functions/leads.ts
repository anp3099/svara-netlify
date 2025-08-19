import { getStore } from "@netlify/blobs";

export const config = { path: "/api/leads" };

// GET /api/leads?limit=50&cursor=...
export default async (req: Request) => {
  if (req.method !== "GET")
    return new Response(JSON.stringify({ error: "GET only" }), { status: 405 });

  const url = new URL(req.url);
  const limit = Math.min(200, parseInt(url.searchParams.get("limit") || "50", 10));
  const cursor = url.searchParams.get("cursor") || undefined;

  const store = await getStore({ name: "leads" });
  const list = await store.list({ prefix: "cb:", limit, cursor });

  // Load the JSON bodies
  const items = await Promise.all(
    list.blobs.map(async (b) => {
      const raw = await store.get(b.key);
      return { key: b.key, ...(raw ? JSON.parse(raw) : {}) };
    })
  );

  return new Response(
    JSON.stringify({ items, cursor: list.cursor, truncated: list.truncated }),
    { headers: { "content-type": "application/json" } }
  );
};
