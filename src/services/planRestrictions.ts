import { createClient } from '@blinkdotnew/sdk'

const blink = createClient({
  projectId: 'spark-ai-sales-outreach-saas-platform-68hyt0cq',
  authRequired: true
})

export interface PlanLimits {
  campaigns: number
  leads: number
  sequences: number
  emails: number
  features: string[]
}

export const PLAN_RESTRICTIONS: Record<string, PlanLimits> = {
  starter: {
    campaigns: 50,
    leads: 10000,
    sequences: 100,
    emails: 25000,
    features: ['email', 'sms', 'basic_analytics']
  },
  professional: {
    campaigns: 200,
    leads: 50000,
    sequences: -1, // unlimited
    emails: 100000,
    features: ['email', 'sms', 'linkedin', 'advanced_analytics', 'white_label']
  },
  enterprise: {
    campaigns: -1, // unlimited
    leads: 70000000, // 70M+ database
    sequences: -1, // unlimited
    emails: -1, // unlimited
    features: ['all']
  }
}

export interface UsageStats {
  campaigns: number
  leads: number
  sequences: number
  emails: number
}

export class PlanRestrictionService {
  private static instance: PlanRestrictionService
  
  static getInstance(): PlanRestrictionService {
    if (!PlanRestrictionService.instance) {
      PlanRestrictionService.instance = new PlanRestrictionService()
    }
    return PlanRestrictionService.instance
  }

  async getUserPlan(userId: string): Promise<string> {
    try {
      const user = await blink.db.users.list({
        where: { id: userId },
        limit: 1
      })
      
      return user[0]?.planType || 'starter'
    } catch (error) {
      console.error('Error getting user plan:', error)
      return 'starter'
    }
  }

  async getCurrentUsage(userId: string): Promise<UsageStats> {
    try {
      const [campaigns, sequences] = await Promise.all([
        blink.db.campaigns.list({ where: { userId } }),
        blink.db.aiSequences.list({ 
          where: { 
            campaignId: { in: (await blink.db.campaigns.list({ where: { userId } })).map(c => c.id) }
          }
        })
      ])

      // For leads and emails, we'll use approximations based on campaigns
      const estimatedLeads = campaigns.reduce((sum, campaign) => sum + (campaign.totalLeads || 0), 0)
      const estimatedEmails = campaigns.reduce((sum, campaign) => sum + (campaign.contactedLeads || 0), 0)

      return {
        campaigns: campaigns.length,
        leads: estimatedLeads,
        sequences: sequences.length,
        emails: estimatedEmails
      }
    } catch (error) {
      console.error('Error getting current usage:', error)
      return { campaigns: 0, leads: 0, sequences: 0, emails: 0 }
    }
  }

  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    try {
      const plan = await this.getUserPlan(userId)
      const limits = PLAN_RESTRICTIONS[plan]
      
      if (!limits) return false
      
      return limits.features.includes('all') || limits.features.includes(feature)
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  async enforcePlanRestrictions(userId: string, action: 'campaign' | 'lead' | 'sequence' | 'email', count: number = 1): Promise<{
    allowed: boolean
    reason?: string
    currentUsage?: number
    limit?: number
  }> {
    try {
      const plan = await this.getUserPlan(userId)
      const limits = PLAN_RESTRICTIONS[plan]
      const usage = await this.getCurrentUsage(userId)
      
      if (!limits) {
        return { allowed: false, reason: 'Invalid plan' }
      }

      const currentUsage = usage[action]
      const limit = limits[action]
      
      // -1 means unlimited
      if (limit === -1) {
        return { allowed: true }
      }
      
      if (currentUsage + count > limit) {
        return {
          allowed: false,
          reason: `${action} limit exceeded. Current: ${currentUsage}, Limit: ${limit}`,
          currentUsage,
          limit
        }
      }
      
      return { allowed: true, currentUsage, limit }
    } catch (error) {
      console.error('Error enforcing plan restrictions:', error)
      return { allowed: false, reason: 'Error checking restrictions' }
    }
  }

  async getUpgradeMessage(userId: string, feature: string): Promise<string> {
    const plan = await this.getUserPlan(userId)
    
    const upgradeMessages: Record<string, string> = {
      starter: "Upgrade to Professional ($297/month) to unlock this feature and get 50,000 leads, unlimited sequences, and LinkedIn integration.",
      professional: "Upgrade to Enterprise ($797/month) to unlock unlimited access to all features and our complete 70M+ leads database.",
      enterprise: "You have access to all features. Contact support if you're experiencing issues."
    }
    
    return upgradeMessages[plan] || upgradeMessages.starter
  }

  getPlanLimits(plan: string): PlanLimits | null {
    return PLAN_RESTRICTIONS[plan] || null
  }

  async canCreateCampaign(userId: string): Promise<{ allowed: boolean; message?: string }> {
    const result = await this.enforcePlanRestrictions(userId, 'campaign')
    
    if (!result.allowed) {
      const upgradeMessage = await this.getUpgradeMessage(userId, 'campaigns')
      return {
        allowed: false,
        message: `Campaign limit reached (${result.currentUsage}/${result.limit}). ${upgradeMessage}`
      }
    }
    
    return { allowed: true }
  }

  async canAccessLeads(userId: string, requestedCount: number): Promise<{ allowed: boolean; message?: string }> {
    const result = await this.enforcePlanRestrictions(userId, 'lead', requestedCount)
    
    if (!result.allowed) {
      const upgradeMessage = await this.getUpgradeMessage(userId, 'leads')
      return {
        allowed: false,
        message: `Lead access limit reached (${result.currentUsage}/${result.limit}). ${upgradeMessage}`
      }
    }
    
    return { allowed: true }
  }

  async canCreateSequence(userId: string): Promise<{ allowed: boolean; message?: string }> {
    const result = await this.enforcePlanRestrictions(userId, 'sequence')
    
    if (!result.allowed) {
      const upgradeMessage = await this.getUpgradeMessage(userId, 'sequences')
      return {
        allowed: false,
        message: `Sequence limit reached (${result.currentUsage}/${result.limit}). ${upgradeMessage}`
      }
    }
    
    return { allowed: true }
  }

  async canSendEmails(userId: string, emailCount: number): Promise<{ allowed: boolean; message?: string }> {
    const result = await this.enforcePlanRestrictions(userId, 'email', emailCount)
    
    if (!result.allowed) {
      const upgradeMessage = await this.getUpgradeMessage(userId, 'emails')
      return {
        allowed: false,
        message: `Email limit reached (${result.currentUsage}/${result.limit}). ${upgradeMessage}`
      }
    }
    
    return { allowed: true }
  }
}

export const planRestrictionService = PlanRestrictionService.getInstance()