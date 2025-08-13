import { blink } from '../blink/client';

export interface MarketingAutomationProvider {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: 'email' | 'automation' | 'integration';
  features: string[];
  authType: 'oauth' | 'api_key' | 'webhook';
  status: 'available' | 'coming_soon' | 'beta';
}

export interface MarketingConnection {
  id: string;
  userId: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  credentials: Record<string, any>;
  settings: Record<string, any>;
  lastSync?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignSyncData {
  campaignId: string;
  leads: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    customFields?: Record<string, any>;
  }>;
  listId?: string;
  tags?: string[];
  segmentCriteria?: Record<string, any>;
}

export const MARKETING_PROVIDERS: MarketingAutomationProvider[] = [
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sync leads to Mailchimp audiences and trigger automated email campaigns',
    logo: '/logos/mailchimp.svg',
    category: 'email',
    features: ['Audience Sync', 'Tag Management', 'Campaign Triggers', 'Analytics'],
    authType: 'oauth',
    status: 'available'
  },
  {
    id: 'constant_contact',
    name: 'Constant Contact',
    description: 'Add leads to contact lists and launch email marketing campaigns',
    logo: '/logos/constant-contact.svg',
    category: 'email',
    features: ['Contact Lists', 'Email Campaigns', 'Event Tracking', 'Segmentation'],
    authType: 'oauth',
    status: 'available'
  },
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    description: 'Advanced marketing automation with lead scoring and behavioral triggers',
    logo: '/logos/activecampaign.svg',
    category: 'automation',
    features: ['Automation Workflows', 'Lead Scoring', 'Behavioral Triggers', 'CRM Integration'],
    authType: 'api_key',
    status: 'available'
  },
  {
    id: 'hubspot_marketing',
    name: 'HubSpot Marketing',
    description: 'Comprehensive marketing automation with lead nurturing workflows',
    logo: '/logos/hubspot.svg',
    category: 'automation',
    features: ['Lead Nurturing', 'Email Sequences', 'Landing Pages', 'Analytics'],
    authType: 'oauth',
    status: 'available'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect Svara to 5000+ apps with automated workflows and triggers',
    logo: '/logos/zapier.svg',
    category: 'integration',
    features: ['5000+ App Integrations', 'Custom Workflows', 'Multi-step Zaps', 'Webhooks'],
    authType: 'webhook',
    status: 'available'
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Visual automation platform for complex multi-app workflows',
    logo: '/logos/make.svg',
    category: 'integration',
    features: ['Visual Workflows', 'Advanced Logic', 'Error Handling', 'Scheduling'],
    authType: 'webhook',
    status: 'available'
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Automatically book meetings with qualified leads',
    logo: '/logos/calendly.svg',
    category: 'automation',
    features: ['Meeting Booking', 'Calendar Sync', 'Lead Qualification', 'Follow-up Automation'],
    authType: 'oauth',
    status: 'beta'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get real-time notifications about lead activities and campaign performance',
    logo: '/logos/slack.svg',
    category: 'integration',
    features: ['Real-time Notifications', 'Channel Integration', 'Bot Commands', 'Team Collaboration'],
    authType: 'oauth',
    status: 'available'
  }
];

