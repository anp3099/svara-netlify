import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  CreditCard, 
  Database, 
  GitMerge, 
  RefreshCw, 
  Settings, 
  TrendingUp, 
  Users, 
  Webhook, 
  Zap,
  BarChart3,
  Timer,
  Shield,
  AlertCircle
} from 'lucide-react';
import { blink } from '../../blink/client';
import { toast } from 'sonner';
import { safeCapitalize } from '../../lib/utils';

interface CRMDashboardProps {
  userId: string;
}

export function CRMDashboard({ userId }: CRMDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load connections (simulated for now)
      setConnections([
        {
          id: 'hubspot_conn',
          provider: 'hubspot',
          status: 'active',
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          recordsSynced: 1247,
          errorCount: 3
        },
        {
          id: 'salesforce_conn',
          provider: 'salesforce',
          status: 'setup',
          lastSync: null,
          recordsSynced: 0,
          errorCount: 0
        }
      ]);
      
      // Load recent sync jobs (simulated)
      setSyncJobs([
        {
          id: 'job_1',
          provider: 'hubspot',
          type: 'incremental_sync',
          status: 'completed',
          recordsProcessed: 156,
          duration: 45000,
          completedAt: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          id: 'job_2',
          provider: 'hubspot',
          type: 'full_sync',
          status: 'running',
          recordsProcessed: 892,
          startedAt: new Date(Date.now() - 10 * 60 * 1000)
        }
      ]);
      
      // Load duplicate detection results (simulated)
      setDuplicates([
        {
          id: 'dup_1',
          primaryRecord: 'John Smith - Acme Corp',
          duplicateRecord: 'J. Smith - ACME Corporation',
          matchScore: 94,
          status: 'pending',
          confidence: 'high'
        },
        {
          id: 'dup_2',
          primaryRecord: 'Sarah Johnson - TechStart',
          duplicateRecord: 'Sarah J. - TechStart Inc',
          matchScore: 87,
          status: 'pending',
          confidence: 'medium'
        }
      ]);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'setup':
        return <Settings className="h-4 w-4 text-blue-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      error: 'destructive',
      setup: 'outline',
      running: 'secondary',
      completed: 'default',
      pending: 'outline'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status ? (typeof status === 'string' ? safeCapitalize(status, 'Unknown') : String(status)) : 'Unknown'}
      </Badge>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM Integration Dashboard</h2>
          <p className="text-muted-foreground">Monitor your CRM connections, sync jobs, and data quality</p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active Connections</p>
                <p className="text-2xl font-bold">{connections.filter(c => c.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Records Synced</p>
                <p className="text-2xl font-bold">
                  {connections.reduce((sum, c) => sum + c.recordsSynced, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <GitMerge className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Duplicates Found</p>
                <p className="text-2xl font-bold">{duplicates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Sync Jobs</p>
                <p className="text-2xl font-bold">{syncJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="sync-jobs">Sync Jobs</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Connection Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(conn.status)}
                        <div>
                          <p className="font-medium capitalize">{conn.provider}</p>
                          <p className="text-sm text-muted-foreground">
                            {conn.lastSync ? `Last sync: ${conn.lastSync.toLocaleString()}` : 'Never synced'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(conn.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncJobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-2 border-l-2 border-blue-200 pl-4">
                      <div>
                        <p className="font-medium">{job.provider} {job.type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.status === 'completed' 
                            ? `Processed ${job.recordsProcessed} records in ${Math.round(job.duration / 1000)}s`
                            : `Processing ${job.recordsProcessed} records...`
                          }
                        </p>
                      </div>
                      {getStatusIcon(job.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {connections.map((conn) => (
              <Card key={conn.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">{conn.provider}</CardTitle>
                    {getStatusBadge(conn.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Records Synced</p>
                        <p className="text-2xl font-bold">{conn.recordsSynced.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">Errors</p>
                        <p className="text-2xl font-bold text-red-500">{conn.errorCount}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Webhook className="h-4 w-4 mr-2" />
                        Webhooks
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Sync Jobs Tab */}
        <TabsContent value="sync-jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Job History</CardTitle>
              <CardDescription>Monitor your data synchronization jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="font-medium">{job.provider} - {job.type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.status === 'completed' 
                            ? `Completed ${job.completedAt?.toLocaleString()}`
                            : job.status === 'running'
                            ? `Started ${job.startedAt?.toLocaleString()}`
                            : 'Pending'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{job.recordsProcessed} records</p>
                      {job.duration && (
                        <p className="text-sm text-muted-foreground">
                          {Math.round(job.duration / 1000)}s duration
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duplicates Tab */}
        <TabsContent value="duplicates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Duplicate Detection</CardTitle>
                  <CardDescription>Review and resolve potential duplicate records</CardDescription>
                </div>
                <Button>
                  <GitMerge className="h-4 w-4 mr-2" />
                  Run Deduplication
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {duplicates.map((dup) => (
                  <div key={dup.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant={dup.confidence === 'high' ? 'default' : 'secondary'}>
                          {dup.confidence} confidence
                        </Badge>
                        <span className="text-sm font-medium">{dup.matchScore}% match</span>
                      </div>
                      {getStatusBadge(dup.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-green-600">Primary Record</p>
                        <p className="font-medium">{dup.primaryRecord}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-600">Potential Duplicate</p>
                        <p className="font-medium">{dup.duplicateRecord}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Merge Records
                      </Button>
                      <Button size="sm" variant="outline">
                        Not a Duplicate
                      </Button>
                      <Button size="sm" variant="ghost">
                        Review Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}