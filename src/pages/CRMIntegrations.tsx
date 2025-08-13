import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { 
  Settings, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Plus,
  ExternalLink,
  Users,
  Building,
  Calendar,
  BarChart3,
  Loader2,
  MapPin,
  Webhook,
  Shield,
  Clock,
  Activity,
  Timer,
  AlertTriangle,
  Download,
  Upload,
  RefreshCcw,
  Target
} from 'lucide-react';
import { blink } from '../blink/client';
import { createCRMManager, CRMConnection, SyncResult, FieldMapping } from '../services/crmIntegrations';
import { safeCapitalize } from '../lib/utils';
import { syncJobManager, SyncJob, SyncMetrics } from '../services/syncJobManager';
import { toast } from 'sonner';
import FieldMappingDialog from '../components/crm/FieldMappingDialog';
import { CRMDashboard } from '../components/crm/CRMDashboard';
import WebhookManager from '../components/crm/WebhookManager';
import { LeadDeduplicationManager } from '../components/crm/LeadDeduplicationManager';
import { ApiUsageMonitor } from '../components/crm/ApiUsageMonitor';
import { SyncJobManager } from '../components/crm/SyncJobManager';
import { ErrorDashboard } from '../components/crm/ErrorDashboard';
import MarketingAutomationManager from '../components/crm/MarketingAutomationManager';
import IntegrationTestSuite from '../components/crm/IntegrationTestSuite';

interface CRMProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'available' | 'coming_soon' | 'beta';
  features: string[];
  setupUrl?: string;
}

const CRM_PROVIDERS: CRMProvider[] = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts, companies, and deals with HubSpot CRM',
    icon: '🟠',
    status: 'available',
    features: ['Contact Sync', 'Company Sync', 'Deal Triggers', 'Activity Logging', 'Custom Fields'],
    setupUrl: 'https://developers.hubspot.com/docs/api/private-apps'
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise-grade integration with Salesforce CRM',
    icon: '☁️',
    status: 'coming_soon',
    features: ['Lead/Contact Sync', 'Opportunity Management', 'Campaign Members', 'Custom Objects'],
    setupUrl: 'https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm'
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Simple and effective CRM integration for sales teams',
    icon: '🟢',
    status: 'coming_soon',
    features: ['Person Sync', 'Organization Sync', 'Deal Pipeline', 'Activity Tracking'],
    setupUrl: 'https://developers.pipedrive.com/docs/api/v1'
  }
];

