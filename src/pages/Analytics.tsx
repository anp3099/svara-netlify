import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Mail, MessageSquare, DollarSign, Calendar, Filter, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { blink } from '@/blink/client'

interface AnalyticsData {
  totalCampaigns: number
  activeCampaigns: number
  totalLeads: number
  contactedLeads: number
  responses: number
  conversions: number
  responseRate: number
  conversionRate: number
  revenueGenerated: number
}

interface CampaignPerformance {
  id: string
  name: string
  leads: number
  contacted: number
  responses: number
  conversions: number
  responseRate: number
  conversionRate: number
  status: string
}

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeads: 0,
    contactedLeads: 0,
    responses: 0,
    conversions: 0,
    responseRate: 0,
    conversionRate: 0,
    revenueGenerated: 0
  })
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([])
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(true)

  // Sample data for charts
  const performanceData = [
    { name: 'Week 1', emails: 1200, responses: 84, conversions: 12 },
    { name: 'Week 2', emails: 1800, responses: 126, conversions: 18 },
    { name: 'Week 3', emails: 2200, responses: 154, conversions: 22 },
    { name: 'Week 4', emails: 1900, responses: 133, conversions: 19 },
  ]

  const channelData = [
    { name: 'Email', value: 65, color: '#3B82F6' },
    { name: 'LinkedIn', value: 25, color: '#8B5CF6' },
    { name: 'SMS', value: 10, color: '#10B981' },
  ]

  const industryData = [
    { name: 'Technology', responses: 45, conversions: 8 },
    { name: 'Healthcare', responses: 32, conversions: 6 },
    { name: 'Finance', responses: 28, conversions: 5 },
    { name: 'Manufacturing', responses: 22, conversions: 4 },
    { name: 'Education', responses: 18, conversions: 3 },
  ]

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const user = await blink.auth.me()
      
      // Load campaigns
      const campaigns = await blink.db.campaigns.list({
        where: { user_id: user.id }
      })

      // Calculate analytics
      const totalCampaigns = campaigns.length
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length
      const totalLeads = campaigns.reduce((sum, c) => sum + (c.total_leads || 0), 0)
      const contactedLeads = campaigns.reduce((sum, c) => sum + (c.contacted_leads || 0), 0)
      const responses = campaigns.reduce((sum, c) => sum + (c.responses || 0), 0)
      const conversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0)
      
      const responseRate = contactedLeads > 0 ? (responses / contactedLeads) * 100 : 0
      const conversionRate = responses > 0 ? (conversions / responses) * 100 : 0
      const revenueGenerated = conversions * 2500 // Assume $2500 average deal size

      setAnalyticsData({
        totalCampaigns,
        activeCampaigns,
        totalLeads,
        contactedLeads,
        responses,
        conversions,
        responseRate,
        conversionRate,
        revenueGenerated
      })

      // Transform campaigns for performance table
      const performanceData = campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        leads: campaign.total_leads || 0,
        contacted: campaign.contacted_leads || 0,
        responses: campaign.responses || 0,
        conversions: campaign.conversions || 0,
        responseRate: campaign.contacted_leads > 0 ? ((campaign.responses || 0) / campaign.contacted_leads) * 100 : 0,
        conversionRate: campaign.responses > 0 ? ((campaign.conversions || 0) / campaign.responses) * 100 : 0,
        status: campaign.status
      }))

      setCampaignPerformance(performanceData)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const exportAnalytics = () => {
    const csvContent = [
      ['Campaign Name', 'Total Leads', 'Contacted', 'Responses', 'Conversions', 'Response Rate', 'Conversion Rate', 'Status'].join(','),
      ...campaignPerformance.map(campaign => [
        campaign.name,
        campaign.leads,
        campaign.contacted,
        campaign.responses,
        campaign.conversions,
        `${campaign.responseRate.toFixed(1)}%`,
        `${campaign.conversionRate.toFixed(1)}%`,
        campaign.status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spark_analytics_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Loading performance data...</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your campaign performance and ROI</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.activeCampaigns} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.contactedLeads.toLocaleString()} contacted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.responseRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.responses} total responses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.revenueGenerated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.conversions} conversions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance Over Time</CardTitle>
            <CardDescription>Email sends, responses, and conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="emails" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="responses" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="conversions" stroke="#F59E0B" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
            <CardDescription>Outreach channels by volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {channelData.map((entry, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-gray-600">{entry.name} ({entry.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Industry Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Industry</CardTitle>
          <CardDescription>Response and conversion rates across different industries</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={industryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="responses" fill="#3B82F6" />
              <Bar dataKey="conversions" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Detailed performance metrics for all campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Leads</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Contacted</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Responses</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Conversions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Response Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Conversion Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaignPerformance.map((campaign) => (
                  <tr key={campaign.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{campaign.leads.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600">{campaign.contacted.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-600">{campaign.responses}</td>
                    <td className="py-3 px-4 text-gray-600">{campaign.conversions}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Progress value={campaign.responseRate} className="w-16 h-2" />
                        <span className="text-sm text-gray-600">{campaign.responseRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Progress value={campaign.conversionRate} className="w-16 h-2" />
                        <span className="text-sm text-gray-600">{campaign.conversionRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {campaignPerformance.length === 0 && (
            <div className="text-center py-8">
              <BarChart3 className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaign data yet</h3>
              <p className="text-gray-600">Create and launch campaigns to see performance analytics.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}