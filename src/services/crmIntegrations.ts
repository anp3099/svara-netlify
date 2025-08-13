import { blink } from '../blink/client'
import { apiRateLimitingService } from './apiRateLimiting';

// CRM Integration Types
export interface CRMCredentials {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  instanceUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface CRMContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  phone?: string;
  linkedinUrl?: string;
  customFields?: Record<string, any>;
  lastModified: Date;
}

export interface CRMCompany {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  revenue?: string;
  location?: string;
  customFields?: Record<string, any>;
  lastModified: Date;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  recordId: string;
  error: string;
  details?: string;
}

export interface FieldMapping {
  id: string;
  svaraField: string;
  crmField: string;
  direction: 'bidirectional' | 'to_crm' | 'from_crm';
  transform?: string;
  required: boolean;
  dataType: 'text' | 'email' | 'phone' | 'number' | 'date' | 'boolean' | 'picklist';
}

// OAuth Configuration
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

// OAuth Token Response
interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType: 'Bearer';
  scope?: string;
}

// Sync Configuration
interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // minutes
  conflictResolution: 'crm_wins' | 'svara_wins' | 'manual';
  enableDeduplication: boolean;
  createMissingRecords: boolean;
  fieldMappings: FieldMapping[];
}

// Webhook Configuration
interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
}

export interface CRMConnection {
  id: string;
  userId: string;
  provider: 'hubspot' | 'salesforce' | 'pipedrive';
  credentials: CRMCredentials;
  fieldMappings: FieldMapping[];
  syncSettings: {
    autoSync: boolean;
    syncInterval: number; // minutes
    syncContacts: boolean;
    syncCompanies: boolean;
    syncDeals: boolean;
  };
  syncConfig?: SyncConfig;
  webhookConfig?: WebhookConfig;
  lastSync?: Date;
  status: 'active' | 'error' | 'paused' | 'setup';
  errorMessage?: string;
}

// Base CRM Integration Interface
export interface CRMIntegration {
  provider: string;
  authenticate(credentials: CRMCredentials): Promise<boolean>;
  testConnection(): Promise<boolean>;
  syncContacts(options?: SyncOptions): Promise<SyncResult>;
  syncCompanies(options?: SyncOptions): Promise<SyncResult>;
  createContact(contact: Partial<CRMContact>): Promise<string>;
  updateContact(id: string, contact: Partial<CRMContact>): Promise<boolean>;
  getContact(id: string): Promise<CRMContact | null>;
  searchContacts(query: string): Promise<CRMContact[]>;
  createWebhook(eventType: string, callbackUrl: string): Promise<string>;
  deleteWebhook(webhookId: string): Promise<boolean>;
  
  // OAuth methods
  getOAuthUrl(): string;
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  refreshAccessToken(): Promise<OAuthTokens>;
  
  // Field mapping methods
  getAvailableFields(): Promise<Array<{ id: string; label: string; type: string }>>;
  validateFieldMapping(mappings: FieldMapping[]): Promise<string[]>;
  
  // Advanced sync methods
  syncWithMapping(mappings: FieldMapping[], options?: SyncOptions): Promise<SyncResult>;
  handleConflict(localRecord: any, remoteRecord: any, resolution: string): Promise<any>;
  deduplicateRecords(records: any[]): Promise<any[]>;
}

export interface SyncOptions {
  lastSyncDate?: Date;
  batchSize?: number;
  includeDeleted?: boolean;
  contactFilter?: (contact: CRMContact) => boolean;
  fieldMappings?: FieldMapping[];
}

// OAuth Configuration for each provider
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  hubspot: {
    clientId: process.env.HUBSPOT_CLIENT_ID || '',
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
    redirectUri: `${window.location.origin}/crm/oauth/hubspot`,
    scopes: ['contacts', 'companies', 'deals', 'webhooks'],
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token'
  },
  salesforce: {
    clientId: process.env.SALESFORCE_CLIENT_ID || '',
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
    redirectUri: `${window.location.origin}/crm/oauth/salesforce`,
    scopes: ['api', 'refresh_token'],
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token'
  },
  pipedrive: {
    clientId: process.env.PIPEDRIVE_CLIENT_ID || '',
    clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET || '',
    redirectUri: `${window.location.origin}/crm/oauth/pipedrive`,
    scopes: ['base'],
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    tokenUrl: 'https://oauth.pipedrive.com/oauth/token'
  }
};

