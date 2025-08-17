import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  Plus, 
  Settings, 
  Zap, 
  Mail, 
  Calendar, 
  Users, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Webhook,
  Key,
  Globe,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Trash2
} from 'lucide-react';
import { blink } from '../../blink/client';
import { MARKETING_PROVIDERS, marketingAutomationService, MarketingConnection } from '../../services/marketingAutomationConnectors';
import { toast } from 'sonner';

interface MarketingAutomationManagerProps {
  userId: string;
}

export default function MarketingAutomationManager({ userId }: MarketingAutomationManagerProps) {
  const [connections, setConnections] = useState<MarketingConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionForm, setConnectionForm] = useState<Record<string, string>>({});
  const [testingConnection, setTestingConnection] = useState<string>('');
  const [syncingCampaign, setSyncingCampaign] = useState<string>('');

  useEffect(() => {
    loadConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await marketingAutomationService.getConnections(userId);
      setConnections(data);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load marketing connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    setSelectedProvider(provider);
    setConnectionForm({});
    setShowConnectionDialog(true);
  };

  const handleSaveConnection = async () => {
    try {
      const provider = MARKETING_PROVIDERS.find(p => p.id === selectedProvider);
      if (!provider) return;

      await marketingAutomationService.createConnection(userId, selectedProvider, connectionForm);
      toast.success(`Successfully connected to ${provider.name}`);
      setShowConnectionDialog(false);
      loadConnections();
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.error('Failed to save connection');
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    try {
      setTestingConnection(connectionId);
      const result = await marketingAutomationService.testConnection(connectionId);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Connection test failed');
    } finally {
      setTestingConnection('');
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      await marketingAutomationService.deleteConnection(connectionId);
      toast.success('Connection deleted successfully');
      loadConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Failed to delete connection');
    }
  };

  const handleSyncCampaign = async (connectionId: string, campaignId: string) => {
    try {
      setSyncingCampaign(connectionId);
      
      // Get campaign leads
      const campaignLeads = await blink.db.campaignLeads.list({
        where: { campaignId },
        limit: 1000
      });

      const leads = await Promise.all(
        campaignLeads.map(async (cl) => {
          const lead = await blink.db.leads.list({
            where: { id: cl.leadId }
          });
          return lead[0];
        })
      );

      const campaignData = {
        campaignId,
        leads: leads.map(lead => ({
          email: lead.contactEmail,
          firstName: lead.contactName?.split(' ')[0] || '',
          lastName: lead.contactName?.split(' ').slice(1).join(' ') || '',
          company: lead.companyName,
          phone: lead.contactPhone,
          customFields: {
            industry: lead.industry,
            leadScore: lead.leadScore,
            website: lead.website
          }
        })),
        tags: ['svara-lead', `campaign-${campaignId}`]
      };

      const result = await marketingAutomationService.syncCampaignToProvider(connectionId, campaignData);
      
      if (result.success) {
        toast.success(`${result.message} (${result.syncedCount} leads)`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error syncing campaign:', error);
      toast.error('Campaign sync failed');
    } finally {
      setSyncingCampaign('');
    }
  };

  const getProviderIcon = (category: string) => {
    switch (category) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'automation':
        return <Zap className="h-5 w-5" />;
      case 'integration':
        return <Globe className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const renderConnectionForm = () => {
    const provider = MARKETING_PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider) return null;

    switch (provider.authType) {
      case 'api_key':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={connectionForm.apiKey || ''}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            {selectedProvider === 'activecampaign' && (
              <div>
                <Label htmlFor="accountUrl">Account URL</Label>
                <Input
                  id="accountUrl"
                  placeholder="https://youraccountname.api-us1.com"
                  value={connectionForm.accountUrl || ''}
                  onChange={(e) => setConnectionForm(prev => ({ ...prev, accountUrl: e.target.value }))}
                />
              </div>
            )}
          </div>
        );
      
      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={connectionForm.webhookUrl || ''}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Copy this URL from your {provider.name} webhook configuration
              </AlertDescription>
            </Alert>
          </div>
        );
      
      case 'oauth':
        return (
          <div className="space-y-4">
            <Alert>
              <Globe className="h-4 w-4" />
              <AlertDescription>
                OAuth integration for {provider.name} will redirect you to their authorization page
              </AlertDescription>
            </Alert>
            <Button className="w-full" onClick={() => window.open(`/api/oauth/${selectedProvider}`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect with {provider.name}
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Marketing Automation</h2>
          <p className="text-muted-foreground">
            Connect your marketing tools to automate lead nurturing and campaign management
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {connections.filter(c => c.status === 'connected').length} Connected
        </Badge>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Available Providers</TabsTrigger>
          <TabsTrigger value="connections">My Connections</TabsTrigger>
          <TabsTrigger value="workflows">Automation Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MARKETING_PROVIDERS.map((provider) => {
              const isConnected = connections.some(c => c.provider === provider.id && c.status === 'connected');
              
              return (
                <Card key={provider.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getProviderIcon(provider.category)}
                        <div>
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {provider.category}
                          </Badge>
                        </div>
                      </div>
                      {provider.status === 'beta' && (
                        <Badge variant="secondary">Beta</Badge>
                      )}
                      {provider.status === 'coming_soon' && (
                        <Badge variant="outline">Coming Soon</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 min-h-[3rem]">
                      {provider.description}
                    </CardDescription>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Features</h5>
                        <div className="flex flex-wrap gap-1">
                          {provider.features.slice(0, 3).map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {provider.features.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{provider.features.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          {provider.authType === 'oauth' && <Key className="h-3 w-3" />}
                          {provider.authType === 'api_key' && <Settings className="h-3 w-3" />}
                          {provider.authType === 'webhook' && <Webhook className="h-3 w-3" />}
                          <span className="text-xs text-muted-foreground capitalize">
                            {provider.authType.replace('_', ' ')}
                          </span>
                        </div>
                        
                        {isConnected ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(provider.id)}
                            disabled={provider.status === 'coming_soon'}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Connections Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Connect your marketing tools to start automating your lead nurturing workflows
                </p>
                <Button onClick={() => setShowConnectionDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Connection
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.map((connection) => {
                const provider = MARKETING_PROVIDERS.find(p => p.id === connection.provider);
                if (!provider) return null;

                return (
                  <Card key={connection.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getProviderIcon(provider.category)}
                          <div>
                            <CardTitle className="text-lg">{provider.name}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              {getStatusIcon(connection.status)}
                              <span className="text-sm text-muted-foreground capitalize">
                                {connection.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(connection.id)}
                            disabled={testingConnection === connection.id}
                          >
                            {testingConnection === connection.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteConnection(connection.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {connection.lastSync && (
                          <div className="text-sm text-muted-foreground">
                            Last sync: {new Date(connection.lastSync).toLocaleString()}
                          </div>
                        )}
                        
                        {connection.errorMessage && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{connection.errorMessage}</AlertDescription>
                          </Alert>
                        )}

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {/* Open sync dialog */}}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Sync Campaign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Automation Workflows</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create automated workflows to nurture leads and trigger marketing campaigns
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connection Dialog */}
      <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Connect to {MARKETING_PROVIDERS.find(p => p.id === selectedProvider)?.name}
            </DialogTitle>
            <DialogDescription>
              Configure your connection settings to start syncing leads and automating campaigns
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {renderConnectionForm()}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowConnectionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConnection}>
                Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}