class MarketingAutomationService {
  async getConnections(userId: string): Promise<MarketingConnection[]> {
    try {
      const connections = await blink.db.marketingConnections.list({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return connections;
    } catch (error) {
      console.error('Error fetching marketing connections:', error);
      return [];
    }
  }

  async createConnection(userId: string, provider: string, credentials: Record<string, any>): Promise<MarketingConnection> {
    const providerInfo = MARKETING_PROVIDERS.find(p => p.id === provider);
    const connection = {
      id: `conn_${Date.now()}`,
      userId,
      provider,
      providerName: providerInfo?.name || provider,
      status: 'connected' as const,
      credentials,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await blink.db.marketingConnections.create(connection);
    return connection;
  }

  async updateConnection(connectionId: string, updates: Partial<MarketingConnection>): Promise<void> {
    await blink.db.marketingConnections.update(connectionId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await blink.db.marketingConnections.delete(connectionId);
  }

  async testConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const connection = await blink.db.marketingConnections.list({
        where: { id: connectionId }
      });

      if (!connection.length) {
        return { success: false, message: 'Connection not found' };
      }

      const conn = connection[0];
      
      // Test connection based on provider
      switch (conn.provider) {
        case 'mailchimp':
          return await this.testMailchimpConnection(conn);
        case 'constant_contact':
          return await this.testConstantContactConnection(conn);
        case 'activecampaign':
          return await this.testActiveCampaignConnection(conn);
        case 'zapier':
          return await this.testZapierConnection(conn);
        default:
          return { success: false, message: 'Provider not supported' };
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      return { success: false, message: 'Connection test failed' };
    }
  }

  private async testMailchimpConnection(connection: MarketingConnection): Promise<{ success: boolean; message: string }> {
    try {
      const response = await blink.data.fetch({
        url: 'https://{{mailchimp_server}}.api.mailchimp.com/3.0/ping',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{mailchimp_api_key}}'
        }
      });

      if (response.status === 200) {
        return { success: true, message: 'Mailchimp connection successful' };
      } else {
        return { success: false, message: 'Mailchimp connection failed' };
      }
    } catch (error) {
      return { success: false, message: 'Mailchimp API error' };
    }
  }

  private async testConstantContactConnection(connection: MarketingConnection): Promise<{ success: boolean; message: string }> {
    try {
      const response = await blink.data.fetch({
        url: 'https://api.constantcontact.com/v2/account/info',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{constant_contact_access_token}}'
        }
      });

      if (response.status === 200) {
        return { success: true, message: 'Constant Contact connection successful' };
      } else {
        return { success: false, message: 'Constant Contact connection failed' };
      }
    } catch (error) {
      return { success: false, message: 'Constant Contact API error' };
    }
  }

  private async testActiveCampaignConnection(connection: MarketingConnection): Promise<{ success: boolean; message: string }> {
    try {
      const response = await blink.data.fetch({
        url: 'https://{{activecampaign_account}}.api-us1.com/api/3/users/me',
        method: 'GET',
        headers: {
          'Api-Token': '{{activecampaign_api_key}}'
        }
      });

      if (response.status === 200) {
        return { success: true, message: 'ActiveCampaign connection successful' };
      } else {
        return { success: false, message: 'ActiveCampaign connection failed' };
      }
    } catch (error) {
      return { success: false, message: 'ActiveCampaign API error' };
    }
  }

  private async testZapierConnection(connection: MarketingConnection): Promise<{ success: boolean; message: string }> {
    try {
      // For Zapier, we test by sending a test webhook
      const response = await blink.data.fetch({
        url: connection.credentials.webhookUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          test: true,
          timestamp: new Date().toISOString(),
          source: 'svara'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        return { success: true, message: 'Zapier webhook connection successful' };
      } else {
        return { success: false, message: 'Zapier webhook connection failed' };
      }
    } catch (error) {
      return { success: false, message: 'Zapier webhook error' };
    }
  }

  async syncCampaignToProvider(connectionId: string, campaignData: CampaignSyncData): Promise<{ success: boolean; message: string; syncedCount?: number }> {
    try {
      const connection = await blink.db.marketingConnections.list({
        where: { id: connectionId }
      });

      if (!connection.length) {
        return { success: false, message: 'Connection not found' };
      }

      const conn = connection[0];

      switch (conn.provider) {
        case 'mailchimp':
          return await this.syncToMailchimp(conn, campaignData);
        case 'constant_contact':
          return await this.syncToConstantContact(conn, campaignData);
        case 'activecampaign':
          return await this.syncToActiveCampaign(conn, campaignData);
        case 'zapier':
          return await this.syncToZapier(conn, campaignData);
        default:
          return { success: false, message: 'Provider sync not implemented' };
      }
    } catch (error) {
      console.error('Error syncing campaign:', error);
      return { success: false, message: 'Campaign sync failed' };
    }
  }

  private async syncToMailchimp(connection: MarketingConnection, campaignData: CampaignSyncData): Promise<{ success: boolean; message: string; syncedCount?: number }> {
    try {
      let syncedCount = 0;
      const listId = campaignData.listId || connection.settings.defaultListId;

      if (!listId) {
        return { success: false, message: 'No Mailchimp list specified' };
      }

      // Batch add members to Mailchimp list
      const members = campaignData.leads.map(lead => ({
        email_address: lead.email,
        status: 'subscribed',
        merge_fields: {
          FNAME: lead.firstName || '',
          LNAME: lead.lastName || '',
          COMPANY: lead.company || '',
          PHONE: lead.phone || '',
          ...lead.customFields
        },
        tags: campaignData.tags || []
      }));

      const response = await blink.data.fetch({
        url: `https://{{mailchimp_server}}.api.mailchimp.com/3.0/lists/${listId}`,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {{mailchimp_api_key}}',
          'Content-Type': 'application/json'
        },
        body: {
          members,
          update_existing: true
        }
      });

      if (response.status === 200) {
        syncedCount = members.length;
        await this.updateConnection(connection.id, { lastSync: new Date() });
        return { success: true, message: `Successfully synced ${syncedCount} leads to Mailchimp`, syncedCount };
      } else {
        return { success: false, message: 'Failed to sync leads to Mailchimp' };
      }
    } catch (error) {
      return { success: false, message: 'Mailchimp sync error' };
    }
  }

  private async syncToConstantContact(connection: MarketingConnection, campaignData: CampaignSyncData): Promise<{ success: boolean; message: string; syncedCount?: number }> {
    try {
      let syncedCount = 0;
      const listId = campaignData.listId || connection.settings.defaultListId;

      for (const lead of campaignData.leads) {
        const contactData = {
          email_addresses: [{ email_address: lead.email }],
          first_name: lead.firstName || '',
          last_name: lead.lastName || '',
          company_name: lead.company || '',
          phone_numbers: lead.phone ? [{ phone_number: lead.phone }] : [],
          lists: listId ? [{ id: listId }] : []
        };

        const response = await blink.data.fetch({
          url: 'https://api.constantcontact.com/v2/contacts',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer {{constant_contact_access_token}}',
            'Content-Type': 'application/json'
          },
          body: contactData
        });

        if (response.status === 201) {
          syncedCount++;
        }
      }

      await this.updateConnection(connection.id, { lastSync: new Date() });
      return { success: true, message: `Successfully synced ${syncedCount} leads to Constant Contact`, syncedCount };
    } catch (error) {
      return { success: false, message: 'Constant Contact sync error' };
    }
  }

  private async syncToActiveCampaign(connection: MarketingConnection, campaignData: CampaignSyncData): Promise<{ success: boolean; message: string; syncedCount?: number }> {
    try {
      let syncedCount = 0;

      for (const lead of campaignData.leads) {
        const contactData = {
          contact: {
            email: lead.email,
            firstName: lead.firstName || '',
            lastName: lead.lastName || '',
            phone: lead.phone || '',
            fieldValues: Object.entries(lead.customFields || {}).map(([field, value]) => ({
              field,
              value: String(value)
            }))
          }
        };

        const response = await blink.data.fetch({
          url: 'https://{{activecampaign_account}}.api-us1.com/api/3/contacts',
          method: 'POST',
          headers: {
            'Api-Token': '{{activecampaign_api_key}}',
            'Content-Type': 'application/json'
          },
          body: contactData
        });

        if (response.status === 201) {
          syncedCount++;
          
          // Add tags if specified
          if (campaignData.tags && campaignData.tags.length > 0) {
            const contactId = response.body.contact.id;
            for (const tag of campaignData.tags) {
              await blink.data.fetch({
                url: 'https://{{activecampaign_account}}.api-us1.com/api/3/contactTags',
                method: 'POST',
                headers: {
                  'Api-Token': '{{activecampaign_api_key}}',
                  'Content-Type': 'application/json'
                },
                body: {
                  contactTag: {
                    contact: contactId,
                    tag
                  }
                }
              });
            }
          }
        }
      }

      await this.updateConnection(connection.id, { lastSync: new Date() });
      return { success: true, message: `Successfully synced ${syncedCount} leads to ActiveCampaign`, syncedCount };
    } catch (error) {
      return { success: false, message: 'ActiveCampaign sync error' };
    }
  }

  private async syncToZapier(connection: MarketingConnection, campaignData: CampaignSyncData): Promise<{ success: boolean; message: string; syncedCount?: number }> {
    try {
      const webhookUrl = connection.credentials.webhookUrl;
      
      if (!webhookUrl) {
        return { success: false, message: 'No Zapier webhook URL configured' };
      }

      // Send campaign data to Zapier webhook
      const response = await blink.data.fetch({
        url: webhookUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          event: 'campaign_sync',
          campaignId: campaignData.campaignId,
          leads: campaignData.leads,
          tags: campaignData.tags,
          timestamp: new Date().toISOString(),
          source: 'svara'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        await this.updateConnection(connection.id, { lastSync: new Date() });
        return { 
          success: true, 
          message: `Successfully triggered Zapier workflow with ${campaignData.leads.length} leads`, 
          syncedCount: campaignData.leads.length 
        };
      } else {
        return { success: false, message: 'Failed to trigger Zapier webhook' };
      }
    } catch (error) {
      return { success: false, message: 'Zapier webhook error' };
    }
  }

  async getProviderLists(connectionId: string): Promise<Array<{ id: string; name: string; memberCount?: number }>> {
    try {
      const connection = await blink.db.marketingConnections.list({
        where: { id: connectionId }
      });

      if (!connection.length) {
        return [];
      }

      const conn = connection[0];

      switch (conn.provider) {
        case 'mailchimp':
          return await this.getMailchimpLists(conn);
        case 'constant_contact':
          return await this.getConstantContactLists(conn);
        case 'activecampaign':
          return await this.getActiveCampaignLists(conn);
        default:
          return [];
      }
    } catch (error) {
      console.error('Error fetching provider lists:', error);
      return [];
    }
  }

  private async getMailchimpLists(connection: MarketingConnection): Promise<Array<{ id: string; name: string; memberCount?: number }>> {
    try {
      const response = await blink.data.fetch({
        url: 'https://{{mailchimp_server}}.api.mailchimp.com/3.0/lists',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{mailchimp_api_key}}'
        }
      });

      if (response.status === 200) {
        return response.body.lists.map((list: any) => ({
          id: list.id,
          name: list.name,
          memberCount: list.stats.member_count
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  private async getConstantContactLists(connection: MarketingConnection): Promise<Array<{ id: string; name: string; memberCount?: number }>> {
    try {
      const response = await blink.data.fetch({
        url: 'https://api.constantcontact.com/v2/lists',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{constant_contact_access_token}}'
        }
      });

      if (response.status === 200) {
        return response.body.map((list: any) => ({
          id: list.id,
          name: list.name,
          memberCount: list.contact_count
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  private async getActiveCampaignLists(connection: MarketingConnection): Promise<Array<{ id: string; name: string; memberCount?: number }>> {
    try {
      const response = await blink.data.fetch({
        url: 'https://{{activecampaign_account}}.api-us1.com/api/3/lists',
        method: 'GET',
        headers: {
          'Api-Token': '{{activecampaign_api_key}}'
        }
      });

      if (response.status === 200) {
        return response.body.lists.map((list: any) => ({
          id: list.id,
          name: list.name,
          memberCount: parseInt(list.subscriber_count)
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}

export const marketingAutomationService = new MarketingAutomationService();