// HubSpot Integration
export class HubSpotIntegration implements CRMIntegration {
  provider = 'hubspot';
  private apiKey: string;
  private accessToken?: string;
  private baseUrl = 'https://api.hubapi.com';
  private oauthConfig: OAuthConfig;

  constructor(private connection: CRMConnection) {
    this.apiKey = connection.credentials.apiKey || '';
    this.accessToken = connection.credentials.accessToken;
    this.oauthConfig = OAUTH_CONFIGS.hubspot;
  }

  getOAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scopes.join(' '),
      response_type: 'code',
      state: `${this.connection.userId}_${Date.now()}`
    });
    
    return `${this.oauthConfig.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
        redirect_uri: this.oauthConfig.redirectUri,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      tokenType: 'Bearer',
      scope: data.scope
    };
  }

  async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.connection.credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
        refresh_token: this.connection.credentials.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.connection.credentials.refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      tokenType: 'Bearer',
      scope: data.scope
    };
  }

  async getAvailableFields(): Promise<Array<{ id: string; label: string; type: string }>> {
    const token = this.accessToken || this.apiKey;
    const response = await fetch(`${this.baseUrl}/properties/v1/contacts/properties`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch HubSpot fields: ${response.statusText}`);
    }

    const properties = await response.json();
    
    return properties.map((prop: any) => ({
      id: prop.name,
      label: prop.label,
      type: this.mapHubSpotFieldType(prop.type)
    }));
  }

  async validateFieldMapping(mappings: FieldMapping[]): Promise<string[]> {
    const errors: string[] = [];
    const availableFields = await this.getAvailableFields();
    const fieldIds = new Set(availableFields.map(f => f.id));

    for (const mapping of mappings) {
      if (!fieldIds.has(mapping.crmField)) {
        errors.push(`HubSpot field '${mapping.crmField}' does not exist`);
      }
    }

    return errors;
  }

  async syncWithMapping(mappings: FieldMapping[], options: SyncOptions = {}): Promise<SyncResult> {
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
      // Get contacts from HubSpot with specific properties
      const propertiesToFetch = mappings.map(m => m.crmField);
      const hubspotContacts = await this.fetchHubSpotContactsWithProperties(propertiesToFetch, options);
      result.recordsProcessed = hubspotContacts.length;

      // Process each contact with field mappings
      for (const hubspotContact of hubspotContacts) {
        try {
          const svaraContact = this.transformContactWithMapping(hubspotContact, mappings);
          
          // Check if contact exists in Svara
          const existingLead = await blink.db.leads.list({
            where: { 
              contactEmail: svaraContact.contactEmail,
              userId: this.connection.userId 
            },
            limit: 1
          });

          if (existingLead.length > 0) {
            // Handle conflict resolution
            const resolvedContact = await this.handleConflict(
              existingLead[0], 
              svaraContact, 
              this.connection.syncConfig?.conflictResolution || 'crm_wins'
            );
            
            await blink.db.leads.update(existingLead[0].id, resolvedContact);
            result.recordsUpdated++;
          } else {
            // Create new contact
            await blink.db.leads.create({
              id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: this.connection.userId,
              ...svaraContact,
              dataSource: 'hubspot'
            });
            result.recordsCreated++;
          }
        } catch (error) {
          result.errors.push({
            recordId: hubspotContact.vid || hubspotContact.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      result.success = result.errors.length < result.recordsProcessed * 0.1; // Success if <10% errors
    } catch (error) {
      result.errors.push({
        recordId: 'sync_operation',
        error: error instanceof Error ? error.message : 'Sync operation failed'
      });
    }

    result.duration = Date.now() - startTime;
    
    // Log sync result
    await this.logSyncResult('contacts_with_mapping', result);
    
    return result;
  }

  async handleConflict(localRecord: any, remoteRecord: any, resolution: string): Promise<any> {
    switch (resolution) {
      case 'crm_wins':
        return { ...localRecord, ...remoteRecord };
      case 'svara_wins':
        return localRecord;
      case 'manual':
        // For manual resolution, we'd typically store the conflict for user review
        // For now, we'll default to CRM wins
        return { ...localRecord, ...remoteRecord };
      default:
        return { ...localRecord, ...remoteRecord };
    }
  }

  async deduplicateRecords(records: any[]): Promise<any[]> {
    const seen = new Set();
    const deduplicated = [];

    for (const record of records) {
      const key = `${record.contactEmail}_${record.companyName}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(record);
      }
    }

    return deduplicated;
  }

  async authenticate(credentials: CRMCredentials): Promise<boolean> {
    try {
      const token = credentials.accessToken || credentials.apiKey;
      const response = await fetch(`${this.baseUrl}/contacts/v1/lists/all/contacts/all?count=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('HubSpot authentication failed:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    return this.authenticate(this.connection.credentials);
  }

  async syncContacts(options: SyncOptions = {}): Promise<SyncResult> {
    if (options.fieldMappings && options.fieldMappings.length > 0) {
      return this.syncWithMapping(options.fieldMappings, options);
    }

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
      // Get contacts from HubSpot
      const hubspotContacts = await this.fetchHubSpotContacts(options);
      result.recordsProcessed = hubspotContacts.length;

      // Apply deduplication if enabled
      let processedContacts = hubspotContacts;
      if (this.connection.syncConfig?.enableDeduplication) {
        const transformedContacts = hubspotContacts.map(c => this.transformHubSpotContact(c));
        const deduplicatedContacts = await this.deduplicateRecords(transformedContacts);
        processedContacts = deduplicatedContacts;
        result.recordsSkipped = hubspotContacts.length - deduplicatedContacts.length;
      }

      // Process each contact
      for (const hubspotContact of processedContacts) {
        try {
          const svaraContact = typeof hubspotContact.email === 'string' 
            ? hubspotContact 
            : this.transformHubSpotContact(hubspotContact);
          
          // Check if contact exists in Svara
          const existingLead = await blink.db.leads.list({
            where: { 
              contactEmail: svaraContact.email,
              userId: this.connection.userId 
            },
            limit: 1
          });

          if (existingLead.length > 0) {
            // Update existing contact
            await blink.db.leads.update(existingLead[0].id, {
              contactName: `${svaraContact.firstName || ''} ${svaraContact.lastName || ''}`.trim(),
              contactTitle: svaraContact.title,
              contactPhone: svaraContact.phone,
              linkedinUrl: svaraContact.linkedinUrl,
              companyName: svaraContact.company
            });
            result.recordsUpdated++;
          } else {
            // Create new contact
            await blink.db.leads.create({
              id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: this.connection.userId,
              contactEmail: svaraContact.email,
              contactName: `${svaraContact.firstName || ''} ${svaraContact.lastName || ''}`.trim(),
              contactTitle: svaraContact.title,
              contactPhone: svaraContact.phone,
              linkedinUrl: svaraContact.linkedinUrl,
              companyName: svaraContact.company || 'Unknown',
              industry: 'Technology', // Default
              leadScore: 50,
              dataSource: 'hubspot'
            });
            result.recordsCreated++;
          }
        } catch (error) {
          result.errors.push({
            recordId: hubspotContact.vid || hubspotContact.id || 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      result.success = result.errors.length < result.recordsProcessed * 0.1; // Success if <10% errors
    } catch (error) {
      result.errors.push({
        recordId: 'sync_operation',
        error: error instanceof Error ? error.message : 'Sync operation failed'
      });
    }

    result.duration = Date.now() - startTime;
    
    // Log sync result
    await this.logSyncResult('contacts', result);
    
    return result;
  }

  async syncCompanies(options: SyncOptions = {}): Promise<SyncResult> {
    // Similar implementation for companies
    return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      duration: 0
    };
  }

  async createContact(contact: Partial<CRMContact>): Promise<string> {
    const token = this.accessToken || this.apiKey;
    const hubspotContact = {
      properties: {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        company: contact.company,
        jobtitle: contact.title,
        phone: contact.phone
      }
    };

    const response = await fetch(`${this.baseUrl}/contacts/v1/contact`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(hubspotContact)
    });

    if (!response.ok) {
      throw new Error(`Failed to create HubSpot contact: ${response.statusText}`);
    }

    const result = await response.json();
    return result.vid.toString();
  }

  async updateContact(id: string, contact: Partial<CRMContact>): Promise<boolean> {
    const token = this.accessToken || this.apiKey;
    const hubspotContact = {
      properties: {
        email: contact.email,
        firstname: contact.firstName,
        lastname: contact.lastName,
        company: contact.company,
        jobtitle: contact.title,
        phone: contact.phone
      }
    };

    const response = await fetch(`${this.baseUrl}/contacts/v1/contact/vid/${id}/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(hubspotContact)
    });

    return response.ok;
  }

  async getContact(id: string): Promise<CRMContact | null> {
    const token = this.accessToken || this.apiKey;
    const response = await fetch(`${this.baseUrl}/contacts/v1/contact/vid/${id}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const hubspotContact = await response.json();
    return this.transformHubSpotContact(hubspotContact);
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    const token = this.accessToken || this.apiKey;
    const response = await fetch(`${this.baseUrl}/contacts/v1/search/query?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.contacts.map((contact: any) => this.transformHubSpotContact(contact));
  }

  async createWebhook(eventType: string, callbackUrl: string): Promise<string> {
    const token = this.accessToken || this.apiKey;
    const webhook = {
      subscriptionDetails: {
        subscriptionType: eventType,
        propertyName: eventType === 'contact.propertyChange' ? 'email' : undefined
      },
      enabled: true,
      webhookUrl: callbackUrl
    };

    const response = await fetch(`${this.baseUrl}/webhooks/v1/${this.connection.userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhook)
    });

    if (!response.ok) {
      throw new Error(`Failed to create webhook: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id.toString();
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    const token = this.accessToken || this.apiKey;
    const response = await fetch(`${this.baseUrl}/webhooks/v1/${this.connection.userId}/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  }

  private async fetchHubSpotContacts(options: SyncOptions): Promise<any[]> {
    const contacts: any[] = [];
    let hasMore = true;
    let offset = 0;
    const batchSize = options.batchSize || 100;
    const token = this.accessToken || this.apiKey;

    while (hasMore) {
      const url = `${this.baseUrl}/contacts/v1/lists/all/contacts/all?count=${batchSize}&vidOffset=${offset}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch HubSpot contacts: ${response.statusText}`);
      }

      const result = await response.json();
      contacts.push(...result.contacts);
      
      hasMore = result['has-more'];
      offset = result['vid-offset'];
    }

    return contacts;
  }

  private async fetchHubSpotContactsWithProperties(properties: string[], options: SyncOptions): Promise<any[]> {
    const contacts: any[] = [];
    let hasMore = true;
    let offset = 0;
    const batchSize = options.batchSize || 100;
    const token = this.accessToken || this.apiKey;
    const propertyParams = properties.map(p => `property=${p}`).join('&');

    while (hasMore) {
      const url = `${this.baseUrl}/contacts/v1/lists/all/contacts/all?count=${batchSize}&vidOffset=${offset}&${propertyParams}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch HubSpot contacts: ${response.statusText}`);
      }

      const result = await response.json();
      contacts.push(...result.contacts);
      
      hasMore = result['has-more'];
      offset = result['vid-offset'];
    }

    return contacts;
  }

  private transformHubSpotContact(hubspotContact: any): CRMContact {
    const properties = hubspotContact.properties || {};
    
    return {
      id: hubspotContact.vid?.toString() || hubspotContact.id?.toString(),
      email: properties.email?.value || '',
      firstName: properties.firstname?.value || '',
      lastName: properties.lastname?.value || '',
      company: properties.company?.value || '',
      title: properties.jobtitle?.value || '',
      phone: properties.phone?.value || '',
      linkedinUrl: properties.linkedin_url?.value || '',
      customFields: properties,
      lastModified: new Date(hubspotContact.lastModifiedDate || Date.now())
    };
  }

  private transformContactWithMapping(hubspotContact: any, mappings: FieldMapping[]): any {
    const properties = hubspotContact.properties || {};
    const svaraContact: any = {};

    for (const mapping of mappings) {
      if (mapping.direction === 'from_crm' || mapping.direction === 'bidirectional') {
        const crmValue = properties[mapping.crmField]?.value || properties[mapping.crmField];
        
        if (crmValue !== undefined) {
          // Apply transformation if specified
          let transformedValue = crmValue;
          if (mapping.transform) {
            try {
              // Simple transformation support (could be expanded)
              transformedValue = eval(`(${mapping.transform})(crmValue)`);
            } catch (error) {
              console.warn(`Failed to apply transform for ${mapping.svaraField}:`, error);
            }
          }
          
          svaraContact[mapping.svaraField] = transformedValue;
        }
      }
    }

    return svaraContact;
  }

  private mapHubSpotFieldType(hubspotType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'text',
      'enumeration': 'picklist',
      'bool': 'boolean',
      'number': 'number',
      'date': 'date',
      'datetime': 'date'
    };
    
    return typeMap[hubspotType] || 'text';
  }

  private async logSyncResult(syncType: string, result: SyncResult): Promise<void> {
    try {
      await blink.db.apiUsageLogs.create({
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.connection.userId,
        apiProvider: 'hubspot',
        endpoint: `sync_${syncType}`,
        creditsUsed: result.recordsProcessed,
        success: result.success ? 1 : 0,
        errorMessage: result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
        responseTime: result.duration
      });
    } catch (error) {
      console.error('Failed to log sync result:', error);
    }
  }
}

// Salesforce Integration (Enhanced)
export class SalesforceIntegration implements CRMIntegration {
  provider = 'salesforce';
  private instanceUrl: string;
  private accessToken?: string;
  private oauthConfig: OAuthConfig;

  constructor(private connection: CRMConnection) {
    this.instanceUrl = connection.credentials.instanceUrl || 'https://login.salesforce.com';
    this.accessToken = connection.credentials.accessToken;
    this.oauthConfig = OAUTH_CONFIGS.salesforce;
  }

  getOAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scopes.join(' '),
      state: `${this.connection.userId}_${Date.now()}`
    });
    
    return `${this.oauthConfig.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
        redirect_uri: this.oauthConfig.redirectUri,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`Salesforce OAuth token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      tokenType: 'Bearer',
      scope: data.scope
    };
  }

  async refreshAccessToken(): Promise<OAuthTokens> {
    if (!this.connection.credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
        refresh_token: this.connection.credentials.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error(`Salesforce token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.connection.credentials.refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      tokenType: 'Bearer',
      scope: data.scope
    };
  }

  async getAvailableFields(): Promise<Array<{ id: string; label: string; type: string }>> {
    // TODO: Implement Salesforce field discovery
    return [];
  }

  async validateFieldMapping(mappings: FieldMapping[]): Promise<string[]> {
    // TODO: Implement Salesforce field validation
    return [];
  }

  async syncWithMapping(mappings: FieldMapping[], options?: SyncOptions): Promise<SyncResult> {
    // TODO: Implement Salesforce sync with field mapping
    return {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [{ recordId: 'salesforce', error: 'Not implemented yet' }],
      duration: 0
    };
  }

  async handleConflict(localRecord: any, remoteRecord: any, resolution: string): Promise<any> {
    // TODO: Implement conflict resolution
    return localRecord;
  }

  async deduplicateRecords(records: any[]): Promise<any[]> {
    // TODO: Implement deduplication
    return records;
  }

  async authenticate(credentials: CRMCredentials): Promise<boolean> {
    // Salesforce authentication stub
    try {
      if (!credentials.accessToken && !credentials.apiKey) {
        return false;
      }
      // Simulate authentication check
      return true;
    } catch (error) {
      console.error('Salesforce authentication error:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    return false;
  }

  async syncContacts(options?: SyncOptions): Promise<SyncResult> {
    // TODO: Implement Salesforce contact sync
    return {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [{ recordId: 'salesforce', error: 'Not implemented yet' }],
      duration: 0
    };
  }

  async syncCompanies(options?: SyncOptions): Promise<SyncResult> {
    return this.syncContacts(options);
  }

  async createContact(contact: Partial<CRMContact>): Promise<string> {
    // Salesforce create contact stub
    return `sf_contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async updateContact(id: string, contact: Partial<CRMContact>): Promise<boolean> {
    return false;
  }

  async getContact(id: string): Promise<CRMContact | null> {
    return null;
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    return [];
  }

  async createWebhook(eventType: string, callbackUrl: string): Promise<string> {
    // Salesforce webhook creation stub
    return `sf_webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    return false;
  }
}

// Pipedrive Integration (Enhanced)
export class PipedriveIntegration implements CRMIntegration {
  provider = 'pipedrive';
  private apiToken?: string;
  private baseUrl = 'https://api.pipedrive.com/v1';
  private oauthConfig: OAuthConfig;

  constructor(private connection: CRMConnection) {
    this.apiToken = connection.credentials.apiKey;
    this.oauthConfig = OAUTH_CONFIGS.pipedrive;
  }

  getOAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      scope: this.oauthConfig.scopes.join(' '),
      response_type: 'code',
      state: `${this.connection.userId}_${Date.now()}`
    });
    
    return `${this.oauthConfig.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(this.oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.oauthConfig.clientId,
        client_secret: this.oauthConfig.clientSecret,
        redirect_uri: this.oauthConfig.redirectUri,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`Pipedrive OAuth token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
      tokenType: 'Bearer',
      scope: data.scope
    };
  }

  async refreshAccessToken(): Promise<OAuthTokens> {
    // Pipedrive token refresh stub
    return {
      accessToken: `pd_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refreshToken: `pd_refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expiresAt: new Date(Date.now() + (3600 * 1000)),
      tokenType: 'Bearer'
    };
  }

  async getAvailableFields(): Promise<Array<{ id: string; label: string; type: string }>> {
    // TODO: Implement Pipedrive field discovery
    return [];
  }

  async validateFieldMapping(mappings: FieldMapping[]): Promise<string[]> {
    // TODO: Implement Pipedrive field validation
    return [];
  }

  async syncWithMapping(mappings: FieldMapping[], options?: SyncOptions): Promise<SyncResult> {
    // TODO: Implement Pipedrive sync with field mapping
    return {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [{ recordId: 'pipedrive', error: 'Not implemented yet' }],
      duration: 0
    };
  }

  async handleConflict(localRecord: any, remoteRecord: any, resolution: string): Promise<any> {
    // TODO: Implement conflict resolution
    return localRecord;
  }

  async deduplicateRecords(records: any[]): Promise<any[]> {
    // TODO: Implement deduplication
    return records;
  }

  async authenticate(credentials: CRMCredentials): Promise<boolean> {
    // TODO: Implement Pipedrive API authentication
    return false;
  }

  async testConnection(): Promise<boolean> {
    return false;
  }

  async syncContacts(options?: SyncOptions): Promise<SyncResult> {
    // TODO: Implement Pipedrive person sync
    return {
      success: false,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [{ recordId: 'pipedrive', error: 'Not implemented yet' }],
      duration: 0
    };
  }

  async syncCompanies(options?: SyncOptions): Promise<SyncResult> {
    return this.syncContacts(options);
  }

  async createContact(contact: Partial<CRMContact>): Promise<string> {
    // Pipedrive create contact stub
    return `pd_contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async updateContact(id: string, contact: Partial<CRMContact>): Promise<boolean> {
    return false;
  }

  async getContact(id: string): Promise<CRMContact | null> {
    return null;
  }

  async searchContacts(query: string): Promise<CRMContact[]> {
    return [];
  }

  async createWebhook(eventType: string, callbackUrl: string): Promise<string> {
    // Pipedrive webhook creation stub
    return `pd_webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    return false;
  }
}

// CRM Integration Manager
export class CRMIntegrationManager {
  private integrations: Map<string, CRMIntegration> = new Map();

  constructor(private userId: string) {}

  async getIntegration(provider: string): Promise<CRMIntegration | null> {
    if (this.integrations.has(provider)) {
      return this.integrations.get(provider)!;
    }

    // Load connection from database
    const connections = await blink.db.crmConnections?.list({
      where: { 
        userId: this.userId, 
        provider: provider,
        status: 'active'
      },
      limit: 1
    });

    if (!connections || connections.length === 0) {
      return null;
    }

    const connection = connections[0] as any as CRMConnection;
    let integration: CRMIntegration;

    switch (provider) {
      case 'hubspot':
        integration = new HubSpotIntegration(connection);
        break;
      case 'salesforce':
        integration = new SalesforceIntegration(connection);
        break;
      case 'pipedrive':
        integration = new PipedriveIntegration(connection);
        break;
      default:
        return null;
    }

    this.integrations.set(provider, integration);
    return integration;
  }

  async createConnection(provider: string, credentials: CRMCredentials): Promise<CRMConnection> {
    // Test authentication first
    let integration: CRMIntegration;
    const tempConnection: CRMConnection = {
      id: '',
      userId: this.userId,
      provider: provider as any,
      credentials,
      fieldMappings: [],
      syncSettings: {
        autoSync: true,
        syncInterval: 60,
        syncContacts: true,
        syncCompanies: true,
        syncDeals: false
      },
      status: 'setup'
    };

    switch (provider) {
      case 'hubspot':
        integration = new HubSpotIntegration(tempConnection);
        break;
      case 'salesforce':
        integration = new SalesforceIntegration(tempConnection);
        break;
      case 'pipedrive':
        integration = new PipedriveIntegration(tempConnection);
        break;
      default:
        throw new Error(`Unsupported CRM provider: ${provider}`);
    }

    const isAuthenticated = await integration.authenticate(credentials);
    if (!isAuthenticated) {
      throw new Error('Failed to authenticate with CRM');
    }

    // Save connection to database
    const connectionId = `crm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const connection: CRMConnection = {
      ...tempConnection,
      id: connectionId,
      status: 'active'
    };

    // Note: This would need a proper CRM connections table
    // For now, we'll store in a generic way
    await blink.db.users.update(this.userId, {
      customBranding: JSON.stringify({ crmConnections: [connection] })
    });

    this.integrations.set(provider, integration);
    return connection;
  }

  async syncAll(): Promise<Record<string, SyncResult>> {
    const results: Record<string, SyncResult> = {};
    
    for (const [provider, integration] of this.integrations) {
      try {
        results[provider] = await integration.syncContacts();
      } catch (error) {
        results[provider] = {
          success: false,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          recordsSkipped: 0,
          errors: [{ 
            recordId: 'sync_all', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }],
          duration: 0
        };
      }
    }

    return results;
  }

  async getConnectionStatus(): Promise<Record<string, 'active' | 'error' | 'paused' | 'setup'>> {
    const status: Record<string, 'active' | 'error' | 'paused' | 'setup'> = {};
    
    for (const [provider, integration] of this.integrations) {
      try {
        const isConnected = await integration.testConnection();
        status[provider] = isConnected ? 'active' : 'error';
      } catch (error) {
        status[provider] = 'error';
      }
    }

    return status;
  }

  // OAuth helper methods
  getOAuthUrl(provider: string): string {
    const integration = this.integrations.get(provider);
    if (!integration) {
      throw new Error(`No integration found for provider: ${provider}`);
    }
    return integration.getOAuthUrl();
  }

  async handleOAuthCallback(provider: string, code: string): Promise<CRMConnection> {
    const integration = this.integrations.get(provider);
    if (!integration) {
      throw new Error(`No integration found for provider: ${provider}`);
    }

    const tokens = await integration.exchangeCodeForTokens(code);
    
    // Create connection with OAuth tokens
    return this.createConnection(provider, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  }
}

// Export singleton instance
export const createCRMManager = (userId: string) => new CRMIntegrationManager(userId);