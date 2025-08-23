import type { NextApiRequest, NextApiResponse } from "next";

// Try both common exports; keep the one your app has.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { blink as blinkClient } from "@/blink/client";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import blinkDefault from "@/lib/blink";

const blink: any = (blinkClient ?? blinkDefault);

const isDup = (e: any) =>
  /duplicate|unique|constraint|already exists/i.test(String(e?.message ?? e ?? ""));

type AttachResult = { inserted: number; skipped: number };

function findTable(db: any, pattern: RegExp, needs: Array<"create"|"update"|"upsert"|"patch">) {
  const keys = Object.keys(db || {});
  for (const k of keys) {
    if (!pattern.test(k)) continue;
    const t = db[k];
    if (needs.some((m) => typeof t?.[m] === "function")) return { key: k, table: t };
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const campaignId = String(req.query.id || "");
    const leadIds = Array.isArray(req.body?.leadIds) ? req.body.leadIds.filter(Boolean) : [];
    if (!campaignId || leadIds.length === 0)
      return res.status(400).json({ error: "campaignId (path) and leadIds[] (body) required" });

    const db: any = blink?.db;
    if (!db) return res.status(500).json({ error: "DB unavailable on server" });

    // 1) Find join + leads tables
    const joinHit =
      findTable(db, /campaign.*lead|lead.*campaign|^campaign[_]?leads?$/i, ["create", "upsert"]);
    const leadsHit =
      findTable(db, /^leads?$|prospect|contact|people|persons|records/i, ["create", "update", "upsert", "patch"]);

    // 2) Ensure leads exist (FK-safe). Minimal upsert/create by id.
    if (leadsHit) {
      const me = await blink.auth?.me?.().catch(() => null);
      for (const lid of Array.from(new Set(leadIds))) {
        const shapes = [
          { id: lid, userId: me?.id },
          { id: lid, user_id: me?.id },
          { id: lid }, // minimal
        ];
        let ok = false;
        for (const s of shapes) {
          try {
            if (typeof leadsHit.table.upsert === "function") {
              await leadsHit.table.upsert({ where: { id: lid }, update: {}, create: s });
              ok = true; break;
            }
            if (typeof leadsHit.table.create === "function") {
              await leadsHit.table.create(s);
              ok = true; break;
            }
          } catch (e) {
            if (isDup(e)) { ok = true; break; }
          }
        }
      }
    }

    // 3) Insert into the join table if present
    let inserted = 0, skipped = 0;

    if (joinHit) {
      const join = joinHit.table;
      const tryJoinInsert = async (lid: string): Promise<"ok"|"dup"|"fail"> => {
        const shapes = [
          { campaignId, leadId: lid },
          { campaign_id: campaignId, lead_id: lid },
          { campaign: campaignId, lead: lid },
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

      for (const lid of Array.from(new Set(leadIds))) {
        const r = await tryJoinInsert(lid);
        if (r === "ok") inserted++;
        else if (r === "dup") skipped++;
      }

      return res.status(200).json({ inserted, skipped } as AttachResult);
    }

    // 4) No join table: last resort — set campaignId on the lead rows directly
    if (leadsHit) {
      for (const lid of Array.from(new Set(leadIds))) {
        try {
          if (typeof leadsHit.table.update === "function") {
            await leadsHit.table.update(lid, { campaignId });
          } else if (typeof leadsHit.table.patch === "function") {
            await leadsHit.table.patch(lid, { campaignId });
          } else if (typeof leadsHit.table.upsert === "function") {
            await leadsHit.table.upsert({ where: { id: lid }, update: { campaignId }, create: { id: lid, campaignId } });
          } else {
            throw new Error("No update* method on leads table");
          }
          inserted++;
        } catch (e) {
          if (isDup(e)) skipped++;
        }
      }
      return res.status(200).json({ inserted, skipped } as AttachResult);
    }

    // 5) Truly nothing to write to
    return res.status(500).json({ error: "Join table and leads table not found" });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
