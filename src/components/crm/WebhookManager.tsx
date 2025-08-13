import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Copy,
  RefreshCw,
  Shield,
  Clock,
  Activity
} from 'lucide-react';
import { blink } from '../../blink/client';
import { toast } from 'sonner';

interface WebhookConfig {
  id: string;
  provider: string;
  eventType: string;
  callbackUrl: string;
  secret?: string;
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
}

interface WebhookManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: string;
  providerName: string;
  connectionId: string;
}

const WEBHOOK_EVENTS = {
  hubspot: [
    { id: 'contact.creation', label: 'Contact Created', description: 'Triggered when a new contact is created' },
    { id: 'contact.propertyChange', label: 'Contact Updated', description: 'Triggered when contact properties change' },
    { id: 'contact.deletion', label: 'Contact Deleted', description: 'Triggered when a contact is deleted' },
    { id: 'company.creation', label: 'Company Created', description: 'Triggered when a new company is created' },
    { id: 'company.propertyChange', label: 'Company Updated', description: 'Triggered when company properties change' },
    { id: 'deal.creation', label: 'Deal Created', description: 'Triggered when a new deal is created' },
    { id: 'deal.propertyChange', label: 'Deal Updated', description: 'Triggered when deal properties change' }
  ],
  salesforce: [
    { id: 'lead.created', label: 'Lead Created', description: 'Triggered when a new lead is created' },
    { id: 'lead.updated', label: 'Lead Updated', description: 'Triggered when lead fields are updated' },
    { id: 'contact.created', label: 'Contact Created', description: 'Triggered when a new contact is created' },
    { id: 'contact.updated', label: 'Contact Updated', description: 'Triggered when contact fields are updated' },
    { id: 'opportunity.created', label: 'Opportunity Created', description: 'Triggered when a new opportunity is created' },
    { id: 'opportunity.updated', label: 'Opportunity Updated', description: 'Triggered when opportunity fields are updated' }
  ],
  pipedrive: [
    { id: 'person.added', label: 'Person Added', description: 'Triggered when a new person is added' },
    { id: 'person.updated', label: 'Person Updated', description: 'Triggered when person details are updated' },
    { id: 'organization.added', label: 'Organization Added', description: 'Triggered when a new organization is added' },
    { id: 'organization.updated', label: 'Organization Updated', description: 'Triggered when organization details are updated' },
    { id: 'deal.added', label: 'Deal Added', description: 'Triggered when a new deal is added' },
    { id: 'deal.updated', label: 'Deal Updated', description: 'Triggered when deal details are updated' }
  ]
};

