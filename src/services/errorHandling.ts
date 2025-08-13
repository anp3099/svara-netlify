import { blink } from '../blink/client'

export interface ErrorContext {
  userId: string
  operation: string
  provider?: string
  connectionId?: string
  recordId?: string
  metadata?: Record<string, any>
}

export interface ErrorLog {
  id: string
  userId: string
  operation: string
  provider?: string
  connectionId?: string
  recordId?: string
  errorType: ErrorType
  errorCode?: string
  message: string
  stack?: string
  context: Record<string, any>
  severity: ErrorSeverity
  retryable: boolean
  retryCount: number
  maxRetries: number
  nextRetryAt?: Date
  resolvedAt?: Date
  resolution?: string
  createdAt: Date
  updatedAt: Date
}

export type ErrorType = 
  | 'api_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'rate_limit_error'
  | 'validation_error'
  | 'network_error'
  | 'timeout_error'
  | 'data_conflict_error'
  | 'mapping_error'
  | 'webhook_error'
  | 'sync_error'
  | 'unknown_error'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  jitter: boolean
}

export interface ErrorHandlingConfig {
  enableLogging: boolean
  enableRetries: boolean
  enableNotifications: boolean
  retryConfig: RetryConfig
  notificationThresholds: {
    errorCount: number
    timeWindow: number // minutes
  }
}

