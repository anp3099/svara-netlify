// API Rate Limiting and Credit Tracking Service
import { blink } from '../blink/client';

export interface RateLimitConfig {
  provider: string;
  endpoint: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  creditsPerRequest: number;
  burstLimit: number;
  cooldownPeriod: number; // seconds
}

export interface UsageRecord {
  id: string;
  userId: string;
  provider: string;
  endpoint: string;
  timestamp: Date;
  creditsUsed: number;
  success: boolean;
  responseTime: number;
  errorMessage?: string;
}

export interface UserQuota {
  userId: string;
  planType: string;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsage: number;
  monthlyUsage: number;
  apiCredits: number;
  lastResetDate: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date;
  retryAfter?: number;
  creditsRequired: number;
  creditsRemaining: number;
}

export class APIRateLimitingService {
  private static instance: APIRateLimitingService;
  private requestCounts: Map<string, { count: number; resetTime: Date }> = new Map();
  
  // Rate limit configurations for different providers
  private rateLimitConfigs: RateLimitConfig[] = [
    {
      provider: 'hubspot',
      endpoint: 'contacts',
      requestsPerMinute: 100,
      requestsPerHour: 40000,
      requestsPerDay: 1000000,
      creditsPerRequest: 1,
      burstLimit: 10,
      cooldownPeriod: 60
    },
    {
      provider: 'hubspot',
      endpoint: 'companies',
      requestsPerMinute: 100,
      requestsPerHour: 40000,
      requestsPerDay: 1000000,
      creditsPerRequest: 1,
      burstLimit: 10,
      cooldownPeriod: 60
    },
    {
      provider: 'salesforce',
      endpoint: 'leads',
      requestsPerMinute: 20,
      requestsPerHour: 1000,
      requestsPerDay: 15000,
      creditsPerRequest: 2,
      burstLimit: 5,
      cooldownPeriod: 300
    },
    {
      provider: 'salesforce',
      endpoint: 'accounts',
      requestsPerMinute: 20,
      requestsPerHour: 1000,
      requestsPerDay: 15000,
      creditsPerRequest: 2,
      burstLimit: 5,
      cooldownPeriod: 300
    },
    {
      provider: 'pipedrive',
      endpoint: 'persons',
      requestsPerMinute: 60,
      requestsPerHour: 3600,
      requestsPerDay: 86400,
      creditsPerRequest: 1,
      burstLimit: 10,
      cooldownPeriod: 60
    },
    {
      provider: 'pipedrive',
      endpoint: 'organizations',
      requestsPerMinute: 60,
      requestsPerHour: 3600,
      requestsPerDay: 86400,
      creditsPerRequest: 1,
      burstLimit: 10,
      cooldownPeriod: 60
    },
    {
      provider: 'google_maps',
      endpoint: 'places',
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      creditsPerRequest: 3,
      burstLimit: 5,
      cooldownPeriod: 60
    },
    {
      provider: 'hunter',
      endpoint: 'email_finder',
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      creditsPerRequest: 5,
      burstLimit: 3,
      cooldownPeriod: 300
    },
    {
      provider: 'people_data_labs',
      endpoint: 'person_enrichment',
      requestsPerMinute: 30,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      creditsPerRequest: 4,
      burstLimit: 5,
      cooldownPeriod: 120
    }
  ];

  static getInstance(): APIRateLimitingService {
    if (!APIRateLimitingService.instance) {
      APIRateLimitingService.instance = new APIRateLimitingService();
    }
    return APIRateLimitingService.instance;
  }