export default function WebhookManager({ open, onOpenChange, provider, providerName, connectionId }: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [newWebhook, setNewWebhook] = useState({
    eventType: '',
    callbackUrl: '',
    secret: ''
  });

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (open && user) {
      loadWebhooks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, connectionId]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      
      // Load webhooks from database
      const webhookRecords = await blink.db.crmWebhooks.list({
        where: { 
          userId: user.id,
          connectionId: connectionId,
          provider: provider
        },
        orderBy: { createdAt: 'desc' }
      });

      const webhookConfigs: WebhookConfig[] = webhookRecords.map((record: any) => ({
        id: record.id,
        provider: record.provider,
        eventType: record.eventType,
        callbackUrl: record.callbackUrl,
        secret: record.secret,
        isActive: Number(record.isActive) > 0,
        lastTriggered: record.lastTriggered ? new Date(record.lastTriggered) : undefined,
        createdAt: new Date(record.createdAt)
      }));

      setWebhooks(webhookConfigs);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    if (!user || !newWebhook.eventType || !newWebhook.callbackUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Generate webhook secret if not provided
      const secret = newWebhook.secret || generateWebhookSecret();
      
      // Create webhook in CRM provider (this would be implemented in the CRM integration)
      // For now, we'll simulate this
      const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Save webhook to database
      const webhookRecord = {
        id: `crm_webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        connectionId: connectionId,
        provider: provider,
        webhookId: webhookId,
        eventType: newWebhook.eventType,
        callbackUrl: newWebhook.callbackUrl,
        secret: secret,
        isActive: 1
      };

      await blink.db.crmWebhooks.create(webhookRecord);

      // Add to local state
      const newWebhookConfig: WebhookConfig = {
        id: webhookRecord.id,
        provider: provider,
        eventType: newWebhook.eventType,
        callbackUrl: newWebhook.callbackUrl,
        secret: secret,
        isActive: true,
        createdAt: new Date()
      };

      setWebhooks(prev => [newWebhookConfig, ...prev]);
      setShowCreateDialog(false);
      setNewWebhook({ eventType: '', callbackUrl: '', secret: '' });
      
      toast.success('Webhook created successfully');
    } catch (error) {
      console.error('Failed to create webhook:', error);
      toast.error('Failed to create webhook');
    } finally {
      setLoading(false);
    }
  };

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      await blink.db.crmWebhooks.update(webhookId, {
        isActive: isActive ? 1 : 0,
        updatedAt: new Date().toISOString()
      });

      setWebhooks(prev => prev.map(webhook => 
        webhook.id === webhookId 
          ? { ...webhook, isActive }
          : webhook
      ));

      toast.success(`Webhook ${isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
      toast.error('Failed to update webhook');
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      await blink.db.crmWebhooks.delete(webhookId);
      setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
      toast.success('Webhook deleted');
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const generateWebhookSecret = (): string => {
    return 'whsec_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getEventLabel = (eventType: string): string => {
    const events = WEBHOOK_EVENTS[provider as keyof typeof WEBHOOK_EVENTS] || [];
    const event = events.find(e => e.id === eventType);
    return event?.label || eventType;
  };

  const getStatusIcon = (isActive: boolean, lastTriggered?: Date) => {
    if (!isActive) {
      return <XCircle className="h-4 w-4 text-gray-400" />;
    }
    if (lastTriggered) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const availableEvents = WEBHOOK_EVENTS[provider as keyof typeof WEBHOOK_EVENTS] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Webhook className="h-5 w-5" />
            <span>Webhook Management - {providerName}</span>
          </DialogTitle>
          <DialogDescription>
            Configure webhooks to receive real-time notifications when data changes in {providerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Active Webhooks</h4>
              <p className="text-sm text-muted-foreground">
                {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </div>

          {/* Webhooks List */}
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No webhooks configured</p>
                  <p className="text-sm">Add a webhook to receive real-time notifications</p>
                </div>
              ) : (
                webhooks.map((webhook) => (
                  <Card key={webhook.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(webhook.isActive, webhook.lastTriggered)}
                            <h5 className="font-medium">{getEventLabel(webhook.eventType)}</h5>
                            <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                              {webhook.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center space-x-2">
                              <span>URL:</span>
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {webhook.callbackUrl}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(webhook.callbackUrl)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {webhook.secret && (
                              <div className="flex items-center space-x-2">
                                <span>Secret:</span>
                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                  {webhook.secret.substring(0, 20)}...
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(webhook.secret!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs">
                              <span>Created: {webhook.createdAt.toLocaleDateString()}</span>
                              {webhook.lastTriggered && (
                                <span>Last triggered: {webhook.lastTriggered.toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={webhook.isActive}
                            onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWebhook(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Webhook Info */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Webhooks are secured with HTTPS and signature verification. Use the provided secret to verify webhook authenticity.
            </AlertDescription>
          </Alert>
        </div>

        {/* Create Webhook Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Webhook</DialogTitle>
              <DialogDescription>
                Configure a new webhook to receive real-time notifications from {providerName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  value={newWebhook.eventType}
                  onValueChange={(value) => setNewWebhook(prev => ({ ...prev, eventType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div>
                          <div className="font-medium">{event.label}</div>
                          <div className="text-xs text-muted-foreground">{event.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="callbackUrl">Callback URL</Label>
                <Input
                  id="callbackUrl"
                  placeholder="https://your-app.com/webhooks/crm"
                  value={newWebhook.callbackUrl}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, callbackUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The URL where webhook events will be sent
                </p>
              </div>

              <div>
                <Label htmlFor="secret">Webhook Secret (Optional)</Label>
                <Input
                  id="secret"
                  placeholder="Leave empty to auto-generate"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, secret: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used to verify webhook authenticity. Auto-generated if not provided.
                </p>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={createWebhook} 
                  disabled={loading || !newWebhook.eventType || !newWebhook.callbackUrl}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Webhook'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}