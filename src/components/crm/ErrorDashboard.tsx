import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Filter,
  Download,
  Eye,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  Database
} from 'lucide-react'
import { errorHandlingService, ErrorLog, ErrorType, ErrorSeverity } from '../../services/errorHandling'
import { toast } from 'sonner'
import { safeToUpper } from '../../lib/utils'

interface ErrorDashboardProps {
  userId: string
}

export function ErrorDashboard({ userId }: ErrorDashboardProps) {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [errorStats, setErrorStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [resolution, setResolution] = useState('')
  const [filters, setFilters] = useState({
    provider: '',
    errorType: '',
    severity: '',
    timeWindow: '24' // hours
  })

  const loadErrorData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load error logs with filters
      const logs = await errorHandlingService.getErrorLogs(userId, {
        provider: (filters.provider && filters.provider !== 'all') ? filters.provider : undefined,
        errorType: (filters.errorType && filters.errorType !== 'all') ? filters.errorType as ErrorType : undefined,
        severity: (filters.severity && filters.severity !== 'all') ? filters.severity as ErrorSeverity : undefined,
        startDate: new Date(Date.now() - parseInt(filters.timeWindow) * 60 * 60 * 1000),
        limit: 100
      })
      
      // Load error statistics
      const stats = await errorHandlingService.getErrorStats(userId, parseInt(filters.timeWindow))
      
      setErrorLogs(logs)
      setErrorStats(stats)
    } catch (error) {
      console.error('Failed to load error data:', error)
      toast.error('Failed to load error data')
    } finally {
      setLoading(false)
    }
  }, [userId, filters])

  useEffect(() => {
    loadErrorData()
  }, [loadErrorData])

  const handleResolveError = async () => {
    if (!selectedError || !resolution.trim()) return

    try {
      await errorHandlingService.resolveError(selectedError.id, resolution)
      toast.success('Error resolved successfully')
      setShowResolveDialog(false)
      setResolution('')
      setSelectedError(null)
      loadErrorData()
    } catch (error) {
      console.error('Failed to resolve error:', error)
      toast.error('Failed to resolve error')
    }
  }

  const getErrorTypeIcon = (errorType: ErrorType) => {
    switch (errorType) {
      case 'authentication_error':
      case 'authorization_error':
        return <Shield className="h-4 w-4" />
      case 'rate_limit_error':
        return <Clock className="h-4 w-4" />
      case 'network_error':
      case 'timeout_error':
        return <Zap className="h-4 w-4" />
      case 'sync_error':
        return <RefreshCw className="h-4 w-4" />
      case 'data_conflict_error':
        return <Database className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'low':
        return 'text-blue-500'
      case 'medium':
        return 'text-yellow-500'
      case 'high':
        return 'text-orange-500'
      case 'critical':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getSeverityBadge = (severity: ErrorSeverity) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'destructive',
      critical: 'destructive'
    } as const

    return (
      <Badge variant={variants[severity]} className="capitalize">
        {severity}
      </Badge>
    )
  }

  const formatErrorType = (errorType: ErrorType) => {
    return errorType.replace(/_/g, ' ').replace(/\b\w/g, l => safeToUpper(l, l))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading error data...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Error Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and resolve CRM integration errors
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadErrorData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Statistics */}
      {errorStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Total Errors</p>
                  <p className="text-2xl font-bold">{errorStats.totalErrors}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Resolved</p>
                  <p className="text-2xl font-bold">{errorStats.resolvedErrors}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Retryable</p>
                  <p className="text-2xl font-bold">{errorStats.retryableErrors}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {errorStats.totalErrors > 0 
                      ? Math.round((errorStats.resolvedErrors / errorStats.totalErrors) * 100)
                      : 100}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={filters.provider}
                onValueChange={(value) => setFilters(prev => ({ ...prev, provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  <SelectItem value="hubspot">HubSpot</SelectItem>
                  <SelectItem value="salesforce">Salesforce</SelectItem>
                  <SelectItem value="pipedrive">Pipedrive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Error Type</Label>
              <Select
                value={filters.errorType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, errorType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="api_error">API Error</SelectItem>
                  <SelectItem value="authentication_error">Authentication</SelectItem>
                  <SelectItem value="authorization_error">Authorization</SelectItem>
                  <SelectItem value="rate_limit_error">Rate Limit</SelectItem>
                  <SelectItem value="validation_error">Validation</SelectItem>
                  <SelectItem value="network_error">Network</SelectItem>
                  <SelectItem value="sync_error">Sync Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={filters.severity}
                onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Window</Label>
              <Select
                value={filters.timeWindow}
                onValueChange={(value) => setFilters(prev => ({ ...prev, timeWindow: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last Hour</SelectItem>
                  <SelectItem value="24">Last 24 Hours</SelectItem>
                  <SelectItem value="168">Last Week</SelectItem>
                  <SelectItem value="720">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Logs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList>
          <TabsTrigger value="recent">Recent Errors</TabsTrigger>
          <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <ErrorLogsList 
            errors={errorLogs}
            onViewDetails={setSelectedError}
            onResolve={(error) => {
              setSelectedError(error)
              setShowResolveDialog(true)
            }}
          />
        </TabsContent>

        <TabsContent value="unresolved" className="space-y-4">
          <ErrorLogsList 
            errors={errorLogs.filter(e => !e.resolvedAt)}
            onViewDetails={setSelectedError}
            onResolve={(error) => {
              setSelectedError(error)
              setShowResolveDialog(true)
            }}
          />
        </TabsContent>

        <TabsContent value="critical" className="space-y-4">
          <ErrorLogsList 
            errors={errorLogs.filter(e => e.severity === 'critical' || e.severity === 'high')}
            onViewDetails={setSelectedError}
            onResolve={(error) => {
              setSelectedError(error)
              setShowResolveDialog(true)
            }}
          />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <ErrorStatistics stats={errorStats} />
        </TabsContent>
      </Tabs>

      {/* Error Details Dialog */}
      {selectedError && !showResolveDialog && (
        <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Error Details</DialogTitle>
              <DialogDescription>
                Detailed information about error {selectedError.id}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Error Type</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getErrorTypeIcon(selectedError.errorType)}
                      <span>{formatErrorType(selectedError.errorType)}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Severity</Label>
                    <div className="mt-1">
                      {getSeverityBadge(selectedError.severity)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Provider</Label>
                    <p className="mt-1 capitalize">{selectedError.provider || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Operation</Label>
                    <p className="mt-1">{selectedError.operation}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Error Message</Label>
                  <p className="mt-1 text-sm bg-muted p-3 rounded">{selectedError.message}</p>
                </div>

                {selectedError.stack && (
                  <div>
                    <Label className="text-sm font-medium">Stack Trace</Label>
                    <pre className="mt-1 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Context</Label>
                  <pre className="mt-1 text-xs bg-muted p-3 rounded overflow-auto">
                    {JSON.stringify(selectedError.context, null, 2)}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Retry Info</Label>
                    <p className="mt-1 text-sm">
                      {selectedError.retryable ? (
                        `${selectedError.retryCount}/${selectedError.maxRetries} attempts`
                      ) : (
                        'Not retryable'
                      )}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="mt-1 text-sm">{selectedError.createdAt.toLocaleString()}</p>
                  </div>
                </div>

                {selectedError.resolvedAt && (
                  <div>
                    <Label className="text-sm font-medium">Resolution</Label>
                    <p className="mt-1 text-sm bg-green-50 p-3 rounded border border-green-200">
                      <strong>Resolved:</strong> {selectedError.resolvedAt.toLocaleString()}
                      <br />
                      <strong>Resolution:</strong> {selectedError.resolution}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSelectedError(null)}>
                Close
              </Button>
              {!selectedError.resolvedAt && (
                <Button onClick={() => setShowResolveDialog(true)}>
                  Mark as Resolved
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Resolve Error Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Error</DialogTitle>
            <DialogDescription>
              Mark this error as resolved and provide a resolution description
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="resolution">Resolution Description</Label>
              <Textarea
                id="resolution"
                placeholder="Describe how this error was resolved..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolveError}
              disabled={!resolution.trim()}
            >
              Mark as Resolved
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ErrorLogsListProps {
  errors: ErrorLog[]
  onViewDetails: (error: ErrorLog) => void
  onResolve: (error: ErrorLog) => void
}

function ErrorLogsList({ errors, onViewDetails, onResolve }: ErrorLogsListProps) {
  const getErrorTypeIcon = (errorType: ErrorType) => {
    switch (errorType) {
      case 'authentication_error':
      case 'authorization_error':
        return <Shield className="h-4 w-4" />
      case 'rate_limit_error':
        return <Clock className="h-4 w-4" />
      case 'network_error':
      case 'timeout_error':
        return <Zap className="h-4 w-4" />
      case 'sync_error':
        return <RefreshCw className="h-4 w-4" />
      case 'data_conflict_error':
        return <Database className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getSeverityBadge = (severity: ErrorSeverity) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'destructive',
      critical: 'destructive'
    } as const

    return (
      <Badge variant={variants[severity]} className="capitalize">
        {severity}
      </Badge>
    )
  }

  const formatErrorType = (errorType: ErrorType) => {
    return errorType.replace(/_/g, ' ').replace(/\b\w/g, l => safeToUpper(l, l))
  }

  if (errors.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p className="text-muted-foreground">No errors found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {errors.map((error) => (
        <Card key={error.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getErrorTypeIcon(error.errorType)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{formatErrorType(error.errorType)}</span>
                      {error.provider && (
                        <Badge variant="outline" className="capitalize">
                          {error.provider}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {error.operation}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getSeverityBadge(error.severity)}
                  {error.resolvedAt ? (
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Unresolved
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(error)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Details
                </Button>
                {!error.resolvedAt && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onResolve(error)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {error.message.length > 100 ? `${error.message.substring(0, 100)}...` : error.message}
              </p>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
              <span>{error.createdAt.toLocaleString()}</span>
              {error.retryable && (
                <span>
                  Retries: {error.retryCount}/{error.maxRetries}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface ErrorStatisticsProps {
  stats: any
}

function ErrorStatistics({ stats }: ErrorStatisticsProps) {
  if (!stats) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Errors by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.errorsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="outline">{count as number}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Errors by Severity */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.errorsBySeverity).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{severity}</span>
                  <Badge 
                    variant={severity === 'critical' || severity === 'high' ? 'destructive' : 'outline'}
                  >
                    {count as number}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Errors by Provider */}
        <Card>
          <CardHeader>
            <CardTitle>Errors by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.errorsByProvider).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{provider}</span>
                  <Badge variant="outline">{count as number}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resolution Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resolution Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Errors</span>
                <Badge variant="outline">{stats.totalErrors}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Resolved</span>
                <Badge variant="default">{stats.resolvedErrors}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Unresolved</span>
                <Badge variant="destructive">
                  {stats.totalErrors - stats.resolvedErrors}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Retryable</span>
                <Badge variant="secondary">{stats.retryableErrors}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}