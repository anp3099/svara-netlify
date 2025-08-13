import { blink } from '../blink/client';
import { createCRMManager } from './crmIntegrations';
import { syncJobManager } from './syncJobManager';

export interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
  duration: number;
}

export interface ValidationSuite {
  name: string;
  tests: ValidationTest[];
}

export interface ValidationTest {
  name: string;
  description: string;
  test: () => Promise<ValidationResult>;
}

export class IntegrationValidator {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async validateOAuthFlows(): Promise<ValidationResult[]> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];

    try {
      const crmManager = createCRMManager(this.userId);
      
      // Test OAuth URL generation for each provider
      const providers = ['hubspot', 'salesforce', 'pipedrive'];
      
      for (const provider of providers) {
        const testStart = Date.now();
        try {
          const oauthUrl = crmManager.getOAuthUrl(provider);
          
          if (!oauthUrl || !oauthUrl.includes(provider)) {
            results.push({
              success: false,
              message: `Invalid OAuth URL for ${provider}`,
              duration: Date.now() - testStart
            });
          } else {
            results.push({
              success: true,
              message: `OAuth URL generated successfully for ${provider}`,
              details: { url: oauthUrl },
              duration: Date.now() - testStart
            });
          }
        } catch (error) {
          results.push({
            success: false,
            message: `OAuth URL generation failed for ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: Date.now() - testStart
          });
        }
      }

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `OAuth validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      }];
    }
  }

  async validateDatabaseSchema(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Test each table exists and has correct structure
    const tables = [
      'crm_connections',
      'crm_sync_jobs',
      'crm_sync_logs',
      'crm_field_mappings',
      'crm_webhooks',
      'marketing_connections',
      'marketing_sync_logs',
      'automation_workflows',
      'error_logs'
    ];

    for (const table of tables) {
      const testStart = Date.now();
      try {
        // Try to query the table using the appropriate method
        let recordCount = 0;
        
        switch (table) {
          case 'crm_connections': {
            const crmConnections = await blink.db.crmConnections.list({ where: { userId: this.userId }, limit: 1 });
            recordCount = crmConnections.length;
            break;
          }
          case 'crm_sync_jobs': {
            const syncJobs = await blink.db.crmSyncJobs.list({ where: { userId: this.userId }, limit: 1 });
            recordCount = syncJobs.length;
            break;
          }
          case 'crm_sync_logs': {
            const syncLogs = await blink.db.crmSyncLogs.list({ where: { userId: this.userId }, limit: 1 });
            recordCount = syncLogs.length;
            break;
          }
          case 'crm_field_mappings': {
            const fieldMappings = await blink.db.crmFieldMappings.list({ limit: 1 });
            recordCount = fieldMappings.length;
            break;
          }
          case 'crm_webhooks': {
            const webhooks = await blink.db.crmWebhooks.list({ where: { userId: this.userId }, limit: 1 });
            recordCount = webhooks.length;
            break;
          }
          case 'marketing_connections': {
            const marketingConnections = await blink.db.marketingConnections.list({ where: { userId: this.userId }, limit: 1 });
            recordCount = marketingConnections.length;
            break;
          }
          case 'marketing_sync_logs': {
            const marketingSyncLogs = await blink.db.marketingSyncLogs.list({ where: { userId: this.userId }, limit: 1 });
            recordCount = marketingSyncLogs.length;
            break;
          }
          case 'automation_workflows': {
            const workflows = await blink.db.automationWorkflows.list({ where: { userId: this.userId }, limit: 1 });
            recordCount = workflows.length;
            break;
          }
          case 'error_logs': {
            const errorLogs = await blink.db.errorLogs.list({ where: { userId: this.userId }, limit: 1 });
            recordCount = errorLogs.length;
            break;
          }
          default:
            recordCount = 0;
        }
        
        results.push({
          success: true,
          message: `Table ${table} exists and is accessible`,
          details: { recordCount },
          duration: Date.now() - testStart
        });
      } catch (error) {
        results.push({
          success: false,
          message: `Table ${table} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - testStart
        });
      }
    }

    return results;
  }

  async validateAPIConnectivity(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Get active connections
      const connections = await blink.db.crmConnections.list({
        where: { userId: this.userId, status: 'active' }
      });

      if (connections.length === 0) {
        return [{
          success: false,
          message: 'No active CRM connections found for testing',
          duration: 0
        }];
      }

      const crmManager = createCRMManager(this.userId);

      for (const connection of connections) {
        const testStart = Date.now();
        try {
          const integration = await crmManager.getIntegration(connection.provider);
          
          if (!integration) {
            results.push({
              success: false,
              message: `Integration not found for ${connection.provider}`,
              duration: Date.now() - testStart
            });
            continue;
          }

          // Test connection
          await integration.testConnection();
          
          results.push({
            success: true,
            message: `API connectivity test passed for ${connection.provider}`,
            duration: Date.now() - testStart
          });
        } catch (error) {
          results.push({
            success: false,
            message: `API connectivity test failed for ${connection.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: Date.now() - testStart
          });
        }
      }

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `API connectivity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0
      }];
    }
  }

  async validateDataSync(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Get active connections
      const connections = await blink.db.crmConnections.list({
        where: { userId: this.userId, status: 'active' }
      });

      if (connections.length === 0) {
        return [{
          success: false,
          message: 'No active CRM connections found for sync testing',
          duration: 0
        }];
      }

      const crmManager = createCRMManager(this.userId);

      for (const connection of connections) {
        const testStart = Date.now();
        try {
          const integration = await crmManager.getIntegration(connection.provider);
          
          if (!integration) {
            results.push({
              success: false,
              message: `Integration not found for ${connection.provider}`,
              duration: Date.now() - testStart
            });
            continue;
          }

          // Test small sync operation
          const syncResult = await integration.syncContacts({ limit: 5 });
          
          results.push({
            success: syncResult.success,
            message: syncResult.success 
              ? `Data sync test passed for ${connection.provider}` 
              : `Data sync test failed for ${connection.provider}`,
            details: syncResult,
            duration: Date.now() - testStart
          });
        } catch (error) {
          results.push({
            success: false,
            message: `Data sync test failed for ${connection.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: Date.now() - testStart
          });
        }
      }

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `Data sync validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0
      }];
    }
  }

  async validateFieldMappings(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const testStart = Date.now();
      
      // Check if field mappings exist
      const mappings = await blink.db.crmFieldMappings.list({
        where: { connectionId: { in: await this.getConnectionIds() } }
      });

      if (mappings.length === 0) {
        results.push({
          success: false,
          message: 'No field mappings found for validation',
          duration: Date.now() - testStart
        });
      } else {
        // Validate mapping structure
        let validMappings = 0;
        let invalidMappings = 0;

        for (const mapping of mappings) {
          if (mapping.svaraField && mapping.crmField && mapping.dataType) {
            validMappings++;
          } else {
            invalidMappings++;
          }
        }

        results.push({
          success: invalidMappings === 0,
          message: `Field mapping validation: ${validMappings} valid, ${invalidMappings} invalid`,
          details: { validMappings, invalidMappings, totalMappings: mappings.length },
          duration: Date.now() - testStart
        });
      }

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `Field mapping validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0
      }];
    }
  }

  async validateWebhooks(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const testStart = Date.now();
      
      // Check webhook configurations
      const webhooks = await blink.db.crmWebhooks.list({
        where: { userId: this.userId }
      });

      if (webhooks.length === 0) {
        results.push({
          success: false,
          message: 'No webhooks configured for validation',
          duration: Date.now() - testStart
        });
      } else {
        let activeWebhooks = 0;
        let inactiveWebhooks = 0;

        for (const webhook of webhooks) {
          if (Number(webhook.isActive) > 0) {
            activeWebhooks++;
          } else {
            inactiveWebhooks++;
          }
        }

        results.push({
          success: activeWebhooks > 0,
          message: `Webhook validation: ${activeWebhooks} active, ${inactiveWebhooks} inactive`,
          details: { activeWebhooks, inactiveWebhooks, totalWebhooks: webhooks.length },
          duration: Date.now() - testStart
        });
      }

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `Webhook validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0
      }];
    }
  }

  async validateErrorHandling(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const testStart = Date.now();
      
      // Check error logs
      const errorLogs = await blink.db.errorLogs.list({
        where: { userId: this.userId },
        orderBy: { createdAt: 'desc' },
        limit: 10
      });

      // Check if error handling is working by looking at retry patterns
      let retriedErrors = 0;
      let resolvedErrors = 0;

      for (const log of errorLogs) {
        if (Number(log.retryCount) > 0) {
          retriedErrors++;
        }
        if (log.resolvedAt) {
          resolvedErrors++;
        }
      }

      results.push({
        success: true,
        message: `Error handling validation: ${errorLogs.length} total errors, ${retriedErrors} retried, ${resolvedErrors} resolved`,
        details: { 
          totalErrors: errorLogs.length, 
          retriedErrors, 
          resolvedErrors,
          recentErrors: errorLogs.slice(0, 5).map(log => ({
            operation: log.operation,
            errorType: log.errorType,
            retryCount: log.retryCount,
            resolved: !!log.resolvedAt
          }))
        },
        duration: Date.now() - testStart
      });

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `Error handling validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0
      }];
    }
  }

  async validateSyncJobs(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const testStart = Date.now();
      
      // Get sync job metrics
      const metrics = await syncJobManager.getSyncMetrics(this.userId, 30);
      const recentJobs = await syncJobManager.getUserJobs(this.userId, undefined, 10);

      results.push({
        success: true,
        message: `Sync job validation: ${metrics.totalJobs} total jobs, ${metrics.successRate.toFixed(1)}% success rate`,
        details: {
          totalJobs: metrics.totalJobs,
          successRate: metrics.successRate,
          averageDuration: metrics.averageDuration,
          totalRecordsProcessed: metrics.totalRecordsProcessed,
          recentJobs: recentJobs.map(job => ({
            id: job.id,
            provider: job.provider,
            jobType: job.jobType,
            status: job.status,
            progress: job.progress
          }))
        },
        duration: Date.now() - testStart
      });

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `Sync job validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0
      }];
    }
  }

  async validateMarketingAutomation(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const testStart = Date.now();
      
      // Check marketing connections
      const marketingConnections = await blink.db.marketingConnections.list({
        where: { userId: this.userId }
      });

      // Check automation workflows
      const workflows = await blink.db.automationWorkflows.list({
        where: { userId: this.userId }
      });

      let activeConnections = 0;
      let activeWorkflows = 0;

      for (const connection of marketingConnections) {
        if (connection.status === 'connected') {
          activeConnections++;
        }
      }

      for (const workflow of workflows) {
        if (Number(workflow.isActive) > 0) {
          activeWorkflows++;
        }
      }

      results.push({
        success: true,
        message: `Marketing automation validation: ${activeConnections} active connections, ${activeWorkflows} active workflows`,
        details: {
          totalConnections: marketingConnections.length,
          activeConnections,
          totalWorkflows: workflows.length,
          activeWorkflows,
          providers: marketingConnections.map(c => c.provider)
        },
        duration: Date.now() - testStart
      });

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `Marketing automation validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0
      }];
    }
  }

  async validatePerformance(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Test database query performance
      const dbTestStart = Date.now();
      await blink.db.crmConnections.list({
        where: { userId: this.userId }
      });
      const dbDuration = Date.now() - dbTestStart;

      results.push({
        success: dbDuration < 1000, // Should be under 1 second
        message: `Database query performance: ${dbDuration}ms`,
        details: { queryDuration: dbDuration },
        duration: dbDuration
      });

      // Test API response times (if connections exist)
      const connections = await blink.db.crmConnections.list({
        where: { userId: this.userId, status: 'active' }
      });

      if (connections.length > 0) {
        const crmManager = createCRMManager(this.userId);
        const connection = connections[0];
        
        const apiTestStart = Date.now();
        try {
          const integration = await crmManager.getIntegration(connection.provider);
          if (integration) {
            await integration.testConnection();
          }
          const apiDuration = Date.now() - apiTestStart;

          results.push({
            success: apiDuration < 5000, // Should be under 5 seconds
            message: `API response time for ${connection.provider}: ${apiDuration}ms`,
            details: { apiDuration, provider: connection.provider },
            duration: apiDuration
          });
        } catch (error) {
          results.push({
            success: false,
            message: `API performance test failed for ${connection.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: Date.now() - apiTestStart
          });
        }
      }

      return results;
    } catch (error) {
      return [{
        success: false,
        message: `Performance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0
      }];
    }
  }

  private async getConnectionIds(): Promise<string[]> {
    try {
      const connections = await blink.db.crmConnections.list({
        where: { userId: this.userId }
      });
      return connections.map(c => c.id);
    } catch (error) {
      return [];
    }
  }

  async runFullValidation(): Promise<{ [key: string]: ValidationResult[] }> {
    const results: { [key: string]: ValidationResult[] } = {};

    try {
      results.oauth = await this.validateOAuthFlows();
      results.database = await this.validateDatabaseSchema();
      results.api = await this.validateAPIConnectivity();
      results.sync = await this.validateDataSync();
      results.fieldMappings = await this.validateFieldMappings();
      results.webhooks = await this.validateWebhooks();
      results.errorHandling = await this.validateErrorHandling();
      results.syncJobs = await this.validateSyncJobs();
      results.marketing = await this.validateMarketingAutomation();
      results.performance = await this.validatePerformance();
    } catch (error) {
      console.error('Full validation failed:', error);
    }

    return results;
  }
}

export const createIntegrationValidator = (userId: string) => {
  return new IntegrationValidator(userId);
};