// src/services/campaigns.ts
// Robust client-only attach with API attempts first, then local DB with
// (a) leads upsert/create to satisfy FKs, then (b) join attach or (c) stamp campaignId.
// No hard import of "@/lib/blink" — resolves lazily or from global.

export type AttachResult = { inserted: number; skipped: number };

type CampaignRow = { id: string; name: string; status?: string; createdAt?: string };

let _blink: any | null = null;
async function getBlinkClient(): Promise<any | null> {
  if (_blink !== null) return _blink;
  try {
    // Lazy import so bundlers don’t choke if alias isn’t present
    const mod: any = await import("@/blink/client");
    _blink = mod?.blink ?? mod?.default ?? mod ?? null;
  } catch {
    _blink = (globalThis as any).blink ?? null;
  }
  return _blink;
}

function normalizeCampaign(r: any): CampaignRow {
  return {
    id: r?.id ?? r?.key,
    name: r?.name ?? r?.title ?? "Untitled",
    status: r?.status ?? r?.state ?? undefined,
    createdAt: r?.createdAt ?? r?.created_at ?? undefined,
  };
}

async function httpJSON<T = any>(url: string, body?: any): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------ local DB discovery helpers ------------------------ */

function dbKeys(db: any): string[] {
  return Object.keys(db || {});
}

function findJoinKey(db: any): string | null {
  const keys = dbKeys(db);
  const preferred = [
    "campaignsLeads",
    "campaign_leads",
    "campaigns_leads",
    "campaignLead",
    "leadCampaign",
  ];
  for (const k of preferred) if (typeof db?.[k]?.create === "function") return k;
  const found =
    keys.find(
      (k) =>
        /campaign/i.test(k) &&
        /lead/i.test(k) &&
        typeof db?.[k]?.create === "function",
    ) ?? null;
  return found;
}

function findLeadsKey(db: any): string | null {
  const keys = dbKeys(db);
  const preferred = [
    "leads",
    "lead",
    "contacts",
    "prospects",
    "people",
    "persons",
    "records",
    "realLeadDatabase",
    "leadDatabase",
    "realLeads",
  ];
  for (const k of preferred) {
    const t = db?.[k];
    if (t && (typeof t.update === "function" || typeof t.upsert === "function" || typeof t.patch === "function"))
      return k;
  }
  const discovered = keys.find((k) => {
    if (/campaign/i.test(k)) return false;
    if (!/lead|contact|prospect|people|person|record/i.test(k)) return false;
    const t = db?.[k];
    return typeof t?.update === "function" || typeof t?.upsert === "function" || typeof t?.patch === "function";
  });
  return discovered ?? null;
}

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

async function ensureLeadsExist(db: any, leadsKey: string, ids: string[]) {
  const t = db?.[leadsKey];
  if (!t) return;

  let userId: string | undefined;
  try {
    const blink = await getBlinkClient();
    userId = await blink?.auth?.me?.().then((m: any) => m?.id).catch(() => undefined);
  } catch {}

  for (const id of ids) {
    // Try upsert -> create; we only set minimal fields to satisfy FK
    const createDoc = userId ? { id, userId } : { id };
    try {
      if (typeof t.upsert === "function") {
        await t.upsert({ where: { id }, update: {}, create: createDoc });
        continue;
      }
    } catch (e) {
      if (isDup(e)) continue;
    }
    try {
      if (typeof t.create === "function") {
        await t.create(createDoc);
      }
    } catch (e) {
      // ignore (FKs may not require an existing lead row)
      if (isDup(e)) continue;
    }
  }
}

async function attachViaJoin(db: any, joinKey: string, campaignId: string, ids: string[]) {
  const join = db?.[joinKey];
  let inserted = 0;
  let skipped = 0;
  if (!join) return { inserted, skipped };

  const campaignKeys = ["campaignId", "campaign_id", "campaign", "campaignID", "campaignid", "campaignKey"];
  const leadKeys = [
    "leadId", "lead_id", "lead", "leadKey", "lead_key",
    "contactId", "contact_id",
    "prospectId", "prospect_id",
    "personId", "person_id",
    "recordId", "record_id",
  ];

  const tryCreate = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
    for (const ck of campaignKeys) {
      for (const lk of leadKeys) {
        try {
          await join.create({ [ck]: campaignId, [lk]: lid });
          return "ok";
        } catch (e) {
          if (isDup(e)) return "dup";
          // try next key combo
        }
      }
    }
    if (typeof join.upsert === "function") {
      try {
        await join.upsert({
          where: { campaignId_leadId: { campaignId, leadId: lid } },
          update: {},
          create: { campaignId, leadId: lid },
        });
        return "ok";
      } catch (e) {
        if (isDup(e)) return "dup";
      }
    }
    return "fail";
  };

  for (const lid of ids) {
    const r = await tryCreate(lid);
    if (r === "ok") inserted++;
    else if (r === "dup") skipped++;
  }

  return { inserted, skipped };
}

