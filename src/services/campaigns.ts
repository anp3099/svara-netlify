// src/services/campaigns.ts
import { blink } from '@/blink/client'

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  createdAt: string
}

export interface CampaignLead {
  id: string
  campaignId: string
  leadId: string
  status: 'queued' | 'contacted' | 'replied' | 'bounced'
  createdAt: string
}

export interface SequenceStep {
  id: string
  campaignId: string
  order: number
  channel: 'email' | 'linkedin' | 'call'
  subject?: string
  body: string
  delayDays: number
}

function safeParseJSON<T = any>(txt: string, fallback: T): T {
  try { return JSON.parse(txt) as T } catch { return fallback }
}

class CampaignsService {
  // Find a campaign by name or create it
  async getOrCreate(name: string): Promise<Campaign> {
    const existing = await blink.db.campaigns.list({ where: { name }, limit: 1 })
    if (existing.length) return existing[0] as Campaign

    const created = await blink.db.campaigns.create({
      name,
      status: 'draft',
      createdAt: new Date().toISOString(),
    })
    return created as Campaign
  }

  // Add leads to the campaign (deduped)
  async addLeads(campaignId: string, leadIds: string[]): Promise<number> {
    if (!leadIds.length) return 0
    const existing = await blink.db.campaign_leads.list({
      where: { campaignId },
      limit: 10000,
    })
    const existingSet = new Set<string>(existing.map((x: any) => x.leadId))
    const toCreate = leadIds.filter((id) => !existingSet.has(id))

    for (const leadId of toCreate) {
      await blink.db.campaign_leads.create({
        campaignId,
        leadId,
        status: 'queued',
        createdAt: new Date().toISOString(),
      })
    }
    return toCreate.length
  }

  // Generate a simple AI sequence (3–4 steps) and save if none exist yet
  async generateAiSequence(
    campaignId: string,
    opts?: { tone?: string; steps?: number; product?: string }
  ): Promise<SequenceStep[]> {
    const already = await blink.db.sequence_steps.list({
      where: { campaignId },
      orderBy: { order: 'asc' },
      limit: 50,
    })
    if (already.length) return already as SequenceStep[]

    const desiredSteps = Math.min(Math.max(opts?.steps ?? 4, 2), 6)
    const prompt = `
Create a ${desiredSteps}-step outbound sequence for B2B cold outreach.
Tone: ${opts?.tone || 'friendly, concise, value-focused'}
Product/offer (if any): ${opts?.product || 'N/A'}
Channels to use: email and linkedin.
Return JSON array with fields: channel, subject (for email), body (markdown ok), delayDays (integer).
Keep messages short and specific with one clear CTA.
    `.trim()

    let plan: Array<{ channel: 'email' | 'linkedin' | 'call'; subject?: string; body: string; delayDays: number }>
    try {
      const { text } = await blink.ai.generateText({ prompt, maxTokens: 600 })
      plan = safeParseJSON(text, [])
    } catch {
      plan = []
    }

    // Fallback plan if the LLM didn’t return clean JSON
    if (!Array.isArray(plan) || plan.length === 0) {
      plan = [
        { channel: 'email', subject: 'Quick idea for you', body: 'Hi {{first_name}}, quick idea to help {{company}} …', delayDays: 0 },
        { channel: 'email', subject: 'Did you see this?', body: 'Circling back on the idea above …', delayDays: 3 },
        { channel: 'linkedin', body: 'Hi {{first_name}}, sent an email—would love your take!', delayDays: 2 },
        { channel: 'email', subject: 'Worth a chat?', body: 'If not you, who is best to speak with?', delayDays: 4 },
      ]
    }

    const saved: SequenceStep[] = []
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i]
      const row = await blink.db.sequence_steps.create({
        campaignId,
        order: i + 1,
        channel: p.channel,
        subject: p.subject || '',
        body: p.body,
        delayDays: p.delayDays ?? (i === 0 ? 0 : 2),
      })
      saved.push(row as SequenceStep)
    }
    return saved
  }

  // “Launch” the campaign (set active). Your sender/scheduler can pick this up.
  async launch(campaignId: string): Promise<void> {
    await blink.db.campaigns.update(campaignId, { status: 'active' })
  }
}

export const campaignsService = new CampaignsService()
