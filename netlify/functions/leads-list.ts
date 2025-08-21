export const config = { path: "/api/leads" };

type ListResp = {
  store: "leads" | "leads-queue" | "leads-dedupe";
  total?: number;
  items: any[];
  cursor?: string | null;
};

const ok = (d: any, s = 200) =>
  new Response(JSON.stringify(d, null, 2), { status: s, headers: { "content-type": "application/json" } });
const bad = (m: string, s = 400) => ok({ error: m }, s);

export default async (req: Request) => {
  try {
    const { getStore } = await import("@netlify/blobs");
    const url = new URL(req.url);
    const storeName = (url.searchParams.get("store") as any) || "leads"; // leads | leads-queue | leads-dedupe
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const cursor = url.searchParams.get("cursor") || undefined;

    if (!["leads", "leads-queue", "leads-dedupe"].includes(storeName)) {
      return bad("Invalid store. Use ?store=leads|leads-queue|leads-dedupe");
    }

    const store = getStore({ name: storeName });
    const listed = await store.list({ cursor, limit }); // {blobs: [{key,size}], cursor}
    const items: any[] = [];

    // Pull objects for first page
    for (const b of listed.blobs) {
      const val = await store.get(b.key);
      try {
        items.push({ key: b.key, size: b.size, value: JSON.parse(val || "{}") });
      } catch {
        items.push({ key: b.key, size: b.size, value: val });
      }
    }

    // counters
    const countersStore = getStore({ name: "leads-counters" });
    const rawCounters = await countersStore.get("counters");
    const counters = rawCounters ? JSON.parse(rawCounters) : null;

    const resp: ListResp & { counters: any } = {
      store: storeName as any,
      items,
      cursor: listed.cursor || null,
      counters,
    };
    return ok(resp);
  } catch (e: any) {
    return bad(e?.message || "Unexpected error", 500);
  }
};
