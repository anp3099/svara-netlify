// src/services/campaigns.ts
// Attach leads with multiple safety nets:
// 1) Try API endpoints (Netlify function etc.)
// 2) Client DB: ensure leads exist -> join attach -> stamp campaignId on leads
// 3) If no usable tables, attach onto the campaign row itself (attachedLeadIds | leadIds | leads)
// 4) Absolute last resort: localStorage persistence
//
// No hard import of "@/lib/blink" (lazy-resolves or uses global).

export type AttachResult = { inserted: number; skipped: number };

type CampaignRow = { id: string; name: string; status?: string; createdAt?: string };

let _blink: any | null = null;
async function getBlinkClient(): Promise<any | null> {
  if (_blink !== null) return _blink;
  try {
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

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

const keysOf = (obj: any) => Object.keys(obj || {});

/* ----------------------- client DB discovery + helpers ---------------------- */

function findJoinKey(db: any): string | null {
  const keys = keysOf(db);
  const preferred = [
    "campaignsLeads",
    "campaign_leads",
    "campaigns_leads",
    "campaignLead",
    "leadCampaign",
  ];
  for (const k of preferred) if (typeof db?.[k]?.create === "function") return k;

  return (
    keys.find(
      (k) =>
        /campaign/i.test(k) &&
        /lead/i.test(k) &&
        typeof db?.[k]?.create === "function",
    ) ?? null
  );
}

function findLeadsKey(db: any): string | null {
  const keys = keysOf(db);
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

async function ensureLeadsExist(db: any, leadsKey: string, ids: string[]) {
  const t = db?.[leadsKey];
  if (!t) return;

  let userId: string | undefined;
  try {
    const blink = await getBlinkClient();
    userId = await blink?.auth?.me?.().then((m: any) => m?.id).catch(() => undefined);
  } catch {}

  for (const id of ids) {
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

/* ------------- last-ditch: attach IDs onto the campaign row itself ---------- */

async function attachOnCampaignRow(db: any, campaignId: string, ids: string[]) {
  const ctbl = db?.campaigns;
  if (!ctbl) return { inserted: 0, skipped: 0, tried: false };

  const fields = ["attachedLeadIds", "leadIds", "leads"];
  for (const field of fields) {
    try {
      // Read existing if possible (best-effort)
      let existing: string[] = [];
      try {
        if (typeof ctbl.get === "function") {
          const cur = await ctbl.get(campaignId);
          const arr = cur?.[field];
          if (Array.isArray(arr)) existing = arr.filter(Boolean);
        }
      } catch {}

      const before = new Set(existing);
      const merged = Array.from(new Set([...existing, ...ids]));
      const patch: any = { [field]: merged };

      if (typeof ctbl.update === "function") { await ctbl.update(campaignId, patch); }
      else if (typeof ctbl.patch === "function") { await ctbl.patch(campaignId, patch); }
      else if (typeof ctbl.upsert === "function") {
        await ctbl.upsert({ where: { id: campaignId }, update: patch, create: { id: campaignId, ...patch } });
      } else {
        continue; // try next field
      }

      const inserted = merged.length - before.size;
      const skipped = ids.length - inserted;
      return { inserted, skipped, tried: true };
    } catch (e) {
      // try next field name
      continue;
    }
  }
  return { inserted: 0, skipped: 0, tried: true };
}

/* ------------------------- ultimate: localStorage map ------------------------ */

function attachInLocalStorage(campaignId: string, ids: string[]) {
  try {
    const k = `sv:camp:${campaignId}`;
    const cur = JSON.parse(localStorage.getItem(k) || "[]") as string[];
    const before = new Set(cur);
    const merged = Array.from(new Set([...cur, ...ids]));
    localStorage.setItem(k, JSON.stringify(merged));
    const inserted = merged.length - before.size;
    const skipped = ids.length - inserted;
    console.warn("[campaignsService.attachLeads] Using localStorage fallback", { campaignId, inserted, skipped });
    return { inserted, skipped };
  } catch {
    return { inserted: 0, skipped: 0 };
  }
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
    // (If you need it, you can also patch an empty attachedLeadIds: [] here.)
  },

  async attachLeads(campaignId: string, leadIds: string[]): Promise<AttachResult> {
    const ids = Array.from(new Set(leadIds)).filter(Boolean);
    if (!campaignId || ids.length === 0) return { inserted: 0, skipped: 0 };

    // 1) Server endpoints (Netlify function + fallbacks)
    const apiOrder = [
      `/.netlify/functions/campaigns?id=${encodeURIComponent(campaignId)}`,
      `/api/campaigns/${encodeURIComponent(campaignId)}/leads`,
      `/api/campaigns/add-leads`,
      `/api/campaigns/attach`,
    ];
    for (const url of apiOrder) {
      const res = await httpJSON<AttachResult & { reason?: string; debug?: any }>(url, { campaignId, leadIds: ids });
      if (res) {
        if ((res as any).reason || (res as any).debug) {
          console.log("[campaignsService.attachLeads] server response", { url, ...res });
        }
        if (Number.isFinite(res.inserted) && Number.isFinite(res.skipped)) {
          if ((res.inserted ?? 0) > 0 || (res.skipped ?? 0) > 0) return res;
        }
      }
    }

    // 2) Client DB attach flow
    const blink = await getBlinkClient();
    const db: any = blink?.db;
    if (!db) {
      console.warn("[campaignsService.attachLeads] No local DB object found.");
      return attachInLocalStorage(campaignId, ids);
    }

    const allKeys = keysOf(db);
    const joinKey = findJoinKey(db);
    const leadsKey = findLeadsKey(db);
    console.log("[campaignsService.attachLeads] local discovery", { joinKey, leadsKey, allKeys });

    if (leadsKey) await ensureLeadsExist(db, leadsKey, ids);

    if (joinKey) {
      const { inserted, skipped } = await attachViaJoin(db, joinKey, campaignId, ids);
      if (inserted > 0 || skipped > 0) return { inserted, skipped };
    }

    if (leadsKey) {
      const { inserted, skipped } = await stampCampaignOnLeads(db, leadsKey, campaignId, ids);
      if (inserted > 0 || skipped > 0) return { inserted, skipped };
    }

    // 3) Attach on the campaign row itself
    try {
      const r = await attachOnCampaignRow(db, campaignId, ids);
      if (r.tried && (r.inserted > 0 || r.skipped > 0)) return { inserted: r.inserted, skipped: r.skipped };
    } catch {}

    // 4) Last resort: localStorage
    return attachInLocalStorage(campaignId, ids);
  },
};

export default campaignsService;
export { campaignsService };
