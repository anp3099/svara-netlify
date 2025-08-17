// Background Sync Job Manager for CRM Integrations
import { blink } from '../blink/client';
import { apiRateLimitingService } from './apiRateLimiting';
import { safeToUpper } from '../lib/utils';
import { CRMIntegrationManager, SyncResult, FieldMapping } from './crmIntegrations';

export interface SyncJob {
  id: string;
  userId: string;
  provider: string;
  jobType: 'contacts' | 'companies' | 'deals' | 'activities' | 'full_sync';
  direction: 'to_crm' | 'from_crm' | 'bidirectional';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: number; // 0-100
  totalRecords: number;
  processedRecords: number;
  errorCount: number;
  result?: SyncResult;
  config: SyncJobConfig;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncJobConfig {
  batchSize: number;
  fieldMappings?: FieldMapping[];
  filters?: Record<string, any>;
  conflictResolution: 'crm_wins' | 'svara_wins' | 'manual' | 'newest_wins';
  enableDeduplication: boolean;
  createMissingRecords: boolean;
  updateExistingRecords: boolean;
  deleteRemovedRecords: boolean;
  syncCustomFields: boolean;
  webhookNotification?: string;
  emailNotification?: string;
}

export interface SyncSchedule {
  id: string;
  userId: string;
  provider: string;
  jobType: 'contacts' | 'companies' | 'deals' | 'activities' | 'full_sync';
  direction: 'to_crm' | 'from_crm' | 'bidirectional';
  enabled: boolean;
  cronExpression: string; // e.g., "0 */15 * * * *" for every 15 minutes
  timezone: string;
  config: SyncJobConfig;
  lastRunAt?: Date;
  nextRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageDuration: number;
  totalRecordsProcessed: number;
  totalRecordsCreated: number;
  totalRecordsUpdated: number;
  totalErrors: number;
  successRate: number;
  lastSyncAt?: Date;
  upcomingJobs: number;
}

export class SyncJobManager {
  private static instance: SyncJobManager;
  private runningJobs: Map<string, AbortController> = new Map();
  private jobQueue: SyncJob[] = [];
  private isProcessing = false;
  private maxConcurrentJobs = 3;
  private scheduleTimer?: NodeJS.Timeout;

  static getInstance(): SyncJobManager {
    if (!SyncJobManager.instance) {
      SyncJobManager.instance = new SyncJobManager();
    }
    return SyncJobManager.instance;
  }

  /**
   * Start the sync job manager
   */
  start(): void {
    console.log('Starting Sync Job Manager...');
    this.startJobProcessor();
    this.startScheduleProcessor();
    this.startCleanupTimer();
  }

  /**
   * Stop the sync job manager
   */
  stop(): void {
    console.log('Stopping Sync Job Manager...');
    
    // Cancel all running jobs
    for (const [jobId, controller] of this.runningJobs) {
      controller.abort();
      this.updateJobStatus(jobId, 'cancelled');
    }
    this.runningJobs.clear();
    
    // Clear timers
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
    }
    
    this.isProcessing = false;
  }

  /**
   * Create a new sync job
   */
  async createSyncJob(
    userId: string,
    provider: string,
    jobType: SyncJob['jobType'],
    direction: SyncJob['direction'],
    config: Partial<SyncJobConfig> = {},
    priority: SyncJob['priority'] = 'normal',
    scheduledAt?: Date
  ): Promise<string> {
    const jobId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const job: SyncJob = {
      id: jobId,
      userId,
      provider,
      jobType,
      direction,
      status: 'pending',
      priority,
      scheduledAt: scheduledAt || now,
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      errorCount: 0,
      config: {
        batchSize: 100,
        conflictResolution: 'crm_wins',
        enableDeduplication: true,
        createMissingRecords: true,
        updateExistingRecords: true,
        deleteRemovedRecords: false,
        syncCustomFields: true,
        ...config
      },
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
      updatedAt: now
    };

    // Store job in database
    await this.saveJob(job);
    
    // Add to queue if scheduled for now or past
    if (job.scheduledAt <= now) {
      this.addToQueue(job);
    }

    console.log(`Created sync job ${jobId} for ${provider} ${jobType} (${direction})`);
    return jobId;
  }

