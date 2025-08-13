import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  CreditCard,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  RefreshCw,
  Settings
} from 'lucide-react'
import { apiRateLimitingService } from '../../services/apiRateLimiting'
import { blink } from '../../blink/client'
import { toast } from 'sonner'
import { safeToUpper } from '../../lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface UsageStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  creditsUsed: number
  averageResponseTime: number
  usageByProvider: Record<string, number>
  usageByDay: Array<{ date: string; requests: number; credits: number }>
}

export function ApiUsageMonitor() {
  const [user, setUser] = useState<any>(null)
  const [quota, setQuota] = useState<any>(null)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30')

  const loadData = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Load quota and stats in parallel
      const [quotaData, statsData] = await Promise.all([
        apiRateLimitingService.getUserQuota(user.id),
        apiRateLimitingService.getUsageStats(user.id, parseInt(selectedPeriod))
      ])

      setQuota(quotaData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading API usage data:', error)
      toast.error("Failed to load API usage data")
    } finally {
      setLoading(false)
    }
  }, [user?.id, selectedPeriod])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadData()
      }
    })
    return unsubscribe
  }, [selectedPeriod, loadData])

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500'
    if (percentage >= 75) return 'text-orange-500'
    if (percentage >= 50) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatResponseTime = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.round(ms)}ms`
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Please sign in to view API usage</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Usage Monitor</h2>
          <p className="text-muted-foreground">
            Track your API usage, rate limits, and integration performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quota Overview */}
      {quota && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Daily Usage</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{quota.dailyUsage}</span>
                  <span className="text-sm text-muted-foreground">/ {quota.dailyLimit}</span>
                </div>
                <Progress 
                  value={getUsagePercentage(quota.dailyUsage, quota.dailyLimit)} 
                  className="h-2"
                />
                <span className={`text-xs ${getUsageColor(getUsagePercentage(quota.dailyUsage, quota.dailyLimit))}`}>
                  {getUsagePercentage(quota.dailyUsage, quota.dailyLimit).toFixed(1)}% used
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Monthly Usage</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{quota.monthlyUsage}</span>
                  <span className="text-sm text-muted-foreground">/ {quota.monthlyLimit}</span>
                </div>
                <Progress 
                  value={getUsagePercentage(quota.monthlyUsage, quota.monthlyLimit)} 
                  className="h-2"
                />
                <span className={`text-xs ${getUsageColor(getUsagePercentage(quota.monthlyUsage, quota.monthlyLimit))}`}>
                  {getUsagePercentage(quota.monthlyUsage, quota.monthlyLimit).toFixed(1)}% used
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">API Credits</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{quota.apiCredits}</span>
                  <Badge variant={quota.apiCredits > 100 ? "default" : "destructive"}>
                    {safeToUpper(quota.planType, 'FREE')}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Available credits for API calls
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium">Plan Status</span>
              </div>
              <div className="space-y-2">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {safeToUpper(quota?.planType, 'FREE')}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  Last reset: {new Date(quota.lastResetDate).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Statistics */}
      {stats && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="providers">By Provider</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold">{formatNumber(stats.totalRequests)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {stats.totalRequests > 0 
                          ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Credits Used</p>
                      <p className="text-2xl font-bold">{formatNumber(stats.creditsUsed)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Response</p>
                      <p className="text-2xl font-bold">{formatResponseTime(stats.averageResponseTime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {stats.failedRequests > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {stats.failedRequests} requests failed in the selected period. 
                  Check the Performance tab for details.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends</CardTitle>
                <CardDescription>Daily API requests and credit consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.usageByDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <YAxis yAxisId="requests" orientation="left" />
                      <YAxis yAxisId="credits" orientation="right" />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <Line 
                        yAxisId="requests"
                        type="monotone" 
                        dataKey="requests" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Requests"
                      />
                      <Line 
                        yAxisId="credits"
                        type="monotone" 
                        dataKey="credits" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        name="Credits"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage by Provider</CardTitle>
                <CardDescription>API requests breakdown by integration provider</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.usageByProvider).map(([provider, count]) => {
                    const percentage = (count / stats.totalRequests) * 100
                    return (
                      <div key={provider} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{provider.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {count} requests
                            </span>
                            <Badge variant="outline">
                              {percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time</CardTitle>
                  <CardDescription>Average API response times</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      {formatResponseTime(stats.averageResponseTime)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average response time
                    </div>
                    {stats.averageResponseTime > 2000 && (
                      <Alert className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Response times are higher than recommended. Consider optimizing your API calls.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Rate</CardTitle>
                  <CardDescription>Failed requests analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      {stats.totalRequests > 0 
                        ? ((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Error rate ({stats.failedRequests} failed)
                    </div>
                    {stats.failedRequests > 0 && (
                      <div className="mt-4 text-left">
                        <p className="text-sm text-muted-foreground mb-2">Common issues:</p>
                        <ul className="text-xs space-y-1">
                          <li>• Rate limit exceeded</li>
                          <li>• Invalid API credentials</li>
                          <li>• Network timeouts</li>
                          <li>• Malformed requests</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {loading && (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading usage data...</span>
        </div>
      )}
    </div>
  )
}