  /**
   * Check if a request is allowed based on rate limits and user quotas
   */
  async checkRateLimit(
    userId: string, 
    provider: string, 
    endpoint: string
  ): Promise<RateLimitResult> {
    try {
      // Get rate limit configuration
      const config = this.getRateLimitConfig(provider, endpoint);
      if (!config) {
        throw new Error(`No rate limit configuration found for ${provider}:${endpoint}`);
      }

      // Get user quota information
      const userQuota = await this.getUserQuota(userId);
      
      // Check user's credit balance
      if (userQuota.apiCredits < config.creditsPerRequest) {
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: new Date(),
          creditsRequired: config.creditsPerRequest,
          creditsRemaining: userQuota.apiCredits,
          retryAfter: undefined
        };
      }

      // Check daily and monthly limits
      if (userQuota.dailyUsage >= userQuota.dailyLimit || 
          userQuota.monthlyUsage >= userQuota.monthlyLimit) {
        const resetTime = this.getNextResetTime(userQuota.lastResetDate);
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime,
          creditsRequired: config.creditsPerRequest,
          creditsRemaining: userQuota.apiCredits,
          retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000)
        };
      }

      // Check provider-specific rate limits
      const rateLimitKey = `${userId}:${provider}:${endpoint}`;
      const now = new Date();
      
      // Check minute-based rate limit
      const minuteKey = `${rateLimitKey}:${Math.floor(now.getTime() / 60000)}`;
      const minuteCount = this.getRequestCount(minuteKey);
      
      if (minuteCount >= config.requestsPerMinute) {
        const resetTime = new Date(Math.ceil(now.getTime() / 60000) * 60000);
        return {
          allowed: false,
          remainingRequests: Math.max(0, config.requestsPerMinute - minuteCount),
          resetTime,
          creditsRequired: config.creditsPerRequest,
          creditsRemaining: userQuota.apiCredits,
          retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
        };
      }

      // Check hour-based rate limit
      const hourKey = `${rateLimitKey}:${Math.floor(now.getTime() / 3600000)}`;
      const hourCount = this.getRequestCount(hourKey);
      
      if (hourCount >= config.requestsPerHour) {
        const resetTime = new Date(Math.ceil(now.getTime() / 3600000) * 3600000);
        return {
          allowed: false,
          remainingRequests: Math.max(0, config.requestsPerHour - hourCount),
          resetTime,
          creditsRequired: config.creditsPerRequest,
          creditsRemaining: userQuota.apiCredits,
          retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
        };
      }

      // Check day-based rate limit
      const dayKey = `${rateLimitKey}:${Math.floor(now.getTime() / 86400000)}`;
      const dayCount = this.getRequestCount(dayKey);
      
      if (dayCount >= config.requestsPerDay) {
        const resetTime = new Date(Math.ceil(now.getTime() / 86400000) * 86400000);
        return {
          allowed: false,
          remainingRequests: Math.max(0, config.requestsPerDay - dayCount),
          resetTime,
          creditsRequired: config.creditsPerRequest,
          creditsRemaining: userQuota.apiCredits,
          retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
        };
      }

      // Request is allowed
      return {
        allowed: true,
        remainingRequests: Math.min(
          config.requestsPerMinute - minuteCount,
          config.requestsPerHour - hourCount,
          config.requestsPerDay - dayCount,
          userQuota.dailyLimit - userQuota.dailyUsage,
          userQuota.monthlyLimit - userQuota.monthlyUsage
        ),
        resetTime: new Date(Math.ceil(now.getTime() / 60000) * 60000),
        creditsRequired: config.creditsPerRequest,
        creditsRemaining: userQuota.apiCredits
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      throw error;
    }
  }

  /**
   * Record API usage and consume credits
   */
  async recordUsage(
    userId: string,
    provider: string,
    endpoint: string,
    success: boolean,
    responseTime: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const config = this.getRateLimitConfig(provider, endpoint);
      if (!config) {
        throw new Error(`No rate limit configuration found for ${provider}:${endpoint}`);
      }

      const now = new Date();
      const creditsUsed = success ? config.creditsPerRequest : 0;

      // Record usage in database
      await blink.db.apiUsageLogs.create({
        id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        apiProvider: provider,
        endpoint,
        creditsUsed,
        success: success ? 1 : 0,
        errorMessage,
        responseTime,
        createdAt: now.toISOString()
      });

      // Update request counts in memory
      const rateLimitKey = `${userId}:${provider}:${endpoint}`;
      const minuteKey = `${rateLimitKey}:${Math.floor(now.getTime() / 60000)}`;
      const hourKey = `${rateLimitKey}:${Math.floor(now.getTime() / 3600000)}`;
      const dayKey = `${rateLimitKey}:${Math.floor(now.getTime() / 86400000)}`;

      this.incrementRequestCount(minuteKey, new Date(Math.ceil(now.getTime() / 60000) * 60000));
      this.incrementRequestCount(hourKey, new Date(Math.ceil(now.getTime() / 3600000) * 3600000));
      this.incrementRequestCount(dayKey, new Date(Math.ceil(now.getTime() / 86400000) * 86400000));

      // Update user quota
      if (success) {
        await this.updateUserQuota(userId, creditsUsed);
      }
    } catch (error) {
      console.error('Error recording usage:', error);
      throw error;
    }
  }

  /**
   * Get user's current quota information
   */
  async getUserQuota(userId: string): Promise<UserQuota> {
    try {
      const quotas = await blink.db.userQuotas.list({
        where: { userId },
        limit: 1
      });

      if (quotas.length === 0) {
        // Create default quota for new user
        const defaultQuota = await this.createDefaultQuota(userId);
        return defaultQuota;
      }

      const quota = quotas[0];
      
      // Check if daily reset is needed
      const lastReset = new Date(quota.lastResetDate);
      const now = new Date();
      
      if (this.shouldResetDaily(lastReset, now)) {
        await this.resetDailyUsage(userId);
        quota.dailyUsage = 0;
        quota.lastResetDate = now.toISOString().split('T')[0];
      }

      return {
        userId: quota.userId,
        planType: quota.planType,
        dailyLimit: quota.dailyLimit,
        monthlyLimit: quota.monthlyLimit,
        dailyUsage: quota.dailyUsage,
        monthlyUsage: quota.monthlyUsage,
        apiCredits: quota.apiCredits,
        lastResetDate: new Date(quota.lastResetDate)
      };
    } catch (error) {
      console.error('Error getting user quota:', error);
      throw error;
    }
  }

  /**
   * Update user quota after API usage
   */
  async updateUserQuota(userId: string, creditsUsed: number): Promise<void> {
    try {
      const quota = await this.getUserQuota(userId);
      
      await blink.db.userQuotas.update(quota.userId, {
        dailyUsage: quota.dailyUsage + creditsUsed,
        monthlyUsage: quota.monthlyUsage + creditsUsed,
        apiCredits: Math.max(0, quota.apiCredits - creditsUsed),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user quota:', error);
      throw error;
    }
  }

  /**
   * Add credits to user's account
   */
  async addCredits(userId: string, credits: number, reason: string): Promise<void> {
    try {
      const quota = await this.getUserQuota(userId);
      
      await blink.db.userQuotas.update(quota.userId, {
        apiCredits: quota.apiCredits + credits,
        updatedAt: new Date().toISOString()
      });

      // Log credit addition
      await blink.db.analyticsEvents.create({
        id: `credit_add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        eventType: 'credits_added',
        eventData: JSON.stringify({
          credits,
          reason,
          newBalance: quota.apiCredits + credits,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error adding credits:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(userId: string, days: number = 30): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    creditsUsed: number;
    averageResponseTime: number;
    topProviders: Array<{ provider: string; requests: number; credits: number }>;
    dailyUsage: Array<{ date: string; requests: number; credits: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usageLogs = await blink.db.apiUsageLogs.list({
        where: { userId },
        limit: 10000
      });

      // Filter logs within the date range
      const filteredLogs = usageLogs.filter(log => 
        new Date(log.createdAt) >= startDate
      );

      const totalRequests = filteredLogs.length;
      const successfulRequests = filteredLogs.filter(log => Number(log.success) > 0).length;
      const failedRequests = totalRequests - successfulRequests;
      const creditsUsed = filteredLogs.reduce((sum, log) => sum + log.creditsUsed, 0);
      const averageResponseTime = filteredLogs.length > 0 
        ? filteredLogs.reduce((sum, log) => sum + log.responseTime, 0) / filteredLogs.length 
        : 0;

      // Calculate top providers
      const providerStats = new Map<string, { requests: number; credits: number }>();
      filteredLogs.forEach(log => {
        const current = providerStats.get(log.apiProvider) || { requests: 0, credits: 0 };
        providerStats.set(log.apiProvider, {
          requests: current.requests + 1,
          credits: current.credits + log.creditsUsed
        });
      });

      const topProviders = Array.from(providerStats.entries())
        .map(([provider, stats]) => ({ provider, ...stats }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      // Calculate daily usage
      const dailyStats = new Map<string, { requests: number; credits: number }>();
      filteredLogs.forEach(log => {
        const date = new Date(log.createdAt).toISOString().split('T')[0];
        const current = dailyStats.get(date) || { requests: 0, credits: 0 };
        dailyStats.set(date, {
          requests: current.requests + 1,
          credits: current.credits + log.creditsUsed
        });
      });

      const dailyUsage = Array.from(dailyStats.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        creditsUsed,
        averageResponseTime,
        topProviders,
        dailyUsage
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private getRateLimitConfig(provider: string, endpoint: string): RateLimitConfig | undefined {
    return this.rateLimitConfigs.find(config => 
      config.provider === provider && config.endpoint === endpoint
    );
  }

  private getRequestCount(key: string): number {
    const record = this.requestCounts.get(key);
    if (!record || record.resetTime <= new Date()) {
      return 0;
    }
    return record.count;
  }

  private incrementRequestCount(key: string, resetTime: Date): void {
    const current = this.getRequestCount(key);
    this.requestCounts.set(key, {
      count: current + 1,
      resetTime
    });
  }

  private async createDefaultQuota(userId: string): Promise<UserQuota> {
    const now = new Date();
    const defaultQuota = {
      id: `quota_${userId}`,
      userId,
      planType: 'starter',
      dailyUsage: 0,
      monthlyUsage: 0,
      dailyLimit: 100,
      monthlyLimit: 3000,
      apiCredits: 1000,
      lastResetDate: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await blink.db.userQuotas.create(defaultQuota);

    return {
      userId: defaultQuota.userId,
      planType: defaultQuota.planType,
      dailyLimit: defaultQuota.dailyLimit,
      monthlyLimit: defaultQuota.monthlyLimit,
      dailyUsage: defaultQuota.dailyUsage,
      monthlyUsage: defaultQuota.monthlyUsage,
      apiCredits: defaultQuota.apiCredits,
      lastResetDate: new Date(defaultQuota.lastResetDate)
    };
  }

  private shouldResetDaily(lastReset: Date, now: Date): boolean {
    return lastReset.toDateString() !== now.toDateString();
  }

  private async resetDailyUsage(userId: string): Promise<void> {
    const now = new Date();
    await blink.db.userQuotas.update(userId, {
      dailyUsage: 0,
      lastResetDate: now.toISOString().split('T')[0],
      updatedAt: now.toISOString()
    });
  }

  private getNextResetTime(lastResetDate: Date): Date {
    const nextReset = new Date(lastResetDate);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);
    return nextReset;
  }

  /**
   * Clean up expired request counts from memory
   */
  private cleanupExpiredCounts(): void {
    const now = new Date();
    for (const [key, record] of this.requestCounts.entries()) {
      if (record.resetTime <= now) {
        this.requestCounts.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup of expired counts
   */
  startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredCounts();
    }, 60000); // Clean up every minute
  }
}

// Export singleton instance
export const apiRateLimitingService = APIRateLimitingService.getInstance();

// Start cleanup timer when service is imported
apiRateLimitingService.startCleanupTimer();