  /**
   * Create a sync schedule
   */
  async createSyncSchedule(
    userId: string,
    provider: string,
    jobType: SyncJob['jobType'],
    direction: SyncJob['direction'],
    cronExpression: string,
    config: Partial<SyncJobConfig> = {},
    timezone: string = 'UTC'
  ): Promise<string> {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const schedule: SyncSchedule = {
      id: scheduleId,
      userId,
      provider,
      jobType,
      direction,
      enabled: true,
      cronExpression,
      timezone,
      config: {
        batchSize: 100,
        conflictResolution: 'crm_wins',
        enableDeduplication: true,
        createMissingRecords: true,
        updateExistingRecords: true,
        deleteRemovedRecords: false,
        syncCustomFields: true,
        ...config
      },
      nextRunAt: this.calculateNextRun(cronExpression, timezone),
      createdAt: now,
      updatedAt: now
    };

    // Store schedule in database (would need a sync_schedules table)
    await this.saveSchedule(schedule);
    
    console.log(`Created sync schedule ${scheduleId} for ${provider} ${jobType} (${cronExpression})`);
    return scheduleId;
  }

  /**
   * Get sync job status
   */
  async getJobStatus(jobId: string): Promise<SyncJob | null> {
    try {
      // First check running jobs
      if (this.runningJobs.has(jobId)) {
        return this.loadJob(jobId);
      }
      
      // Load from database
      return this.loadJob(jobId);
    } catch (error) {
      console.error(`Error getting job status for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Cancel a sync job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      // Cancel if running
      const controller = this.runningJobs.get(jobId);
      if (controller) {
        controller.abort();
        this.runningJobs.delete(jobId);
      }
      
      // Update status
      await this.updateJobStatus(jobId, 'cancelled');
      
      // Remove from queue
      this.jobQueue = this.jobQueue.filter(job => job.id !== jobId);
      
      console.log(`Cancelled sync job ${jobId}`);
      return true;
    } catch (error) {
      console.error(`Error cancelling job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get sync metrics for a user
   */
  async getSyncMetrics(userId: string, days: number = 30): Promise<SyncMetrics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Load sync logs from database
      const syncLogs = await blink.db.crmSyncLogs.list({
        where: { userId },
        limit: 10000
      });

      // Filter logs within date range
      const filteredLogs = syncLogs.filter(log => 
        new Date(log.startedAt || log.createdAt) >= startDate
      );

      const totalJobs = filteredLogs.length;
      const completedJobs = filteredLogs.filter(log => log.status === 'completed').length;
      const failedJobs = filteredLogs.filter(log => log.status === 'failed').length;
      
      const durations = filteredLogs
        .filter(log => log.duration && log.duration > 0)
        .map(log => log.duration);
      const averageDuration = durations.length > 0 
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
        : 0;

      const totalRecordsProcessed = filteredLogs.reduce((sum, log) => sum + (log.recordsProcessed || 0), 0);
      const totalRecordsCreated = filteredLogs.reduce((sum, log) => sum + (log.recordsCreated || 0), 0);
      const totalRecordsUpdated = filteredLogs.reduce((sum, log) => sum + (log.recordsUpdated || 0), 0);
      const totalErrors = filteredLogs.reduce((sum, log) => sum + (log.errorCount || 0), 0);
      
      const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      
      const lastSyncLog = filteredLogs
        .sort((a, b) => new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime())[0];
      const lastSyncAt = lastSyncLog ? new Date(lastSyncLog.startedAt || lastSyncLog.createdAt) : undefined;

      // Count upcoming jobs (pending jobs scheduled for future)
      const upcomingJobs = this.jobQueue.filter(job => 
        job.userId === userId && 
        job.status === 'pending' && 
        job.scheduledAt > new Date()
      ).length;

      return {
        totalJobs,
        completedJobs,
        failedJobs,
        averageDuration,
        totalRecordsProcessed,
        totalRecordsCreated,
        totalRecordsUpdated,
        totalErrors,
        successRate,
        lastSyncAt,
        upcomingJobs
      };
    } catch (error) {
      console.error('Error getting sync metrics:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageDuration: 0,
        totalRecordsProcessed: 0,
        totalRecordsCreated: 0,
        totalRecordsUpdated: 0,
        totalErrors: 0,
        successRate: 0,
        upcomingJobs: 0
      };
    }
  }

  /**
   * Get user's sync jobs
   */
  async getUserJobs(
    userId: string, 
    status?: SyncJob['status'], 
    limit: number = 50
  ): Promise<SyncJob[]> {
    try {
      const whereClause: any = { userId };
      if (status) {
        whereClause.status = status;
      }

      const syncLogs = await blink.db.crmSyncLogs.list({
        where: whereClause,
        limit,
        orderBy: { startedAt: 'desc' }
      });

      return syncLogs.map(log => this.transformLogToJob(log));
    } catch (error) {
      console.error('Error getting user jobs:', error);
      return [];
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.loadJob(jobId);
      if (!job) {
        return false;
      }

      if (job.status !== 'failed') {
        throw new Error('Only failed jobs can be retried');
      }

      if (job.retryCount >= job.maxRetries) {
        throw new Error('Maximum retry attempts exceeded');
      }

      // Reset job status and increment retry count
      job.status = 'pending';
      job.retryCount++;
      job.scheduledAt = new Date();
      job.updatedAt = new Date();
      job.progress = 0;
      job.processedRecords = 0;
      job.errorCount = 0;
      delete job.result;

      await this.saveJob(job);
      this.addToQueue(job);

      console.log(`Retrying job ${jobId} (attempt ${job.retryCount}/${job.maxRetries})`);
      return true;
    } catch (error) {
      console.error(`Error retrying job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Private methods
   */
  private startJobProcessor(): void {
    const processJobs = async () => {
      if (this.isProcessing || this.runningJobs.size >= this.maxConcurrentJobs) {
        return;
      }

      this.isProcessing = true;

      try {
        // Sort queue by priority and scheduled time
        this.jobQueue.sort((a, b) => {
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.scheduledAt.getTime() - b.scheduledAt.getTime();
        });

        // Process jobs that are ready to run
        const now = new Date();
        const readyJobs = this.jobQueue.filter(job => 
          job.status === 'pending' && 
          job.scheduledAt <= now &&
          this.runningJobs.size < this.maxConcurrentJobs
        );

        for (const job of readyJobs.slice(0, this.maxConcurrentJobs - this.runningJobs.size)) {
          this.executeJob(job);
        }
      } catch (error) {
        console.error('Error in job processor:', error);
      } finally {
        this.isProcessing = false;
      }
    };

    // Process jobs every 10 seconds
    setInterval(processJobs, 10000);
    processJobs(); // Run immediately
  }

  private startScheduleProcessor(): void {
    const processSchedules = async () => {
      try {
        // Load active schedules (would need a sync_schedules table)
        const schedules = await this.loadActiveSchedules();
        const now = new Date();

        for (const schedule of schedules) {
          if (schedule.enabled && schedule.nextRunAt <= now) {
            // Create job from schedule
            await this.createSyncJob(
              schedule.userId,
              schedule.provider,
              schedule.jobType,
              schedule.direction,
              schedule.config,
              'normal'
            );

            // Update next run time
            schedule.nextRunAt = this.calculateNextRun(schedule.cronExpression, schedule.timezone);
            schedule.lastRunAt = now;
            schedule.updatedAt = now;
            await this.saveSchedule(schedule);
          }
        }
      } catch (error) {
        console.error('Error in schedule processor:', error);
      }
    };

    // Process schedules every minute
    this.scheduleTimer = setInterval(processSchedules, 60000);
    processSchedules(); // Run immediately
  }

  private startCleanupTimer(): void {
    const cleanup = async () => {
      try {
        // Remove completed jobs older than 30 days
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        // Clean up job queue
        this.jobQueue = this.jobQueue.filter(job => 
          job.status === 'pending' || job.createdAt > cutoffDate
        );

        // Clean up database (would need proper cleanup queries)
        console.log('Cleaned up old sync jobs');
      } catch (error) {
        console.error('Error in cleanup:', error);
      }
    };

    // Cleanup every hour
    setInterval(cleanup, 3600000);
  }

  private async executeJob(job: SyncJob): Promise<void> {
    const controller = new AbortController();
    this.runningJobs.set(job.id, controller);

    try {
      console.log(`Starting sync job ${job.id}: ${job.provider} ${job.jobType} (${job.direction})`);
      
      // Update job status
      job.status = 'running';
      job.startedAt = new Date();
      job.updatedAt = new Date();
      await this.saveJob(job);

      // Check rate limits
      const rateLimitResult = await apiRateLimitingService.checkRateLimit(
        job.userId,
        job.provider,
        job.jobType
      );

      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds`);
      }

      // Get CRM integration
      const crmManager = new CRMIntegrationManager(job.userId);
      const integration = await crmManager.getIntegration(job.provider);
      
      if (!integration) {
        throw new Error(`No active integration found for ${job.provider}`);
      }

      // Execute sync based on job type and direction
      let result: SyncResult;
      
      switch (job.jobType) {
        case 'contacts':
          if (job.direction === 'from_crm' || job.direction === 'bidirectional') {
            result = await integration.syncContacts({
              batchSize: job.config.batchSize,
              fieldMappings: job.config.fieldMappings
            });
          } else {
            result = await this.syncToCRM(integration, job, 'contacts');
          }
          break;
          
        case 'companies':
          if (job.direction === 'from_crm' || job.direction === 'bidirectional') {
            result = await integration.syncCompanies({
              batchSize: job.config.batchSize,
              fieldMappings: job.config.fieldMappings
            });
          } else {
            result = await this.syncToCRM(integration, job, 'companies');
          }
          break;
          
        case 'full_sync':
          result = await this.performFullSync(integration, job);
          break;
          
        default:
          throw new Error(`Unsupported job type: ${job.jobType}`);
      }

      // Record API usage
      await apiRateLimitingService.recordUsage(
        job.userId,
        job.provider,
        job.jobType,
        result.success,
        result.duration,
        result.errors.length > 0 ? JSON.stringify(result.errors) : undefined
      );

      // Update job with results
      job.status = result.success ? 'completed' : 'failed';
      job.completedAt = new Date();
      job.updatedAt = new Date();
      job.progress = 100;
      job.totalRecords = result.recordsProcessed;
      job.processedRecords = result.recordsProcessed;
      job.errorCount = result.errors.length;
      job.result = result;

      await this.saveJob(job);

      // Send notifications if configured
      if (job.config.emailNotification) {
        await this.sendEmailNotification(job);
      }
      
      if (job.config.webhookNotification) {
        await this.sendWebhookNotification(job);
      }

      console.log(`Completed sync job ${job.id}: ${result.recordsProcessed} records processed`);
      
    } catch (error) {
      console.error(`Sync job ${job.id} failed:`, error);
      
      // Update job status
      job.status = 'failed';
      job.completedAt = new Date();
      job.updatedAt = new Date();
      job.result = {
        success: false,
        recordsProcessed: job.processedRecords,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [{ 
          recordId: 'job_execution', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }],
        duration: Date.now() - (job.startedAt?.getTime() || Date.now())
      };

      await this.saveJob(job);

      // Schedule retry if within retry limits
      if (job.retryCount < job.maxRetries) {
        const retryDelay = Math.min(300000 * Math.pow(2, job.retryCount), 3600000); // Exponential backoff, max 1 hour
        job.nextRetryAt = new Date(Date.now() + retryDelay);
        job.status = 'pending';
        job.scheduledAt = job.nextRetryAt;
        job.retryCount++;
        
        await this.saveJob(job);
        this.addToQueue(job);
        
        console.log(`Scheduled retry for job ${job.id} in ${retryDelay / 1000} seconds`);
      }
    } finally {
      this.runningJobs.delete(job.id);
      this.jobQueue = this.jobQueue.filter(j => j.id !== job.id);
    }
  }

