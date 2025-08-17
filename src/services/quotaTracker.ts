import { createClient } from '@blinkdotnew/sdk'

const blink = createClient({
  projectId: 'spark-ai-sales-outreach-saas-platform-68hyt0cq',
  authRequired: true
})

export interface UserQuota {
  id: string
  userId: string
  planType: string
  dailyUsage: number
  monthlyUsage: number
  dailyLimit: number
  monthlyLimit: number
  lastResetDate: string
  apiCredits: number
  createdAt: string
  updatedAt: string
}

export interface ApiUsageLog {
  id: string
  userId: string
  apiProvider: string
  endpoint: string
  creditsUsed: number
  success: boolean
  errorMessage?: string
  responseTime?: number
  createdAt: string
}

export interface QuotaLimits {
  daily: number
  monthly: number
  apiCredits: number
}

// Plan configurations
export const PLAN_LIMITS: Record<string, QuotaLimits> = {
  free: {
    daily: 10,
    monthly: 300,
    apiCredits: 0
  },
  starter: {
    daily: 50,
    monthly: 1000,
    apiCredits: 0
  },
  growth: {
    daily: 200,
    monthly: 5000,
    apiCredits: 1000
  },
  pro: {
    daily: 500,
    monthly: 15000,
    apiCredits: 5000
  },
  enterprise: {
    daily: 2000,
    monthly: 50000,
    apiCredits: 20000
  }
}

export class QuotaTracker {
  private static instance: QuotaTracker
  
  static getInstance(): QuotaTracker {
    if (!QuotaTracker.instance) {
      QuotaTracker.instance = new QuotaTracker()
    }
    return QuotaTracker.instance
  }

  async getUserQuota(userId: string): Promise<UserQuota | null> {
    try {
      const quotas = await blink.db.userQuotas.list({
        where: { userId },
        limit: 1
      })
      
      if (quotas.length === 0) {
        return await this.initializeUserQuota(userId)
      }
      
      const quota = quotas[0] as UserQuota
      
      // Check if we need to reset daily usage
      const today = new Date().toISOString().split('T')[0]
      if (quota.lastResetDate !== today) {
        return await this.resetDailyUsage(quota.id, today)
      }
      
      return quota
    } catch (error) {
      console.error('Error getting user quota:', error)
      return null
    }
  }

  async initializeUserQuota(userId: string, planType: string = 'free'): Promise<UserQuota> {
    const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.free
    const today = new Date().toISOString().split('T')[0]
    
    const quota = await blink.db.userQuotas.create({
      userId,
      planType,
      dailyUsage: 0,
      monthlyUsage: 0,
      dailyLimit: limits.daily,
      monthlyLimit: limits.monthly,
      lastResetDate: today,
      apiCredits: limits.apiCredits
    })
    
    return quota as UserQuota
  }

  async resetDailyUsage(quotaId: string, today: string): Promise<UserQuota> {
    const updatedQuota = await blink.db.userQuotas.update(quotaId, {
      dailyUsage: 0,
      lastResetDate: today,
      updatedAt: new Date().toISOString()
    })
    
    return updatedQuota as UserQuota
  }

  async checkQuotaAvailable(userId: string, creditsNeeded: number = 1): Promise<{
    allowed: boolean
    reason?: string
    quota?: UserQuota
  }> {
    const quota = await this.getUserQuota(userId)
    
    if (!quota) {
      return { allowed: false, reason: 'Unable to retrieve quota information' }
    }

    // Check daily limit
    if (quota.dailyUsage + creditsNeeded > quota.dailyLimit) {
      return { 
        allowed: false, 
        reason: `Daily limit exceeded (${quota.dailyUsage}/${quota.dailyLimit})`,
        quota 
      }
    }

    // Check monthly limit
    if (quota.monthlyUsage + creditsNeeded > quota.monthlyLimit) {
      return { 
        allowed: false, 
        reason: `Monthly limit exceeded (${quota.monthlyUsage}/${quota.monthlyLimit})`,
        quota 
      }
    }

    return { allowed: true, quota }
  }

  async consumeQuota(userId: string, creditsUsed: number = 1): Promise<UserQuota | null> {
    try {
      const quota = await this.getUserQuota(userId)
      if (!quota) return null

      const updatedQuota = await blink.db.userQuotas.update(quota.id, {
        dailyUsage: quota.dailyUsage + creditsUsed,
        monthlyUsage: quota.monthlyUsage + creditsUsed,
        updatedAt: new Date().toISOString()
      })

      return updatedQuota as UserQuota
    } catch (error) {
      console.error('Error consuming quota:', error)
      return null
    }
  }

  async logApiUsage(
    userId: string,
    apiProvider: string,
    endpoint: string,
    creditsUsed: number = 1,
    success: boolean = true,
    errorMessage?: string,
    responseTime?: number
  ): Promise<void> {
    try {
      await blink.db.apiUsageLogs.create({
        userId,
        apiProvider,
        endpoint,
        creditsUsed,
        success: success ? 1 : 0,
        errorMessage,
        responseTime
      })
    } catch (error) {
      console.error('Error logging API usage:', error)
    }
  }

  async getUsageStats(userId: string, days: number = 30): Promise<{
    totalApiCalls: number
    successRate: number
    averageResponseTime: number
    usageByProvider: Record<string, number>
  }> {
    try {
      const since = new Date()
      since.setDate(since.getDate() - days)
      
      const logs = await blink.db.apiUsageLogs.list({
        where: { 
          userId,
          createdAt: { gte: since.toISOString() }
        }
      }) as ApiUsageLog[]

      const totalApiCalls = logs.length
      const successfulCalls = logs.filter(log => log.success).length
      const successRate = totalApiCalls > 0 ? (successfulCalls / totalApiCalls) * 100 : 0
      
      const responseTimes = logs
        .filter(log => log.responseTime)
        .map(log => log.responseTime!)
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0

      const usageByProvider: Record<string, number> = {}
      logs.forEach(log => {
        usageByProvider[log.apiProvider] = (usageByProvider[log.apiProvider] || 0) + log.creditsUsed
      })

      return {
        totalApiCalls,
        successRate,
        averageResponseTime,
        usageByProvider
      }
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return {
        totalApiCalls: 0,
        successRate: 0,
        averageResponseTime: 0,
        usageByProvider: {}
      }
    }
  }

  async upgradePlan(userId: string, newPlan: string): Promise<UserQuota | null> {
    try {
      const quota = await this.getUserQuota(userId)
      if (!quota) return null

      const limits = PLAN_LIMITS[newPlan] || PLAN_LIMITS.free

      const updatedQuota = await blink.db.userQuotas.update(quota.id, {
        planType: newPlan,
        dailyLimit: limits.daily,
        monthlyLimit: limits.monthly,
        apiCredits: quota.apiCredits + limits.apiCredits,
        updatedAt: new Date().toISOString()
      })

      return updatedQuota as UserQuota
    } catch (error) {
      console.error('Error upgrading plan:', error)
      return null
    }
  }

  async resetMonthlyUsage(): Promise<void> {
    try {
      // This would typically be run as a monthly cron job
      const quotas = await blink.db.userQuotas.list({})
      
      for (const quota of quotas) {
        await blink.db.userQuotas.update(quota.id, {
          monthlyUsage: 0,
          updatedAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error resetting monthly usage:', error)
    }
  }
}

export const quotaTracker = QuotaTracker.getInstance()