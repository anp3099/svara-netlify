import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  Target,
  Calendar
} from 'lucide-react'
import { quotaTracker, UserQuota, PLAN_LIMITS } from '@/services/quotaTracker'
import { createClient } from '@blinkdotnew/sdk'
import { safeCapitalize } from '@/lib/utils'

const blink = createClient({
  projectId: 'spark-ai-sales-outreach-saas-platform-68hyt0cq',
  authRequired: true
})

interface UsageDashboardProps {
  onUpgradeClick?: () => void
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export function UsageDashboard({ onUpgradeClick }: UsageDashboardProps) {
  const [quota, setQuota] = useState<UserQuota | null>(null)
  const [usageStats, setUsageStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadUsageData(state.user.id)
      }
    })
    return unsubscribe
  }, [])

  const loadUsageData = async (userId: string) => {
    try {
      setLoading(true)
      const [quotaData, statsData] = await Promise.all([
        quotaTracker.getUserQuota(userId),
        quotaTracker.getUsageStats(userId, 30)
      ])
      
      setQuota(quotaData)
      setUsageStats(statsData)
    } catch (error) {
      console.error('Error loading usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDailyUsagePercentage = () => {
    if (!quota) return 0
    return Math.min((quota.dailyUsage / quota.dailyLimit) * 100, 100)
  }

  const getMonthlyUsagePercentage = () => {
    if (!quota) return 0
    return Math.min((quota.monthlyUsage / quota.monthlyLimit) * 100, 100)
  }

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 90) return { color: 'destructive', icon: AlertTriangle }
    if (percentage >= 70) return { color: 'warning', icon: Clock }
    return { color: 'success', icon: CheckCircle }
  }

  const formatProviderData = () => {
    if (!usageStats?.usageByProvider) return []
    
    return Object.entries(usageStats.usageByProvider).map(([provider, usage], index) => ({
      name: provider ? safeCapitalize(provider, 'Unknown') : 'Unknown',
      value: usage,
      color: COLORS[index % COLORS.length]
    }))
  }

  const getNextPlanRecommendation = () => {
    if (!quota) return null
    
    const planOrder = ['free', 'starter', 'growth', 'pro', 'enterprise']
    const currentIndex = planOrder.indexOf(quota.planType)
    
    if (currentIndex < planOrder.length - 1) {
      const nextPlan = planOrder[currentIndex + 1]
      return {
        name: nextPlan ? safeCapitalize(nextPlan, 'Unknown') : 'Unknown',
        limits: PLAN_LIMITS[nextPlan]
      }
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!quota) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load usage data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  const dailyStatus = getUsageStatus(getDailyUsagePercentage())
  const monthlyStatus = getUsageStatus(getMonthlyUsagePercentage())
  const nextPlan = getNextPlanRecommendation()

  return (
    <div className="space-y-6">
      {/* Usage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
            <dailyStatus.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quota.dailyUsage} / {quota.dailyLimit}
            </div>
            <Progress 
              value={getDailyUsagePercentage()} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {quota.dailyLimit - quota.dailyUsage} leads remaining today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
            <monthlyStatus.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quota.monthlyUsage} / {quota.monthlyLimit}
            </div>
            <Progress 
              value={getMonthlyUsagePercentage()} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {quota.monthlyLimit - quota.monthlyUsage} leads remaining this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {quota.planType}
            </div>
            <Badge variant="outline" className="mt-2">
              {quota.apiCredits} API Credits
            </Badge>
            {nextPlan && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={onUpgradeClick}
              >
                Upgrade to {nextPlan.name}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Warnings */}
      {(getDailyUsagePercentage() >= 80 || getMonthlyUsagePercentage() >= 80) && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            You're approaching your usage limits. Consider upgrading your plan to avoid interruptions.
            {nextPlan && (
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2 text-orange-600"
                onClick={onUpgradeClick}
              >
                Upgrade to {nextPlan.name} →
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api-usage">API Usage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage by API Provider</CardTitle>
                <CardDescription>
                  Distribution of your API calls across different services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatProviderData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {formatProviderData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Comparison</CardTitle>
                <CardDescription>
                  See how your current plan compares to others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(PLAN_LIMITS).map(([plan, limits]) => (
                  <div key={plan} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium capitalize flex items-center gap-2">
                        {plan}
                        {plan === quota.planType && (
                          <Badge variant="secondary">Current</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {limits.daily}/day • {limits.monthly}/month
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{limits.apiCredits} credits</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageStats?.totalApiCalls || 0}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageStats?.successRate?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">API call success rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usageStats?.averageResponseTime?.toFixed(0) || 0}ms
                </div>
                <p className="text-xs text-muted-foreground">Average API response</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Recommendations</CardTitle>
              <CardDescription>
                Tips to optimize your lead generation efficiency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {getDailyUsagePercentage() > 80 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <Target className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-orange-800">High Daily Usage</div>
                      <div className="text-sm text-orange-700">
                        You're using {getDailyUsagePercentage().toFixed(0)}% of your daily quota. 
                        Consider upgrading to avoid hitting limits.
                      </div>
                    </div>
                  </div>
                )}
                
                {usageStats?.successRate < 90 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-yellow-800">Low Success Rate</div>
                      <div className="text-sm text-yellow-700">
                        Your API success rate is {usageStats.successRate.toFixed(1)}%. 
                        Check your search criteria for better results.
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-800">Optimization Tips</div>
                    <div className="text-sm text-green-700">
                      • Use specific industry filters to improve lead quality
                      • Batch your searches during off-peak hours
                      • Review and refine your target criteria regularly
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}