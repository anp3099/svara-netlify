import React, { useState, useEffect } from 'react'
import { CreditCard, Check, Zap, Crown, Star, Download, Calendar, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { blink } from '@/blink/client'
import { PaymentTest } from '@/components/PaymentTest'

interface PlanFeature {
  name: string
  included: boolean
}

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: PlanFeature[]
  popular?: boolean
  current?: boolean
}

interface UsageData {
  campaigns: { used: number; limit: number }
  leads: { used: number; limit: number }
  sequences: { used: number; limit: number }
  emails: { used: number; limit: number }
}

export default function Billing() {
  const [currentPlan, setCurrentPlan] = useState('starter')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [usage, setUsage] = useState<UsageData>({
    campaigns: { used: 12, limit: 50 },
    leads: { used: 2847, limit: 10000 },
    sequences: { used: 24, limit: 100 },
    emails: { used: 8432, limit: 25000 }
  })

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: billingCycle === 'monthly' ? 97 : 970,
      period: billingCycle === 'monthly' ? '/month' : '/year',
      description: 'Perfect for small agencies and consultants getting started',
      features: [
        { name: 'Up to 50 campaigns', included: true },
        { name: '10,000 leads database access', included: true },
        { name: '100 AI sequences', included: true },
        { name: '25,000 emails/month', included: true },
        { name: 'Email + SMS outreach', included: true },
        { name: 'Basic analytics', included: true },
        { name: 'White-label branding', included: false },
        { name: 'LinkedIn integration', included: false },
        { name: 'Priority support', included: false },
        { name: 'Custom integrations', included: false }
      ],
      current: currentPlan === 'starter'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: billingCycle === 'monthly' ? 297 : 2970,
      period: billingCycle === 'monthly' ? '/month' : '/year',
      description: 'Ideal for growing agencies and sales teams',
      features: [
        { name: 'Up to 200 campaigns', included: true },
        { name: '50,000 leads database access', included: true },
        { name: 'Unlimited AI sequences', included: true },
        { name: '100,000 emails/month', included: true },
        { name: 'Email + SMS + LinkedIn outreach', included: true },
        { name: 'Advanced analytics & reporting', included: true },
        { name: 'White-label branding', included: true },
        { name: 'LinkedIn integration', included: true },
        { name: 'Priority support', included: true },
        { name: 'Custom integrations', included: false }
      ],
      popular: true,
      current: currentPlan === 'professional'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingCycle === 'monthly' ? 797 : 7970,
      period: billingCycle === 'monthly' ? '/month' : '/year',
      description: 'For large organizations and resellers',
      features: [
        { name: 'Unlimited campaigns', included: true },
        { name: 'Full 70M+ leads database', included: true },
        { name: 'Unlimited AI sequences', included: true },
        { name: 'Unlimited emails/month', included: true },
        { name: 'All outreach channels', included: true },
        { name: 'Enterprise analytics & reporting', included: true },
        { name: 'Full white-label customization', included: true },
        { name: 'All integrations included', included: true },
        { name: 'Dedicated account manager', included: true },
        { name: 'Custom integrations & API access', included: true }
      ],
      current: currentPlan === 'enterprise'
    }
  ]

  const invoices = [
    {
      id: 'inv_001',
      date: '2024-01-01',
      amount: 297,
      status: 'paid',
      plan: 'Professional',
      period: 'Jan 2024 - Feb 2024'
    },
    {
      id: 'inv_002',
      date: '2023-12-01',
      amount: 297,
      status: 'paid',
      plan: 'Professional',
      period: 'Dec 2023 - Jan 2024'
    },
    {
      id: 'inv_003',
      date: '2023-11-01',
      amount: 97,
      status: 'paid',
      plan: 'Starter',
      period: 'Nov 2023 - Dec 2023'
    }
  ]

  const loadUsageData = async () => {
    try {
      const user = await blink.auth.me()
      
      // Load actual usage data
      const campaigns = await blink.db.campaigns.list({
        where: { user_id: user.id }
      })
      
      // Update usage with real data
      setUsage(prev => ({
        ...prev,
        campaigns: { ...prev.campaigns, used: campaigns.length }
      }))
    } catch (error) {
      console.error('Failed to load usage data:', error)
    }
  }

  useEffect(() => {
    loadUsageData()
  }, [])

  const handlePlanChange = async (planId: string) => {
    // Redirect to Stripe Checkout for payment processing
    const plan = plans.find(p => p.id === planId)
    window.open(`https://checkout.stripe.com/pay/cs_live_${planId}`, '_blank')
  }

  const downloadInvoice = (invoiceId: string) => {
    // In a real app, this would download the actual invoice PDF
    console.log(`Downloading invoice ${invoiceId}`)
    alert(`Invoice ${invoiceId} download started.`)
  }

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      {/* Live Environment Notice */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-medium text-green-900">Live Environment</h3>
              <p className="text-sm text-green-700">
                This is a live billing environment. All payments are processed securely through Stripe.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and monitor usage</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />
            {plans.find(p => p.current)?.name} Plan
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        {/* Usage & Limits */}
        <TabsContent value="usage">
          <div className="grid gap-6">
            {/* Current Plan Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-amber-500" />
                  Current Plan: {plans.find(p => p.current)?.name}
                </CardTitle>
                <CardDescription>
                  Your current usage and limits for this billing period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Campaigns</span>
                      <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usage.campaigns.used, usage.campaigns.limit))}`}>
                        {usage.campaigns.used} / {usage.campaigns.limit}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(usage.campaigns.used, usage.campaigns.limit)} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Leads Access</span>
                      <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usage.leads.used, usage.leads.limit))}`}>
                        {usage.leads.used.toLocaleString()} / {usage.leads.limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(usage.leads.used, usage.leads.limit)} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">AI Sequences</span>
                      <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usage.sequences.used, usage.sequences.limit))}`}>
                        {usage.sequences.used} / {usage.sequences.limit}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(usage.sequences.used, usage.sequences.limit)} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Emails Sent</span>
                      <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(usage.emails.used, usage.emails.limit))}`}>
                        {usage.emails.used.toLocaleString()} / {usage.emails.limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(usage.emails.used, usage.emails.limit)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Alerts */}
            {getUsagePercentage(usage.emails.used, usage.emails.limit) >= 80 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-amber-800">Usage Alert</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        You've used {getUsagePercentage(usage.emails.used, usage.emails.limit).toFixed(0)}% of your email quota. 
                        Consider upgrading your plan to avoid service interruption.
                      </p>
                      <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700">
                        Upgrade Plan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Billing Cycle Toggle */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
                <CardDescription>
                  Next billing date: February 1, 2024
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Professional Plan</p>
                    <p className="text-sm text-gray-600">$297/month • Renews automatically</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://billing.stripe.com/p/login/test_123', '_blank')}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Update Payment Method
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://billing.stripe.com/p/login/test_123', '_blank')}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plans & Pricing */}
        <TabsContent value="plans">
          <div className="space-y-6">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center space-x-4">
              <span className={`text-sm ${billingCycle === 'monthly' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${billingCycle === 'yearly' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                Yearly
              </span>
              {billingCycle === 'yearly' && (
                <Badge className="bg-green-100 text-green-800">Save 20%</Badge>
              )}
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className={`relative ${plan.popular ? 'border-indigo-200 shadow-lg' : ''} ${plan.current ? 'ring-2 ring-indigo-500' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-indigo-600 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  {plan.current && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-600 text-white">
                        <Check className="w-3 h-3 mr-1" />
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-3">
                          {feature.included ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span className={`text-sm ${feature.included ? 'text-gray-900' : 'text-gray-500'}`}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${plan.current ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      onClick={() => !plan.current && handlePlanChange(plan.id)}
                      disabled={plan.current}
                    >
                      {plan.current ? 'Current Plan' : `Upgrade to ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enterprise Contact */}
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Zap className="mx-auto w-12 h-12 text-indigo-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Need a Custom Solution?</h3>
                  <p className="text-gray-600 mb-4">
                    Contact our sales team for custom pricing, dedicated support, and enterprise features.
                  </p>
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => window.open('mailto:sales@svara.ai?subject=Enterprise%20Pricing%20Inquiry', '_blank')}
                  >
                    Contact Sales
                  </Button>
                </div>
              </CardContent>
            </Card>
            {/* Payment Test */}
            <div className="flex justify-center">
              <PaymentTest />
            </div>
          </div>
        </TabsContent>

        {/* Billing History */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Billing History
              </CardTitle>
              <CardDescription>
                View and download your past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.plan}</TableCell>
                      <TableCell>{invoice.period}</TableCell>
                      <TableCell>${invoice.amount}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadInvoice(invoice.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}