import { getStore } from "@netlify/blobs";
export const config = { path: "/api/leads-usage" };

export default async () => {
  const s = await getStore({ name: "leads-counters" });
  const raw = await s.get("counters");
  return new Response(
    raw || JSON.stringify({ dayCount: 0, monthCount: 0 }),
    { headers: { "content-type": "application/json" } }
  );
};