async function stampCampaignOnLeads(db: any, leadsKey: string, campaignId: string, ids: string[]) {
  const t = db?.[leadsKey];
  let inserted = 0;
  let skipped = 0;
  if (!t) return { inserted, skipped };

  const campaignFields = ["campaignId", "campaign_id", "campaign", "campaignKey"];

  const updateOne = async (lid: string): Promise<"ok" | "dup" | "fail"> => {
    for (const f of campaignFields) {
      const patch = { [f]: campaignId };
      try {
        if (typeof t.update === "function") { await t.update(lid, patch); return "ok"; }
        if (typeof t.patch  === "function") { await t.patch(lid, patch);  return "ok"; }
        if (typeof t.upsert === "function") {
          await t.upsert({ where: { id: lid }, update: patch, create: { id: lid, ...patch } });
          return "ok";
        }
      } catch (e) {
        if (isDup(e)) return "dup";
      }
    }
    return "fail";
  };

  for (const lid of ids) {
    const r = await updateOne(lid);
    if (r === "ok") inserted++;
    else if (r === "dup") skipped++;
  }

  return { inserted, skipped };
}

/* --------------------------------- service --------------------------------- */

const campaignsService = {
  async list(userId?: string): Promise<CampaignRow[]> {
    try {
      const blink = await getBlinkClient();
      const rows =
        (await blink?.db?.campaigns?.list?.({
          where: userId ? { userId } : undefined,
          orderBy: { createdAt: "desc" },
          limit: 100,
        })) ?? [];
      return rows.map(normalizeCampaign);
    } catch {
      return [];
    }
  },

  async create(input: {
    userId: string;
    name: string;
    description?: string;
    productId: string;
    id?: string;
  }): Promise<{ id: string; name: string }> {
    const blink = await getBlinkClient();
    if (!blink?.db?.campaigns?.create) {
      throw new Error("DB unavailable to create campaign");
    }
    const payload = {
      id: input.id ?? (globalThis.crypto?.randomUUID?.() ?? `camp_${Date.now()}`),
      userId: input.userId,
      name: input.name,
      description: input.description ?? "",
      productId: input.productId,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    const created = await blink.db.campaigns.create(payload);
    return { id: created.id ?? payload.id, name: created.name ?? payload.name };
  },

  async attachLeads(campaignId: string, leadIds: string[]): Promise<AttachResult> {
    const ids = Array.from(new Set(leadIds)).filter(Boolean);
    if (!campaignId || ids.length === 0) return { inserted: 0, skipped: 0 };

    // 1) Try server endpoints (OK if they succeed; otherwise we fall back)
    const apiOrder = [
      `/.netlify/functions/campaigns?id=${encodeURIComponent(campaignId)}`,
      `/api/campaigns/${encodeURIComponent(campaignId)}/leads`,
      `/api/campaigns/add-leads`,
      `/api/campaigns/attach`,
    ];

    for (const url of apiOrder) {
      const res = await httpJSON<AttachResult & { reason?: string; debug?: any }>(url, {
        campaignId,
        leadIds: ids,
      });
      if (res) {
        if ((res as any).reason || (res as any).debug) {
          console.log("[campaignsService.attachLeads] server response", { url, ...res });
        }
        if (Number.isFinite(res.inserted) && Number.isFinite(res.skipped)) {
          if ((res.inserted ?? 0) > 0 || (res.skipped ?? 0) > 0) return res;
          // if the server returns 0/0, continue to local DB fallback
        }
      }
    }

    // 2) Local DB fallback with FK-safe flow
    const blink = await getBlinkClient();
    const db: any = blink?.db;
    if (!db) {
      console.warn("[campaignsService.attachLeads] No local DB available.");
      return { inserted: 0, skipped: 0 };
    }

    const joinKey = findJoinKey(db);
    const leadsKey = findLeadsKey(db);

    console.log("[campaignsService.attachLeads] local discovery", { joinKey, leadsKey, allKeys: dbKeys(db) });

    // 2a) If there is a leads table, ensure the lead rows exist first (to satisfy FKs)
    if (leadsKey) {
      await ensureLeadsExist(db, leadsKey, ids);
    }

    // 2b) Prefer join table if present
    if (joinKey) {
      const { inserted, skipped } = await attachViaJoin(db, joinKey, campaignId, ids);
      if (inserted > 0 || skipped > 0) return { inserted, skipped };
    }

    // 2c) Stamp campaign field on leads table if possible
    if (leadsKey) {
      const { inserted, skipped } = await stampCampaignOnLeads(db, leadsKey, campaignId, ids);
      return { inserted, skipped };
    }

    // 2d) Nothing usable
    return { inserted: 0, skipped: 0 };
  },
};

export default campaignsService;
export { campaignsService };
