// src/services/campaigns.ts
import { blink } from '@/blink/client'

export interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  ownerId?: string
  sequence?: CampaignSequence
  createdAt?: string
  updatedAt?: string
}

export interface CampaignSequenceStep {
  type: 'email' | 'linkedin' | 'wait'
  subject?: string
  body?: string
  delayDays?: number
}

export interface CampaignSequence {
  steps: CampaignSequenceStep[]
  model?: string
}

class CampaignsService {
  async getOrCreate(name: string, ownerId?: string): Promise<Campaign> {
    const existing = await blink.db.campaigns.list({ where: { name }, limit: 1 })
    if (existing?.length) return existing[0] as Campaign

    const created = await blink.db.campaigns.create({
      name,
      status: 'draft',
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return created as Campaign
  }

  async addLeads(campaignId: string, leadIds: string[]): Promise<number> {
    if (!leadIds.length) return 0

    let added = 0
    for (const leadId of leadIds) {
      try {
        // de-dupe: if already present, skip
        const exists = await blink.db.campaignLeads.list({
          where: { campaignId, leadId },
          limit: 1,
        })
        if (exists.length) continue

        await blink.db.campaignLeads.create({
          campaignId,
          leadId,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        added++
      } catch (e) {
        // If there’s a unique constraint the create might throw; keep going
        console.warn('addLeads: skipping', leadId, e)
      }
    }
    return added
  }

  async generateAiSequence(
    campaignId: string,
    options: { steps?: number; tone?: 'casual' | 'professional' } = {},
  ): Promise<CampaignSequence> {
    const steps = options.steps ?? 4
    const tone = options.tone ?? 'professional'

    const { text } = await blink.ai.generateText({
      prompt: `Create a ${steps}-step ${tone} cold outbound sequence.
Return JSON with "steps":[{"type":"email","subject":"...","body":"..."},{"type":"wait","delayDays":2}, ...].`,
      maxTokens: 900,
    })

    // Be defensive: if parsing fails, build a sensible default
    let seq: CampaignSequence = { steps: [] }
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed?.steps)) {
        seq.steps = parsed.steps.slice(0, steps)
      }
    } catch {
      seq.steps = [
        { type: 'email', subject: 'Quick intro', body: 'Hi {{first_name}}, …' },
        { type: 'wait', delayDays: 2 },
        { type: 'email', subject: 'Following up', body: 'Hi {{first_name}}, …' },
        { type: 'wait', delayDays: 3 },
      ]
    }

    await blink.db.campaigns.update(campaignId, {
      sequence: seq,
      updatedAt: new Date().toISOString(),
    })
    return seq
  }

  async launch(campaignId: string): Promise<void> {
    await blink.db.campaigns.update(campaignId, {
      status: 'active',
      updatedAt: new Date().toISOString(),
    })
  }
}

export const campaignsService = {
  async listCampaigns() {
    // adjust to your schema; this is an example
    return await blink.db.campaigns.list({ orderBy: { createdAt: "desc" }, limit: 100 });
  },

  async addLeadsToCampaign(campaignId: string, leads: any[]) {
    // upsert leads, then attach to campaign (example schema)
    for (const l of leads) {
      await blink.db.leads.upsert({ id: l.id }, l);
      await blink.db.campaignLeads.create({ campaignId, leadId: l.id });
    }
    return { ok: true, count: leads.length };
  },
};
