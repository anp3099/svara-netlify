import type { NextApiRequest, NextApiResponse } from "next";

// ---- Get a server-side Blink handle (tries both common locations) ----
function getBlink(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@/lib/blink");
    return mod.default ?? mod.blink ?? mod;
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@/blink/client");
    return mod.blink ?? mod.default ?? mod;
  } catch {}
  return (globalThis as any).blink ?? null;
}

type AttachResult = { inserted: number; skipped: number };
const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

function findTable(
  db: any,
  pattern: RegExp,
  needs: Array<"create" | "update" | "upsert" | "patch">
) {
  const keys = Object.keys(db || {});
  for (const k of keys) {
    if (!pattern.test(k)) continue;
    const t = db[k];
    if (needs.some((m) => typeof t?.[m] === "function")) return t;
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const campaignId = String(req.query.id || "");
  const leadIds = Array.isArray(req.body?.leadIds) ? req.body.leadIds.filter(Boolean) : [];
  if (!campaignId || !leadIds.length) {
    return res
      .status(400)
      .json({ error: "campaignId (path) and leadIds[] (body) required" });
  }

  const blink = getBlink();
  const db: any = blink?.db;
  if (!db) return res.status(500).json({ error: "DB unavailable on server" });

  // Find join table and leads table
  const join = findTable(db, /campaign.*lead|lead.*campaign|^campaign[_]?leads?$/i, [
    "create",
    "upsert",
  ]);
  const leadsTbl = findTable(
    db,
    /^leads?$|prospect|contact|people|persons|records/i,
    ["create", "update", "upsert", "patch"]
  );

  // Ensure leads exist to satisfy FKs
  if (leadsTbl) {
    const me = await blink.auth?.me?.().catch(() => null);
    for (const id of Array.from(new Set(leadIds))) {
      const shapes = [{ id, userId: me?.id }, { id, user_id: me?.id }, { id }];
      for (const s of shapes) {
        try {
          if (typeof leadsTbl.upsert === "function") {
            await leadsTbl.upsert({ where: { id }, update: {}, create: s });
            break;
          }
          if (typeof leadsTbl.create === "function") {
            await leadsTbl.create(s);
            break;
          }
        } catch (e) {
          if (isDup(e)) break;
        }
      }
    }
  }

  // Try join table first
  let inserted = 0,
    skipped = 0;

  if (join) {
    const tryJoin = async (leadId: string): Promise<"ok" | "dup" | "fail"> => {
      const shapes = [
        { campaignId, leadId },
        { campaign_id: campaignId, lead_id: leadId },
        { campaign: campaignId, lead: leadId },
      ];
      for (const s of shapes) {
        try {
          await join.create(s);
          return "ok";
        } catch (e) {
          if (isDup(e)) return "dup";
        }
      }
      if (typeof join.upsert === "function") {
        try {
          await join.upsert({
            where: { campaignId_leadId: { campaignId, leadId } },
            update: {},
            create: { campaignId, leadId },
          });
          return "ok";
        } catch (e) {
          if (isDup(e)) return "dup";
        }
      }
      return "fail";
    };

    for (const id of Array.from(new Set(leadIds))) {
      const r = await tryJoin(id);
      if (r === "ok") inserted++;
      else if (r === "dup") skipped++;
    }
    return res.status(200).json({ inserted, skipped } as AttachResult);
  }

  // No join table → last resort: stamp campaignId on leads
  if (leadsTbl) {
    for (const id of Array.from(new Set(leadIds))) {
      try {
        if (typeof leadsTbl.update === "function") await leadsTbl.update(id, { campaignId });
        else if (typeof leadsTbl.patch === "function") await leadsTbl.patch(id, { campaignId });
        else if (typeof leadsTbl.upsert === "function")
          await leadsTbl.upsert({
            where: { id },
            update: { campaignId },
            create: { id, campaignId },
          });
        inserted++;
      } catch (e) {
        if (isDup(e)) skipped++;
      }
    }
    return res.status(200).json({ inserted, skipped } as AttachResult);
  }

  return res
    .status(500)
    .json({ error: "Join table and leads table not found" });
}