export default function CRMIntegrations() {
  const [user, setUser] = useState<any>(null);
  const [connections, setConnections] = useState<CRMConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showFieldMappingDialog, setShowFieldMappingDialog] = useState(false);
  const [showWebhookManager, setShowWebhookManager] = useState(false);
  const [showSyncJobDialog, setShowSyncJobDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CRMProvider | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [setupForm, setSetupForm] = useState({
    apiKey: '',
    instanceUrl: '',
    clientId: '',
    clientSecret: ''
  });
  const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMapping[]>>({});
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics | null>(null);
  const [syncJobForm, setSyncJobForm] = useState({
    jobType: 'contacts' as SyncJob['jobType'],
    direction: 'from_crm' as SyncJob['direction'],
    priority: 'normal' as SyncJob['priority'],
    batchSize: 100,
    conflictResolution: 'crm_wins' as 'crm_wins' | 'svara_wins' | 'manual' | 'newest_wins',
    enableDeduplication: true,
    createMissingRecords: true,
    updateExistingRecords: true,
    scheduledAt: ''
  });

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      if (state.user) {
        loadConnections();
        loadSyncData();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      
      if (!user) return;
      
      // Load CRM connections from database
      const crmConnections = await blink.db.crmConnections.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });

      const connections: CRMConnection[] = crmConnections.map((record: any) => ({
        id: record.id,
        userId: record.userId,
        provider: record.provider,
        credentials: record.credentials ? JSON.parse(record.credentials) : {},
        fieldMappings: record.fieldMappings ? JSON.parse(record.fieldMappings) : [],
        syncSettings: record.syncSettings ? JSON.parse(record.syncSettings) : {
          autoSync: true,
          syncInterval: 60,
          syncContacts: true,
          syncCompanies: true,
          syncDeals: false
        },
        lastSync: record.lastSync ? new Date(record.lastSync) : undefined,
        status: record.status || 'setup',
        errorMessage: record.errorMessage
      }));
      
      setConnections(connections);
    } catch (error) {
      console.error('Failed to load CRM connections:', error);
      toast.error('Failed to load CRM connections');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncData = async () => {
    if (!user) return;

    try {
      // Load sync metrics and recent jobs
      const [metrics, jobs] = await Promise.all([
        syncJobManager.getSyncMetrics(user.id, 30),
        syncJobManager.getUserJobs(user.id, undefined, 20)
      ]);

      setSyncMetrics(metrics);
      setSyncJobs(jobs);
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
  };

  const handleCreateSyncJob = async () => {
    if (!selectedProvider || !user) return;

    try {
      const scheduledAt = syncJobForm.scheduledAt 
        ? new Date(syncJobForm.scheduledAt) 
        : undefined;

      const jobId = await syncJobManager.createSyncJob(
        user.id,
        selectedProvider.id,
        syncJobForm.jobType,
        syncJobForm.direction,
        {
          batchSize: syncJobForm.batchSize,
          conflictResolution: syncJobForm.conflictResolution,
          enableDeduplication: syncJobForm.enableDeduplication,
          createMissingRecords: syncJobForm.createMissingRecords,
          updateExistingRecords: syncJobForm.updateExistingRecords,
          fieldMappings: fieldMappings[selectedProvider.id]
        },
        syncJobForm.priority,
        scheduledAt
      );

      toast.success(`Sync job created: ${jobId}`);
      setShowSyncJobDialog(false);
      loadSyncData(); // Refresh data
    } catch (error) {
      console.error('Failed to create sync job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create sync job');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const success = await syncJobManager.cancelJob(jobId);
      if (success) {
        toast.success('Sync job cancelled');
        loadSyncData(); // Refresh data
      } else {
        toast.error('Failed to cancel sync job');
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel job');
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const success = await syncJobManager.retryJob(jobId);
      if (success) {
        toast.success('Sync job queued for retry');
        loadSyncData(); // Refresh data
      } else {
        toast.error('Failed to retry sync job');
      }
    } catch (error) {
      console.error('Failed to retry job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry job');
    }
  };

  const handleScheduleSync = (provider: CRMProvider) => {
    setSelectedProvider(provider);
    setShowSyncJobDialog(true);
  };

  const handleSetupCRM = async (provider: CRMProvider) => {
    if (provider.status !== 'available') {
      toast.info(`${provider.name} integration is ${provider.status === 'coming_soon' ? 'coming soon' : 'in beta'}`);
      return;
    }

    setSelectedProvider(provider);
    setShowSetupDialog(true);
  };

  const handleSaveConnection = async () => {
    if (!selectedProvider || !user) return;

    try {
      const crmManager = createCRMManager(user.id);
      
      const credentials = {
        apiKey: setupForm.apiKey,
        instanceUrl: setupForm.instanceUrl,
        clientId: setupForm.clientId,
        clientSecret: setupForm.clientSecret
      };

      const connection = await crmManager.createConnection(selectedProvider.id, credentials);
      
      setConnections(prev => [...prev, connection]);
      setShowSetupDialog(false);
      setSetupForm({ apiKey: '', instanceUrl: '', clientId: '', clientSecret: '' });
      
      toast.success(`${selectedProvider.name} connected successfully!`);
    } catch (error) {
      console.error('Failed to setup CRM connection:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to setup CRM connection');
    }
  };

  const handleSync = async (provider: string) => {
    if (!user) return;

    try {
      setSyncing(prev => ({ ...prev, [provider]: true }));
      
      const crmManager = createCRMManager(user.id);
      const integration = await crmManager.getIntegration(provider);
      
      if (!integration) {
        throw new Error('CRM integration not found');
      }

      // Use field mappings if available
      const mappings = fieldMappings[provider];
      const syncOptions = mappings ? { fieldMappings: mappings } : {};
      
      const result = await integration.syncContacts(syncOptions);
      setSyncResults(prev => ({ ...prev, [provider]: result }));
      
      if (result.success) {
        toast.success(`Synced ${result.recordsProcessed} contacts from ${provider}`);
      } else {
        toast.error(`Sync failed: ${result.errors[0]?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleOAuthConnect = async (provider: CRMProvider) => {
    if (!user) return;

    try {
      const crmManager = createCRMManager(user.id);
      const oauthUrl = crmManager.getOAuthUrl(provider.id);
      
      // Open OAuth URL in new window
      const popup = window.open(
        oauthUrl,
        'oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for OAuth authentication.');
        return;
      }

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'oauth_success') {
          popup?.close();
          window.removeEventListener('message', handleMessage);
          
          // Refresh connections
          loadConnections();
          toast.success(`${provider.name} connected successfully!`);
        } else if (event.data.type === 'oauth_error') {
          popup?.close();
          window.removeEventListener('message', handleMessage);
          toast.error(`Failed to connect ${provider.name}: ${event.data.error}`);
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);
      
    } catch (error) {
      console.error('OAuth connection failed:', error);
      toast.error(error instanceof Error ? error.message : 'OAuth connection failed');
    }
  };

  const handleFieldMapping = (provider: CRMProvider) => {
    setSelectedProvider(provider);
    setShowFieldMappingDialog(true);
  };

  const handleSaveFieldMapping = (mappings: FieldMapping[]) => {
    if (!selectedProvider) return;
    
    setFieldMappings(prev => ({
      ...prev,
      [selectedProvider.id]: mappings
    }));
    
    toast.success(`Field mappings saved for ${selectedProvider.name}`);
  };

  const handleWebhookManager = (provider: CRMProvider) => {
    const connection = connections.find(c => c.provider === provider.id);
    if (!connection) {
      toast.error('No active connection found for this provider');
      return;
    }
    
    setSelectedProvider(provider);
    setSelectedConnectionId(connection.id);
    setShowWebhookManager(true);
  };

  const getConnectionStatus = (providerId: string) => {
    const connection = connections.find(c => c.provider === providerId);
    if (!connection) return 'disconnected';
    return connection.status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'setup':
        return <Settings className="h-4 w-4 text-blue-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      error: 'destructive',
      paused: 'secondary',
      setup: 'outline',
      disconnected: 'secondary'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status === 'disconnected' ? 'Not Connected' : (status ? safeCapitalize(status, 'Unknown') : 'Unknown')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">CRM Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your CRM to sync contacts, companies, and automate your sales workflow
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="sync-jobs">Sync Jobs</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="deduplication">Deduplication</TabsTrigger>
          <TabsTrigger value="usage">API Usage</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active Integrations</p>
                <p className="text-2xl font-bold">{connections.filter(c => c.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Synced Contacts</p>
                <p className="text-2xl font-bold">
                  {Object.values(syncResults).reduce((sum, result) => sum + result.recordsProcessed, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Last Sync</p>
                <p className="text-2xl font-bold">
                  {connections.length > 0 ? 'Today' : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold">
                  {Object.values(syncResults).length > 0 
                    ? Math.round(Object.values(syncResults).filter(r => r.success).length / Object.values(syncResults).length * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CRM Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Available CRM Integrations</CardTitle>
          <CardDescription>
            Connect your favorite CRM to sync data and automate workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CRM_PROVIDERS.map((provider) => {
              const status = getConnectionStatus(provider.id);
              const isConnected = status !== 'disconnected';
              
              return (
                <Card key={provider.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{provider.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                          {provider.status !== 'available' && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {provider.status === 'coming_soon' ? 'Coming Soon' : 'Beta'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {getStatusIcon(status)}
                    </div>
                    <CardDescription className="text-sm">
                      {provider.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Features */}
                      <div>
                        <p className="text-sm font-medium mb-2">Features:</p>
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

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        {getStatusBadge(status)}
                        {provider.setupUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(provider.setupUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Docs
                          </Button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        {!isConnected ? (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleSetupCRM(provider)}
                              disabled={provider.status !== 'available'}
                              className="flex-1"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Connect
                            </Button>
                            {provider.status === 'available' && (
                              <Button
                                variant="outline"
                                onClick={() => handleOAuthConnect(provider)}
                                size="sm"
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                OAuth
                              </Button>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => handleSync(provider.id)}
                                disabled={syncing[provider.id]}
                                className="flex-1"
                              >
                                {syncing[provider.id] ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Sync
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleFieldMapping(provider)}
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleWebhookManager(provider)}
                              >
                                <Webhook className="h-4 w-4 mr-2" />
                                Webhooks
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleScheduleSync(provider)}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Schedule
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Sync Results */}
                      {syncResults[provider.id] && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Last Sync Result:</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Processed: {syncResults[provider.id].recordsProcessed}</p>
                            <p>Created: {syncResults[provider.id].recordsCreated}</p>
                            <p>Updated: {syncResults[provider.id].recordsUpdated}</p>
                            {syncResults[provider.id].errors.length > 0 && (
                              <p className="text-red-500">Errors: {syncResults[provider.id].errors.length}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="marketing">
          {user && <MarketingAutomationManager userId={user.id} />}
        </TabsContent>

        <TabsContent value="sync-jobs" className="space-y-6">
          {/* Sync Metrics Overview */}
          {syncMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Total Jobs</p>
                      <p className="text-2xl font-bold">{syncMetrics.totalJobs}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Success Rate</p>
                      <p className="text-2xl font-bold">{syncMetrics.successRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Records Synced</p>
                      <p className="text-2xl font-bold">{syncMetrics.totalRecordsProcessed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Timer className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">Avg Duration</p>
                      <p className="text-2xl font-bold">{(syncMetrics.averageDuration / 1000).toFixed(1)}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Sync Jobs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Sync Jobs</CardTitle>
                  <CardDescription>Monitor and manage your CRM sync operations</CardDescription>
                </div>
                <Button onClick={() => loadSyncData()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {syncJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No sync jobs found</p>
                  <p className="text-sm text-muted-foreground">Create your first sync job to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {syncJobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {job.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {job.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                            {job.status === 'running' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                            {job.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                            {job.status === 'cancelled' && <AlertCircle className="h-4 w-4 text-gray-500" />}
                            <span className="font-medium">{job.provider} {job.jobType}</span>
                          </div>
                          <Badge variant="outline">{job.direction}</Badge>
                          <Badge variant={job.priority === 'urgent' ? 'destructive' : job.priority === 'high' ? 'default' : 'secondary'}>
                            {job.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {job.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryJob(job.id)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                          {(job.status === 'pending' || job.status === 'running') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelJob(job.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            job.status === 'running' ? 'default' :
                            'secondary'
                          }>
                            {job.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Progress</p>
                          <div className="flex items-center space-x-2">
                            <Progress value={job.progress} className="flex-1 h-2" />
                            <span className="text-xs">{job.progress}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Records</p>
                          <p className="font-medium">{job.processedRecords} / {job.totalRecords}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Started</p>
                          <p className="font-medium">
                            {job.startedAt ? new Date(job.startedAt).toLocaleString() : 'Not started'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">
                            {job.result ? `${(job.result.duration / 1000).toFixed(1)}s` : '-'}
                          </p>
                        </div>
                      </div>

                      {job.result && job.result.errors.length > 0 && (
                        <Alert className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {job.result.errors.length} error(s) occurred during sync. 
                            Check logs for details.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-jobs">
          {user && <SyncJobManager userId={user.id} />}
        </TabsContent>

        <TabsContent value="errors">
          {user && <ErrorDashboard userId={user.id} />}
        </TabsContent>

        <TabsContent value="deduplication">
          <LeadDeduplicationManager />
        </TabsContent>

        <TabsContent value="usage">
          <ApiUsageMonitor />
        </TabsContent>

        <TabsContent value="testing">
          {user && <IntegrationTestSuite userId={user.id} />}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Configure global settings for your CRM integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-sync">Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync data every hour
                  </p>
                </div>
                <Switch id="auto-sync" defaultChecked />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="conflict-resolution">Conflict Resolution</Label>
                  <p className="text-sm text-muted-foreground">
                    How to handle data conflicts during sync
                  </p>
                </div>
                <Select defaultValue="crm-wins">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crm-wins">CRM Data Wins</SelectItem>
                    <SelectItem value="svara-wins">Svara Data Wins</SelectItem>
                    <SelectItem value="manual">Manual Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="webhook-notifications">Webhook Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications for sync events
                  </p>
                </div>
                <Switch id="webhook-notifications" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {selectedProvider?.name}</DialogTitle>
            <DialogDescription>
              Enter your {selectedProvider?.name} API credentials to establish the connection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedProvider?.id === 'hubspot' && (
              <>
                <div>
                  <Label htmlFor="apiKey">Private App Token</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="pat-na1-..."
                    value={setupForm.apiKey}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a private app in HubSpot to get your token
                  </p>
                </div>
              </>
            )}

            {selectedProvider?.id === 'salesforce' && (
              <>
                <div>
                  <Label htmlFor="instanceUrl">Instance URL</Label>
                  <Input
                    id="instanceUrl"
                    placeholder="https://yourcompany.salesforce.com"
                    value={setupForm.instanceUrl}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, instanceUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={setupForm.clientId}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, clientId: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={setupForm.clientSecret}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                  />
                </div>
              </>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your credentials are encrypted and stored securely. We never share your data with third parties.
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowSetupDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSaveConnection} 
                disabled={!setupForm.apiKey && !setupForm.clientId}
                className="flex-1"
              >
                Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Why Connect Your CRM?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                Automatic Data Sync
              </h4>
              <p className="text-sm text-muted-foreground">
                Keep your contacts and companies synchronized between Svara and your CRM automatically.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                Workflow Automation
              </h4>
              <p className="text-sm text-muted-foreground">
                Trigger Svara campaigns based on CRM events like deal stage changes or new leads.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-green-500" />
                Unified Analytics
              </h4>
              <p className="text-sm text-muted-foreground">
                See campaign performance and lead progression in both systems with consistent data.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <Users className="h-4 w-4 mr-2 text-purple-500" />
                Team Collaboration
              </h4>
              <p className="text-sm text-muted-foreground">
                Enable your entire sales team to work with the same up-to-date contact information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Mapping Dialog */}
      <FieldMappingDialog
        open={showFieldMappingDialog}
        onOpenChange={setShowFieldMappingDialog}
        provider={selectedProvider?.id || ''}
        providerName={selectedProvider?.name || ''}
        onSave={handleSaveFieldMapping}
      />

      {/* Webhook Manager Dialog */}
      <WebhookManager
        open={showWebhookManager}
        onOpenChange={setShowWebhookManager}
        provider={selectedProvider?.id || ''}
        providerName={selectedProvider?.name || ''}
        connectionId={selectedConnectionId}
      />

      {/* Sync Job Creation Dialog */}
      <Dialog open={showSyncJobDialog} onOpenChange={setShowSyncJobDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Sync Job</DialogTitle>
            <DialogDescription>
              Create a new sync job for {selectedProvider?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobType">Job Type</Label>
                <Select 
                  value={syncJobForm.jobType} 
                  onValueChange={(value: SyncJob['jobType']) => 
                    setSyncJobForm(prev => ({ ...prev, jobType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contacts">Contacts</SelectItem>
                    <SelectItem value="companies">Companies</SelectItem>
                    <SelectItem value="deals">Deals</SelectItem>
                    <SelectItem value="full_sync">Full Sync</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="direction">Direction</Label>
                <Select 
                  value={syncJobForm.direction} 
                  onValueChange={(value: SyncJob['direction']) => 
                    setSyncJobForm(prev => ({ ...prev, direction: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from_crm">
                      <div className="flex items-center">
                        <Download className="h-4 w-4 mr-2" />
                        From CRM
                      </div>
                    </SelectItem>
                    <SelectItem value="to_crm">
                      <div className="flex items-center">
                        <Upload className="h-4 w-4 mr-2" />
                        To CRM
                      </div>
                    </SelectItem>
                    <SelectItem value="bidirectional">
                      <div className="flex items-center">
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Bidirectional
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={syncJobForm.priority} 
                  onValueChange={(value: SyncJob['priority']) => 
                    setSyncJobForm(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="10"
                  max="1000"
                  value={syncJobForm.batchSize}
                  onChange={(e) => setSyncJobForm(prev => ({ 
                    ...prev, 
                    batchSize: parseInt(e.target.value) || 100 
                  }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="conflictResolution">Conflict Resolution</Label>
              <Select 
                value={syncJobForm.conflictResolution} 
                onValueChange={(value: typeof syncJobForm.conflictResolution) => 
                  setSyncJobForm(prev => ({ ...prev, conflictResolution: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crm_wins">CRM Data Wins</SelectItem>
                  <SelectItem value="svara_wins">Svara Data Wins</SelectItem>
                  <SelectItem value="newest_wins">Newest Data Wins</SelectItem>
                  <SelectItem value="manual">Manual Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduledAt">Schedule For (Optional)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={syncJobForm.scheduledAt}
                onChange={(e) => setSyncJobForm(prev => ({ 
                  ...prev, 
                  scheduledAt: e.target.value 
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to run immediately
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableDeduplication"
                  checked={syncJobForm.enableDeduplication}
                  onCheckedChange={(checked) => 
                    setSyncJobForm(prev => ({ ...prev, enableDeduplication: checked }))
                  }
                />
                <Label htmlFor="enableDeduplication">Enable Deduplication</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="createMissingRecords"
                  checked={syncJobForm.createMissingRecords}
                  onCheckedChange={(checked) => 
                    setSyncJobForm(prev => ({ ...prev, createMissingRecords: checked }))
                  }
                />
                <Label htmlFor="createMissingRecords">Create Missing Records</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="updateExistingRecords"
                  checked={syncJobForm.updateExistingRecords}
                  onCheckedChange={(checked) => 
                    setSyncJobForm(prev => ({ ...prev, updateExistingRecords: checked }))
                  }
                />
                <Label htmlFor="updateExistingRecords">Update Existing Records</Label>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSyncJobDialog(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSyncJob} 
                className="flex-1"
              >
                <Target className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}