  private async syncToCRM(integration: any, job: SyncJob, type: 'contacts' | 'companies'): Promise<SyncResult> {
    // Implementation for syncing Svara data to CRM
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0
    };

    try {
      // Get Svara records to sync
      const svaraRecords = type === 'contacts' 
        ? await blink.db.leads.list({ where: { userId: job.userId }, limit: job.config.batchSize })
        : await blink.db.leads.list({ where: { userId: job.userId }, limit: job.config.batchSize }); // Would be companies table

      result.recordsProcessed = svaraRecords.length;

      for (const record of svaraRecords) {
        try {
          if (type === 'contacts') {
            // Check if contact exists in CRM
            const existingContacts = await integration.searchContacts(record.contactEmail);
            
            if (existingContacts.length > 0) {
              // Update existing contact
              await integration.updateContact(existingContacts[0].id, {
                email: record.contactEmail,
                firstName: record.contactName?.split(' ')[0],
                lastName: record.contactName?.split(' ').slice(1).join(' '),
                company: record.companyName,
                title: record.contactTitle,
                phone: record.contactPhone
              });
              result.recordsUpdated++;
            } else if (job.config.createMissingRecords) {
              // Create new contact
              await integration.createContact({
                email: record.contactEmail,
                firstName: record.contactName?.split(' ')[0],
                lastName: record.contactName?.split(' ').slice(1).join(' '),
                company: record.companyName,
                title: record.contactTitle,
                phone: record.contactPhone
              });
              result.recordsCreated++;
            } else {
              result.recordsSkipped++;
            }
          }
        } catch (error) {
          result.errors.push({
            recordId: record.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      result.success = result.errors.length < result.recordsProcessed * 0.1;
    } catch (error) {
      result.errors.push({
        recordId: 'sync_to_crm',
        error: error instanceof Error ? error.message : 'Sync to CRM failed'
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async performFullSync(integration: any, job: SyncJob): Promise<SyncResult> {
    // Implementation for full bidirectional sync
    const results: SyncResult[] = [];
    
    if (job.direction === 'from_crm' || job.direction === 'bidirectional') {
      results.push(await integration.syncContacts({ batchSize: job.config.batchSize }));
      results.push(await integration.syncCompanies({ batchSize: job.config.batchSize }));
    }
    
    if (job.direction === 'to_crm' || job.direction === 'bidirectional') {
      results.push(await this.syncToCRM(integration, job, 'contacts'));
      results.push(await this.syncToCRM(integration, job, 'companies'));
    }

    // Combine results
    return results.reduce((combined, result) => ({
      success: combined.success && result.success,
      recordsProcessed: combined.recordsProcessed + result.recordsProcessed,
      recordsCreated: combined.recordsCreated + result.recordsCreated,
      recordsUpdated: combined.recordsUpdated + result.recordsUpdated,
      recordsSkipped: combined.recordsSkipped + result.recordsSkipped,
      errors: [...combined.errors, ...result.errors],
      duration: Math.max(combined.duration, result.duration)
    }), {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0
    });
  }

  private addToQueue(job: SyncJob): void {
    // Remove existing job with same ID
    this.jobQueue = this.jobQueue.filter(j => j.id !== job.id);
    this.jobQueue.push(job);
  }

  private async updateJobStatus(jobId: string, status: SyncJob['status']): Promise<void> {
    try {
      await blink.db.crmSyncLogs.update(jobId, {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error updating job status for ${jobId}:`, error);
    }
  }

  private async saveJob(job: SyncJob): Promise<void> {
    try {
      const logData = {
        id: job.id,
        userId: job.userId,
        connectionId: `${job.provider}_${job.userId}`,
        syncType: `${job.jobType}_${job.direction}`,
        status: job.status,
        recordsProcessed: job.processedRecords,
        recordsCreated: job.result?.recordsCreated || 0,
        recordsUpdated: job.result?.recordsUpdated || 0,
        recordsSkipped: job.result?.recordsSkipped || 0,
        errorCount: job.errorCount,
        errors: job.result?.errors ? JSON.stringify(job.result.errors) : undefined,
        duration: job.result?.duration || 0,
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString()
      };

      // Check if job exists
      const existingLogs = await blink.db.crmSyncLogs.list({
        where: { id: job.id },
        limit: 1
      });

      if (existingLogs.length > 0) {
        await blink.db.crmSyncLogs.update(job.id, logData);
      } else {
        await blink.db.crmSyncLogs.create(logData);
      }
    } catch (error) {
      console.error(`Error saving job ${job.id}:`, error);
    }
  }

  private async loadJob(jobId: string): Promise<SyncJob | null> {
    try {
      const logs = await blink.db.crmSyncLogs.list({
        where: { id: jobId },
        limit: 1
      });

      if (logs.length === 0) {
        return null;
      }

      return this.transformLogToJob(logs[0]);
    } catch (error) {
      console.error(`Error loading job ${jobId}:`, error);
      return null;
    }
  }

  private transformLogToJob(log: any): SyncJob {
    const [jobType, direction] = log.syncType.split('_');
    
    return {
      id: log.id,
      userId: log.userId,
      provider: log.connectionId.split('_')[0],
      jobType: jobType as SyncJob['jobType'],
      direction: direction as SyncJob['direction'],
      status: log.status,
      priority: 'normal',
      scheduledAt: new Date(log.startedAt || log.createdAt),
      startedAt: log.startedAt ? new Date(log.startedAt) : undefined,
      completedAt: log.completedAt ? new Date(log.completedAt) : undefined,
      progress: log.status === 'completed' ? 100 : log.status === 'running' ? 50 : 0,
      totalRecords: log.recordsProcessed,
      processedRecords: log.recordsProcessed,
      errorCount: log.errorCount,
      result: log.status === 'completed' || log.status === 'failed' ? {
        success: log.status === 'completed',
        recordsProcessed: log.recordsProcessed,
        recordsCreated: log.recordsCreated,
        recordsUpdated: log.recordsUpdated,
        recordsSkipped: log.recordsSkipped,
        errors: log.errors ? JSON.parse(log.errors) : [],
        duration: log.duration
      } : undefined,
      config: {
        batchSize: 100,
        conflictResolution: 'crm_wins',
        enableDeduplication: true,
        createMissingRecords: true,
        updateExistingRecords: true,
        deleteRemovedRecords: false,
        syncCustomFields: true
      },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(log.createdAt),
      updatedAt: new Date(log.updatedAt || log.createdAt)
    };
  }

  private async saveSchedule(schedule: SyncSchedule): Promise<void> {
    // Would need a sync_schedules table
    console.log('Saving schedule:', schedule.id);
  }

  private async loadActiveSchedules(): Promise<SyncSchedule[]> {
    // Would need a sync_schedules table
    return [];
  }

  private calculateNextRun(cronExpression: string, timezone: string): Date {
    // Simple implementation - would use a proper cron parser in production
    const now = new Date();
    
    // For demo, just add intervals based on common patterns
    if (cronExpression === '0 */15 * * * *') { // Every 15 minutes
      return new Date(now.getTime() + 15 * 60 * 1000);
    } else if (cronExpression === '0 0 * * * *') { // Every hour
      return new Date(now.getTime() + 60 * 60 * 1000);
    } else if (cronExpression === '0 0 */6 * * *') { // Every 6 hours
      return new Date(now.getTime() + 6 * 60 * 60 * 1000);
    } else if (cronExpression === '0 0 0 * * *') { // Daily
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
    
    // Default to 1 hour
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  private async sendEmailNotification(job: SyncJob): Promise<void> {
    try {
      if (!job.config.emailNotification) return;

      const subject = `Sync Job ${safeToUpper(job.status, 'UNKNOWN')}: ${job.provider} ${job.jobType}`;
      const content = `
        <h2>Sync Job ${safeToUpper(job.status, 'UNKNOWN')}</h2>
        <p><strong>Job ID:</strong> ${job.id}</p>
        <p><strong>Provider:</strong> ${job.provider}</p>
        <p><strong>Type:</strong> ${job.jobType} (${job.direction})</p>
        <p><strong>Status:</strong> ${job.status}</p>
        <p><strong>Records Processed:</strong> ${job.processedRecords}</p>
        ${job.result ? `
          <p><strong>Records Created:</strong> ${job.result.recordsCreated}</p>
          <p><strong>Records Updated:</strong> ${job.result.recordsUpdated}</p>
          <p><strong>Errors:</strong> ${job.result.errors.length}</p>
          <p><strong>Duration:</strong> ${(job.result.duration / 1000).toFixed(1)}s</p>
        ` : ''}
        <p><strong>Started:</strong> ${job.startedAt?.toLocaleString()}</p>
        <p><strong>Completed:</strong> ${job.completedAt?.toLocaleString()}</p>
      `;

      await blink.notifications.email({
        to: job.config.emailNotification,
        subject,
        html: content
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  private async sendWebhookNotification(job: SyncJob): Promise<void> {
    try {
      if (!job.config.webhookNotification) return;

      const payload = {
        jobId: job.id,
        userId: job.userId,
        provider: job.provider,
        jobType: job.jobType,
        direction: job.direction,
        status: job.status,
        result: job.result,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      };

      await fetch(job.config.webhookNotification, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Svara-Sync-Manager/1.0'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }
}

// Export singleton instance
export const syncJobManager = SyncJobManager.getInstance();

// Auto-start when imported
if (typeof window !== 'undefined') {
  // Only start in browser environment
  syncJobManager.start();
}