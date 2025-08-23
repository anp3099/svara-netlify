// src/services/campaigns-api-shim.ts
import campaignsService from "@/services/campaigns";

function json(code: number, body: any): Response {
  return new Response(JSON.stringify(body), {
    status: code,
    headers: { "Content-Type": "application/json" },
  });
}

async function countMap(ids: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  ids.forEach(id => (counts[id] = 0));

  const blink: any = (window as any).blink;
  const db: any = blink?.db;
  if (!db || !ids.length) return counts;

  const keys = Object.keys(db);

  // 1) Join table (campaignsLeads / campaign_leads / etc.)
  const preferredJoin = [
    "campaignsLeads",
    "campaign_leads",
    "campaigns_leads",
    "campaignLead",
    "leadCampaign",
  ];
  const joinKey =
    preferredJoin.find(k => typeof db?.[k]?.list === "function") ||
    keys.find(
      k =>
        /campaign/i.test(k) &&
        /lead|contact|prospect/i.test(k) &&
        typeof db?.[k]?.list === "function"
    );

  if (joinKey) {
    const join = db[joinKey];
    const ck = ["campaignId", "campaign_id", "campaign"].find(
      f => typeof join?.list === "function"
    );
    if (ck) {
      for (const id of ids) {
        try {
          const rows = (await join.list({
            where: { [ck]: id },
            limit: 500,
          })) as any[];
          if (Array.isArray(rows)) counts[id] = rows.length;
        } catch {}
      }
      return counts;
    }
  }

  // 2) Leads table that stamps campaignId/campaign_id
  const preferredLeads = [
    "leads",
    "lead",
    "contacts",
    "prospects",
    "people",
    "persons",
    "records",
    "realLeadDatabase",
    "leadDatabase",
  ];
  const leadsKey =
    preferredLeads.find(k => typeof db?.[k]?.list === "function") ||
    keys.find(
      k =>
        /lead|contact|prospect|people|person|record/i.test(k) &&
        typeof db?.[k]?.list === "function"
    );

  if (leadsKey) {
    const leads = db[leadsKey];
    const fk = ["campaignId", "campaign_id", "campaign"].find(
      f => typeof leads?.list === "function"
    );
    if (fk) {
      for (const id of ids) {
        try {
          const rows = (await leads.list({
            where: { [fk]: id },
            limit: 500,
          })) as any[];
          if (Array.isArray(rows)) counts[id] = rows.length;
        } catch {}
      }
    }
  }

  return counts;
}

export function installCampaignsApiShim() {
  if (typeof window === "undefined" || (window as any).__campaignsShim) return;
  (window as any).__campaignsShim = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? new URL(input, location.origin)
          : input instanceof URL
          ? input
          : new URL((input as Request).url, location.origin);

      if (url.pathname === "/api/campaigns") {
        const qs = url.searchParams;

        // GET /api/campaigns?list=1
        if (qs.has("list")) {
          const rows = (await campaignsService.list()) ?? [];
          return json(200, { ok: true, rows });
        }

        // GET /api/campaigns?stats=1&ids=a,b,c
        if (qs.has("stats")) {
          const ids =
            qs
              .get("ids")
              ?.split(",")
              .map(s => s.trim())
              .filter(Boolean) ?? [];
          const counts = await countMap(ids);
          return json(200, { ok: true, counts });
        }
      }
    } catch {
      // fall through to original fetch
    }
    return originalFetch(input as any, init as any);
  };
}
