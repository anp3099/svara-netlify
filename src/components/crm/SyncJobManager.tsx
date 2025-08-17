import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Settings,
  Calendar,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Trash2
} from 'lucide-react'
import { blink } from '../../blink/client'
import { syncJobManager, SyncJob, SyncJobConfig } from '../../services/syncJobManager'
import { toast } from 'sonner'

interface SyncJobManagerProps {
  userId: string
  connectionId?: string
}

export function SyncJobManager({ userId, connectionId }: SyncJobManagerProps) {
  const [jobs, setJobs] = useState<SyncJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<SyncJob | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [connections, setConnections] = useState<any[]>([])

  useEffect(() => {
    loadJobs()
    loadConnections()
    
    // Refresh jobs every 30 seconds
    const interval = setInterval(loadJobs, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const loadJobs = async () => {
    try {
      const userJobs = await syncJobManager.getUserJobs(userId)
      setJobs(userJobs)
    } catch (error) {
      console.error('Failed to load sync jobs:', error)
      toast.error('Failed to load sync jobs')
    } finally {
      setLoading(false)
    }
  }

  const loadConnections = async () => {
    try {
      const crmConnections = await blink.db.crmConnections.list({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      setConnections(crmConnections)
    } catch (error) {
      console.error('Failed to load connections:', error)
    }
  }

  const handleCreateJob = async (config: CreateJobConfig) => {
    try {
      await syncJobManager.createSyncJob({
        userId,
        connectionId: config.connectionId,
        provider: config.provider,
        syncType: config.syncType,
        direction: config.direction,
        priority: config.priority,
        scheduledAt: config.scheduledAt,
        config: config.jobConfig
      })
      
      toast.success('Sync job created successfully')
      setShowCreateDialog(false)
      loadJobs()
    } catch (error) {
      console.error('Failed to create sync job:', error)
      toast.error('Failed to create sync job')
    }
  }

  const handleExecuteJob = async (jobId: string) => {
    try {
      await syncJobManager.executeSyncJob(jobId)
      toast.success('Sync job started')
      loadJobs()
    } catch (error) {
      console.error('Failed to execute sync job:', error)
      toast.error('Failed to start sync job')
    }
  }

  const handleCancelJob = async (jobId: string) => {
    try {
      await syncJobManager.cancelJob(jobId)
      toast.success('Sync job cancelled')
      loadJobs()
    } catch (error) {
      console.error('Failed to cancel sync job:', error)
      toast.error('Failed to cancel sync job')
    }
  }

  const getStatusIcon = (status: SyncJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: SyncJob['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'secondary'
    } as const

    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status}
      </Badge>
    )
  }

  const getDirectionIcon = (direction: SyncJob['direction']) => {
    switch (direction) {
      case 'pull':
        return <ArrowDown className="h-4 w-4" />
      case 'push':
        return <ArrowUp className="h-4 w-4" />
      case 'bidirectional':
        return <ArrowUpDown className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading sync jobs...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sync Job Manager</h2>
          <p className="text-muted-foreground">
            Manage bidirectional data synchronization between Svara and your CRMs
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadJobs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <CreateSyncJobDialog
            connections={connections}
            onCreateJob={handleCreateJob}
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
          />
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Jobs</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="all">All Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <SyncJobsList 
            jobs={jobs.filter(job => ['pending', 'running'].includes(job.status))}
            onExecute={handleExecuteJob}
            onCancel={handleCancelJob}
            onViewDetails={setSelectedJob}
          />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <SyncJobsList 
            jobs={jobs.filter(job => job.status === 'completed')}
            onExecute={handleExecuteJob}
            onCancel={handleCancelJob}
            onViewDetails={setSelectedJob}
          />
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <SyncJobsList 
            jobs={jobs.filter(job => job.status === 'failed')}
            onExecute={handleExecuteJob}
            onCancel={handleCancelJob}
            onViewDetails={setSelectedJob}
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <SyncJobsList 
            jobs={jobs}
            onExecute={handleExecuteJob}
            onCancel={handleCancelJob}
            onViewDetails={setSelectedJob}
          />
        </TabsContent>
      </Tabs>

      {selectedJob && (
        <SyncJobDetailsDialog
          job={selectedJob}
          open={!!selectedJob}
          onOpenChange={() => setSelectedJob(null)}
        />
      )}
    </div>
  )
}

interface SyncJobsListProps {
  jobs: SyncJob[]
  onExecute: (jobId: string) => void
  onCancel: (jobId: string) => void
  onViewDetails: (job: SyncJob) => void
}

function SyncJobsList({ jobs, onExecute, onCancel, onViewDetails }: SyncJobsListProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No sync jobs found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <SyncJobCard
          key={job.id}
          job={job}
          onExecute={onExecute}
          onCancel={onCancel}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}

interface SyncJobCardProps {
  job: SyncJob
  onExecute: (jobId: string) => void
  onCancel: (jobId: string) => void
  onViewDetails: (job: SyncJob) => void
}

function SyncJobCard({ job, onExecute, onCancel, onViewDetails }: SyncJobCardProps) {
  const getStatusIcon = (status: SyncJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: SyncJob['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'secondary'
    } as const

    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status}
      </Badge>
    )
  }

  const getDirectionIcon = (direction: SyncJob['direction']) => {
    switch (direction) {
      case 'pull':
        return <ArrowDown className="h-4 w-4" />
      case 'push':
        return <ArrowUp className="h-4 w-4" />
      case 'bidirectional':
        return <ArrowUpDown className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(job.status)}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium capitalize">{job.provider}</span>
                  {getDirectionIcon(job.direction)}
                  <span className="text-sm text-muted-foreground capitalize">
                    {job.direction} sync
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusBadge(job.status)}
                  <Badge variant="outline" className="capitalize">
                    {job.syncType}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {job.priority}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(job)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Details
            </Button>
            
            {job.status === 'pending' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onExecute(job.id)}
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
            
            {job.status === 'running' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(job.id)}
              >
                <Square className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {job.status === 'running' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="w-full" />
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>{job.processedRecords} / {job.totalRecords} records</span>
              {job.errorCount > 0 && (
                <span className="text-red-500">{job.errorCount} errors</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
          <span>
            Scheduled: {job.scheduledAt.toLocaleString()}
          </span>
          {job.completedAt && (
            <span>
              Completed: {job.completedAt.toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CreateJobConfig {
  connectionId: string
  provider: string
  syncType: SyncJob['syncType']
  direction: SyncJob['direction']
  priority: SyncJob['priority']
  scheduledAt: Date
  jobConfig: Partial<SyncJobConfig>
}

interface CreateSyncJobDialogProps {
  connections: any[]
  onCreateJob: (config: CreateJobConfig) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateSyncJobDialog({ connections, onCreateJob, open, onOpenChange }: CreateSyncJobDialogProps) {
  const [config, setConfig] = useState<CreateJobConfig>({
    connectionId: '',
    provider: '',
    syncType: 'incremental',
    direction: 'bidirectional',
    priority: 'medium',
    scheduledAt: new Date(),
    jobConfig: {
      batchSize: 100,
      rateLimitDelay: 1000,
      conflictResolution: 'newest_wins',
      notificationSettings: {
        onSuccess: true,
        onFailure: true,
        onProgress: false
      }
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!config.connectionId) {
      toast.error('Please select a CRM connection')
      return
    }
    onCreateJob(config)
  }

  const selectedConnection = connections.find(c => c.id === config.connectionId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Create Sync Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Sync Job</DialogTitle>
          <DialogDescription>
            Configure a new synchronization job between Svara and your CRM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="connection">CRM Connection</Label>
              <Select
                value={config.connectionId}
                onValueChange={(value) => {
                  const connection = connections.find(c => c.id === value)
                  setConfig(prev => ({
                    ...prev,
                    connectionId: value,
                    provider: connection?.provider || ''
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      <div className="flex items-center space-x-2">
                        <span className="capitalize">{connection.provider}</span>
                        <Badge variant="outline" className="text-xs">
                          {connection.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncType">Sync Type</Label>
              <Select
                value={config.syncType}
                onValueChange={(value: SyncJob['syncType']) =>
                  setConfig(prev => ({ ...prev, syncType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Sync</SelectItem>
                  <SelectItem value="incremental">Incremental</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">Direction</Label>
              <Select
                value={config.direction}
                onValueChange={(value: SyncJob['direction']) =>
                  setConfig(prev => ({ ...prev, direction: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pull">Pull from CRM</SelectItem>
                  <SelectItem value="push">Push to CRM</SelectItem>
                  <SelectItem value="bidirectional">Bidirectional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={config.priority}
                onValueChange={(value: SyncJob['priority']) =>
                  setConfig(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Advanced Configuration</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="1"
                  max="1000"
                  value={config.jobConfig.batchSize}
                  onChange={(e) =>
                    setConfig(prev => ({
                      ...prev,
                      jobConfig: {
                        ...prev.jobConfig,
                        batchSize: parseInt(e.target.value) || 100
                      }
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rateLimitDelay">Rate Limit Delay (ms)</Label>
                <Input
                  id="rateLimitDelay"
                  type="number"
                  min="0"
                  max="10000"
                  value={config.jobConfig.rateLimitDelay}
                  onChange={(e) =>
                    setConfig(prev => ({
                      ...prev,
                      jobConfig: {
                        ...prev.jobConfig,
                        rateLimitDelay: parseInt(e.target.value) || 1000
                      }
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conflictResolution">Conflict Resolution</Label>
              <Select
                value={config.jobConfig.conflictResolution}
                onValueChange={(value: SyncJobConfig['conflictResolution']) =>
                  setConfig(prev => ({
                    ...prev,
                    jobConfig: {
                      ...prev.jobConfig,
                      conflictResolution: value
                    }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="svara_wins">Svara Wins</SelectItem>
                  <SelectItem value="crm_wins">CRM Wins</SelectItem>
                  <SelectItem value="newest_wins">Newest Wins</SelectItem>
                  <SelectItem value="manual">Manual Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Notifications</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notify on success</span>
                  <Switch
                    checked={config.jobConfig.notificationSettings?.onSuccess}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        jobConfig: {
                          ...prev.jobConfig,
                          notificationSettings: {
                            ...prev.jobConfig.notificationSettings!,
                            onSuccess: checked
                          }
                        }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notify on failure</span>
                  <Switch
                    checked={config.jobConfig.notificationSettings?.onFailure}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        jobConfig: {
                          ...prev.jobConfig,
                          notificationSettings: {
                            ...prev.jobConfig.notificationSettings!,
                            onFailure: checked
                          }
                        }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notify on progress</span>
                  <Switch
                    checked={config.jobConfig.notificationSettings?.onProgress}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        jobConfig: {
                          ...prev.jobConfig,
                          notificationSettings: {
                            ...prev.jobConfig.notificationSettings!,
                            onProgress: checked
                          }
                        }
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Job</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface SyncJobDetailsDialogProps {
  job: SyncJob
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SyncJobDetailsDialog({ job, open, onOpenChange }: SyncJobDetailsDialogProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    if (open && job) {
      loadJobLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job])

  const loadJobLogs = async () => {
    setLoadingLogs(true)
    try {
      const jobLogs = await blink.db.crmSyncJobLogs.list({
        where: { jobId: job.id },
        orderBy: { completedAt: 'desc' }
      })
      setLogs(jobLogs)
    } catch (error) {
      console.error('Failed to load job logs:', error)
    } finally {
      setLoadingLogs(false)
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Sync Job Details</DialogTitle>
          <DialogDescription>
            Detailed information about sync job {job.id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Job Overview */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Job Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Provider:</span>
                    <span className="text-sm font-medium capitalize">{job.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <span className="text-sm font-medium capitalize">{job.syncType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Direction:</span>
                    <span className="text-sm font-medium capitalize">{job.direction}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Priority:</span>
                    <span className="text-sm font-medium capitalize">{job.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                      {job.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Progress:</span>
                    <span className="text-sm font-medium">{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="w-full" />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Processed:</span>
                    <span className="text-sm font-medium">{job.processedRecords} / {job.totalRecords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Errors:</span>
                    <span className="text-sm font-medium text-red-500">{job.errorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Retries:</span>
                    <span className="text-sm font-medium">{job.retryCount} / {job.maxRetries}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timing Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Timing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Scheduled:</span>
                  <span className="text-sm font-medium">{job.scheduledAt.toLocaleString()}</span>
                </div>
                {job.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Started:</span>
                    <span className="text-sm font-medium">{job.startedAt.toLocaleString()}</span>
                  </div>
                )}
                {job.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed:</span>
                    <span className="text-sm font-medium">{job.completedAt.toLocaleString()}</span>
                  </div>
                )}
                {job.startedAt && job.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Duration:</span>
                    <span className="text-sm font-medium">
                      {formatDuration(job.completedAt.getTime() - job.startedAt.getTime())}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(job.config, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Execution Logs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Execution Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Loading logs...
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No execution logs found</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={log.status === 'success' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                            {log.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.completedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Processed:</span> {log.recordsProcessed}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created:</span> {log.recordsCreated}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Updated:</span> {log.recordsUpdated}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Failed:</span> {log.recordsFailed}
                          </div>
                        </div>
                        {log.duration && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Duration: {formatDuration(log.duration)}
                          </div>
                        )}
                        {log.errors && JSON.parse(log.errors).length > 0 && (
                          <div className="mt-2">
                            <details className="text-xs">
                              <summary className="cursor-pointer text-red-500">
                                View Errors ({JSON.parse(log.errors).length})
                              </summary>
                              <pre className="mt-2 bg-red-50 p-2 rounded text-red-700 overflow-auto">
                                {JSON.stringify(JSON.parse(log.errors), null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}