class ErrorHandlingService {
  private defaultConfig: ErrorHandlingConfig = {
    enableLogging: true,
    enableRetries: true,
    enableNotifications: true,
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true
    },
    notificationThresholds: {
      errorCount: 5,
      timeWindow: 60
    }
  }

  async handleError(
    error: Error | any,
    context: ErrorContext,
    config?: Partial<ErrorHandlingConfig>
  ): Promise<ErrorLog> {
    const finalConfig = { ...this.defaultConfig, ...config }
    
    const errorLog = await this.createErrorLog(error, context)
    
    if (finalConfig.enableLogging) {
      await this.logError(errorLog)
    }
    
    if (finalConfig.enableRetries && errorLog.retryable) {
      await this.scheduleRetry(errorLog, finalConfig.retryConfig)
    }
    
    if (finalConfig.enableNotifications) {
      await this.checkNotificationThresholds(context.userId, finalConfig.notificationThresholds)
    }
    
    return errorLog
  }

  private async createErrorLog(error: Error | any, context: ErrorContext): Promise<ErrorLog> {
    const errorType = this.classifyError(error)
    const severity = this.determineSeverity(errorType, error)
    const retryable = this.isRetryable(errorType, error)
    
    return {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: context.userId,
      operation: context.operation,
      provider: context.provider,
      connectionId: context.connectionId,
      recordId: context.recordId,
      errorType,
      errorCode: error.code || error.status?.toString(),
      message: error.message || 'Unknown error occurred',
      stack: error.stack,
      context: context.metadata || {},
      severity,
      retryable,
      retryCount: 0,
      maxRetries: this.getMaxRetries(errorType),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private classifyError(error: Error | any): ErrorType {
    // Check error message and properties to classify
    const message = error.message?.toLowerCase() || ''
    const code = error.code || error.status
    
    // Authentication errors
    if (code === 401 || message.includes('unauthorized') || message.includes('invalid token')) {
      return 'authentication_error'
    }
    
    // Authorization errors
    if (code === 403 || message.includes('forbidden') || message.includes('access denied')) {
      return 'authorization_error'
    }
    
    // Rate limiting
    if (code === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit_error'
    }
    
    // Validation errors
    if (code === 400 || message.includes('validation') || message.includes('invalid')) {
      return 'validation_error'
    }
    
    // Network errors
    if (error.name === 'NetworkError' || message.includes('network') || message.includes('connection')) {
      return 'network_error'
    }
    
    // Timeout errors
    if (error.name === 'TimeoutError' || message.includes('timeout') || message.includes('timed out')) {
      return 'timeout_error'
    }
    
    // Data conflicts
    if (message.includes('conflict') || message.includes('duplicate') || code === 409) {
      return 'data_conflict_error'
    }
    
    // Mapping errors
    if (message.includes('mapping') || message.includes('field not found')) {
      return 'mapping_error'
    }
    
    // Webhook errors
    if (message.includes('webhook') || message.includes('callback')) {
      return 'webhook_error'
    }
    
    // Sync errors
    if (message.includes('sync') || message.includes('synchronization')) {
      return 'sync_error'
    }
    
    // API errors (general)
    if (code >= 400 && code < 500) {
      return 'api_error'
    }
    
    return 'unknown_error'
  }

  private determineSeverity(errorType: ErrorType, error: Error | any): ErrorSeverity {
    switch (errorType) {
      case 'authentication_error':
      case 'authorization_error':
        return 'high'
      
      case 'rate_limit_error':
      case 'timeout_error':
      case 'network_error':
        return 'medium'
      
      case 'validation_error':
      case 'mapping_error':
        return 'low'
      
      case 'data_conflict_error':
        return 'medium'
      
      case 'webhook_error':
      case 'sync_error':
        return 'high'
      
      case 'api_error': {
        // Determine based on status code
        const code = error.code || error.status
        if (code >= 500) return 'high'
        if (code >= 400) return 'medium'
        return 'low'
      }
      
      default:
        return 'medium'
    }
  }

  private isRetryable(errorType: ErrorType, error: Error | any): boolean {
    const nonRetryableTypes = [
      'authentication_error',
      'authorization_error',
      'validation_error',
      'mapping_error'
    ]
    
    if (nonRetryableTypes.includes(errorType)) {
      return false
    }
    
    // Check specific status codes
    const code = error.code || error.status
    if (code === 400 || code === 401 || code === 403 || code === 404) {
      return false
    }
    
    return true
  }

  private getMaxRetries(errorType: ErrorType): number {
    switch (errorType) {
      case 'rate_limit_error':
        return 5
      case 'network_error':
      case 'timeout_error':
        return 3
      case 'api_error':
        return 2
      default:
        return 1
    }
  }

  private async logError(errorLog: ErrorLog): Promise<void> {
    try {
      await blink.db.errorLogs.create({
        id: errorLog.id,
        userId: errorLog.userId,
        operation: errorLog.operation,
        provider: errorLog.provider,
        connectionId: errorLog.connectionId,
        recordId: errorLog.recordId,
        errorType: errorLog.errorType,
        errorCode: errorLog.errorCode,
        message: errorLog.message,
        stack: errorLog.stack,
        context: JSON.stringify(errorLog.context),
        severity: errorLog.severity,
        retryable: errorLog.retryable ? 1 : 0,
        retryCount: errorLog.retryCount,
        maxRetries: errorLog.maxRetries,
        nextRetryAt: errorLog.nextRetryAt,
        resolvedAt: errorLog.resolvedAt,
        resolution: errorLog.resolution,
        createdAt: errorLog.createdAt,
        updatedAt: errorLog.updatedAt
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  private async scheduleRetry(errorLog: ErrorLog, retryConfig: RetryConfig): Promise<void> {
    if (errorLog.retryCount >= errorLog.maxRetries) {
      return
    }

    const delay = this.calculateRetryDelay(errorLog.retryCount, retryConfig)
    const nextRetryAt = new Date(Date.now() + delay)

    await blink.db.errorLogs.update(errorLog.id, {
      nextRetryAt,
      updatedAt: new Date()
    })

    // Schedule the retry (in a real implementation, you'd use a job queue)
    setTimeout(async () => {
      await this.executeRetry(errorLog.id)
    }, delay)
  }

  private calculateRetryDelay(retryCount: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, retryCount)
    delay = Math.min(delay, config.maxDelay)
    
    if (config.jitter) {
      // Add random jitter (±25%)
      const jitterRange = delay * 0.25
      delay += (Math.random() - 0.5) * 2 * jitterRange
    }
    
    return Math.max(delay, config.baseDelay)
  }

  private async executeRetry(errorLogId: string): Promise<void> {
    try {
      const errorLogs = await blink.db.errorLogs.list({
        where: { id: errorLogId },
        limit: 1
      })

      if (!errorLogs.length) return

      const errorLog = errorLogs[0]
      
      // Update retry count
      await blink.db.errorLogs.update(errorLogId, {
        retryCount: errorLog.retryCount + 1,
        updatedAt: new Date()
      })

      // Here you would implement the actual retry logic
      // This would depend on the specific operation being retried
      console.log(`Retrying operation: ${errorLog.operation} (attempt ${errorLog.retryCount + 1})`)
      
    } catch (retryError) {
      console.error('Failed to execute retry:', retryError)
    }
  }

  private async checkNotificationThresholds(
    userId: string, 
    thresholds: { errorCount: number; timeWindow: number }
  ): Promise<void> {
    try {
      const timeWindowStart = new Date(Date.now() - thresholds.timeWindow * 60 * 1000)
      
      const recentErrors = await blink.db.errorLogs.list({
        where: { 
          userId,
          createdAt: { gte: timeWindowStart.toISOString() }
        }
      })

      if (recentErrors.length >= thresholds.errorCount) {
        await this.sendErrorNotification(userId, recentErrors.length, thresholds.timeWindow)
      }
    } catch (error) {
      console.error('Failed to check notification thresholds:', error)
    }
  }

  private async sendErrorNotification(
    userId: string, 
    errorCount: number, 
    timeWindow: number
  ): Promise<void> {
    try {
      // Get user details
      const user = await blink.auth.me()
      if (!user?.email) return

      // Send notification email
      await blink.notifications.email({
        to: user.email,
        subject: 'Svara CRM Integration Alert - Multiple Errors Detected',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">CRM Integration Alert</h2>
            <p>We've detected ${errorCount} errors in your CRM integrations within the last ${timeWindow} minutes.</p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="color: #dc2626; margin: 0 0 8px 0;">Action Required</h3>
              <p style="margin: 0;">Please check your CRM integration settings and resolve any connection issues.</p>
            </div>
            
            <p>
              <a href="https://svara.ai/crm-integrations" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View CRM Integrations
              </a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you continue to experience issues, please contact our support team.
            </p>
          </div>
        `,
        text: `CRM Integration Alert: ${errorCount} errors detected in the last ${timeWindow} minutes. Please check your integration settings.`
      })
    } catch (error) {
      console.error('Failed to send error notification:', error)
    }
  }

  async getErrorLogs(
    userId: string, 
    filters?: {
      provider?: string
      errorType?: ErrorType
      severity?: ErrorSeverity
      startDate?: Date
      endDate?: Date
      limit?: number
    }
  ): Promise<ErrorLog[]> {
    try {
      const whereClause: any = { userId }
      
      if (filters?.provider) {
        whereClause.provider = filters.provider
      }
      
      if (filters?.errorType) {
        whereClause.errorType = filters.errorType
      }
      
      if (filters?.severity) {
        whereClause.severity = filters.severity
      }
      
      if (filters?.startDate) {
        whereClause.createdAt = { gte: filters.startDate.toISOString() }
      }
      
      if (filters?.endDate) {
        whereClause.createdAt = { 
          ...whereClause.createdAt,
          lte: filters.endDate.toISOString() 
        }
      }

      const errorLogs = await blink.db.errorLogs.list({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        limit: filters?.limit || 100
      })

      return errorLogs.map(log => ({
        ...log,
        context: JSON.parse(log.context || '{}'),
        retryable: Number(log.retryable) > 0,
        nextRetryAt: log.nextRetryAt ? new Date(log.nextRetryAt) : undefined,
        resolvedAt: log.resolvedAt ? new Date(log.resolvedAt) : undefined,
        createdAt: new Date(log.createdAt),
        updatedAt: new Date(log.updatedAt)
      }))
    } catch (error) {
      console.error('Failed to get error logs:', error)
      return []
    }
  }

  async resolveError(errorLogId: string, resolution: string): Promise<void> {
    try {
      await blink.db.errorLogs.update(errorLogId, {
        resolvedAt: new Date(),
        resolution,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Failed to resolve error:', error)
    }
  }

  async getErrorStats(
    userId: string, 
    timeWindow: number = 24 // hours
  ): Promise<{
    totalErrors: number
    errorsByType: Record<ErrorType, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    errorsByProvider: Record<string, number>
    resolvedErrors: number
    retryableErrors: number
  }> {
    try {
      const startDate = new Date(Date.now() - timeWindow * 60 * 60 * 1000)
      
      const errors = await this.getErrorLogs(userId, { 
        startDate,
        limit: 1000 
      })

      const stats = {
        totalErrors: errors.length,
        errorsByType: {} as Record<ErrorType, number>,
        errorsBySeverity: {} as Record<ErrorSeverity, number>,
        errorsByProvider: {} as Record<string, number>,
        resolvedErrors: errors.filter(e => e.resolvedAt).length,
        retryableErrors: errors.filter(e => e.retryable).length
      }

      errors.forEach(error => {
        // Count by type
        stats.errorsByType[error.errorType] = (stats.errorsByType[error.errorType] || 0) + 1
        
        // Count by severity
        stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1
        
        // Count by provider
        if (error.provider) {
          stats.errorsByProvider[error.provider] = (stats.errorsByProvider[error.provider] || 0) + 1
        }
      })

      return stats
    } catch (error) {
      console.error('Failed to get error stats:', error)
      return {
        totalErrors: 0,
        errorsByType: {} as Record<ErrorType, number>,
        errorsBySeverity: {} as Record<ErrorSeverity, number>,
        errorsByProvider: {} as Record<string, number>,
        resolvedErrors: 0,
        retryableErrors: 0
      }
    }
  }

  // Utility method to wrap operations with error handling
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    config?: Partial<ErrorHandlingConfig>
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      await this.handleError(error, context, config)
      throw error // Re-throw after handling
    }
  }
}

export const errorHandlingService = new ErrorHandlingService()