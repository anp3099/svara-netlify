import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { UserQuota, PLAN_LIMITS } from '@/services/quotaTracker'
import { safeCapitalize } from '@/lib/utils'

interface QuotaLimitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quota: UserQuota | null
  onUpgrade: () => void
  limitType: 'daily' | 'monthly'
}

export function QuotaLimitModal({ 
  open, 
  onOpenChange, 
  quota, 
  onUpgrade, 
  limitType 
}: QuotaLimitModalProps) {
  if (!quota) return null

  const isDaily = limitType === 'daily'
  const currentUsage = isDaily ? quota.dailyUsage : quota.monthlyUsage
  const currentLimit = isDaily ? quota.dailyLimit : quota.monthlyLimit
  const usagePercentage = (currentUsage / currentLimit) * 100

  const getNextPlan = () => {
    const planOrder = ['free', 'starter', 'growth', 'pro', 'enterprise']
    const currentIndex = planOrder.indexOf(quota.planType)
    
    if (currentIndex < planOrder.length - 1) {
      const nextPlan = planOrder[currentIndex + 1]
      return {
        name: nextPlan ? safeCapitalize(nextPlan, 'Unknown') : 'Unknown',
        key: nextPlan,
        limits: PLAN_LIMITS[nextPlan]
      }
    }
    
    return null
  }

  const nextPlan = getNextPlan()

  const resetTime = isDaily 
    ? 'midnight UTC tonight'
    : 'the 1st of next month'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {isDaily ? 'Daily' : 'Monthly'} Lead Limit Reached
          </DialogTitle>
          <DialogDescription>
            You've reached your {isDaily ? 'daily' : 'monthly'} lead generation limit. 
            Here are your options to continue generating leads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Usage</CardTitle>
              <CardDescription>
                Your {isDaily ? 'daily' : 'monthly'} lead generation activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {currentUsage} / {currentLimit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Leads generated {isDaily ? 'today' : 'this month'}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {quota.planType} Plan
                </Badge>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <div className="text-sm text-muted-foreground">
                {usagePercentage.toFixed(0)}% of your {isDaily ? 'daily' : 'monthly'} quota used
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wait for Reset */}
            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-blue-500 mb-2" />
                <CardTitle className="text-lg">Wait for Reset</CardTitle>
                <CardDescription>
                  Your quota will automatically reset at {resetTime}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <strong>Free option:</strong> No additional cost
                  </div>
                  <div className="text-sm text-muted-foreground">
                    You can continue using the platform for other features like 
                    campaign management and analytics.
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onOpenChange(false)}
                  >
                    Continue with Current Plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upgrade Plan */}
            {nextPlan && (
              <Card className="border-primary">
                <CardHeader>
                  <Zap className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Upgrade to {nextPlan.name}</CardTitle>
                  <CardDescription>
                    Get more leads and advanced features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Daily Leads:</span>
                        <span className="font-medium">{nextPlan.limits.daily}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Monthly Leads:</span>
                        <span className="font-medium">{nextPlan.limits.monthly.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>API Credits:</span>
                        <span className="font-medium">{nextPlan.limits.apiCredits.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        onUpgrade()
                        onOpenChange(false)
                      }}
                    >
                      Upgrade Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Plan Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan Comparison</CardTitle>
              <CardDescription>
                See how upgrading would benefit your lead generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium border-b pb-2">
                  <div>Plan</div>
                  <div>Daily Leads</div>
                  <div>Monthly Leads</div>
                  <div>API Credits</div>
                </div>
                
                {Object.entries(PLAN_LIMITS).map(([plan, limits]) => (
                  <div 
                    key={plan}
                    className={`grid grid-cols-4 gap-4 text-sm py-2 rounded-lg px-3 ${
                      plan === quota.planType 
                        ? 'bg-muted' 
                        : plan === nextPlan?.key 
                        ? 'bg-primary/5 border border-primary/20' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-medium">{plan}</span>
                      {plan === quota.planType && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                      {plan === nextPlan?.key && (
                        <Badge variant="default" className="text-xs">Recommended</Badge>
                      )}
                    </div>
                    <div>{limits.daily}</div>
                    <div>{limits.monthly.toLocaleString()}</div>
                    <div>{limits.apiCredits.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Benefits of Upgrading */}
          {nextPlan && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle className="text-lg text-green-800">
                  Benefits of Upgrading to {nextPlan.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">
                        {((nextPlan.limits.daily - quota.dailyLimit) / quota.dailyLimit * 100).toFixed(0)}% more daily leads
                      </div>
                      <div className="text-green-700">
                        From {quota.dailyLimit} to {nextPlan.limits.daily} leads per day
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">
                        {((nextPlan.limits.monthly - quota.monthlyLimit) / quota.monthlyLimit * 100).toFixed(0)}% more monthly leads
                      </div>
                      <div className="text-green-700">
                        From {quota.monthlyLimit.toLocaleString()} to {nextPlan.limits.monthly.toLocaleString()} leads per month
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Enhanced API access</div>
                      <div className="text-green-700">
                        {nextPlan.limits.apiCredits.toLocaleString()} API credits for enrichment
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium">Priority support</div>
                      <div className="text-green-700">
                        Faster response times and dedicated assistance
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}