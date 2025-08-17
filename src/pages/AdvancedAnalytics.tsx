import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Mail, MessageSquare, Target, Calendar, Filter, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface AnalyticsData {
  campaigns: {
    total: number
    active: number
    paused: number
    completed: number
  }
  performance: {
    total_leads: number
    contacted: number
    responses: number
    conversions: number
    response_rate: number
    conversion_rate: number
  }
  trends: {
    date: string
    leads: number
    responses: number
    conversions: number
  }[]
  channels: {
    name: string
    sent: number
    opened: number
    clicked: number
    replied: number
  }[]
  top_campaigns: {
    id: string
    name: string
    leads: number
    responses: number
    conversions: number
    response_rate: number
  }[]
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function AdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedCampaign, setSelectedCampaign] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    campaigns: {
      total: 12,
      active: 8,
      paused: 3,
      completed: 1
    },
    performance: {
      total_leads: 15420,
      contacted: 12350,
      responses: 2468,
      conversions: 492,
      response_rate: 19.98,
      conversion_rate: 3.19
    },
    trends: [
      { date: '2024-01-01', leads: 450, responses: 89, conversions: 18 },
      { date: '2024-01-02', leads: 520, responses: 104, conversions: 21 },
      { date: '2024-01-03', leads: 380, responses: 76, conversions: 15 },
      { date: '2024-01-04', leads: 610, responses: 122, conversions: 24 },
      { date: '2024-01-05', leads: 490, responses: 98, conversions: 20 },
      { date: '2024-01-06', leads: 560, responses: 112, conversions: 22 },
      { date: '2024-01-07', leads: 420, responses: 84, conversions: 17 }
    ],
    channels: [
      { name: 'Email', sent: 8500, opened: 3400, clicked: 680, replied: 170 },
      { name: 'LinkedIn', sent: 2800, opened: 1400, clicked: 420, replied: 84 },
      { name: 'SMS', sent: 1200, opened: 960, clicked: 192, replied: 48 }
    ],
    top_campaigns: [
      { id: '1', name: 'Enterprise SaaS Q1', leads: 2500, responses: 625, conversions: 125, response_rate: 25.0 },
      { id: '2', name: 'Agency Partnership', leads: 1800, responses: 360, conversions: 72, response_rate: 20.0 },
      { id: '3', name: 'SMB Outreach', leads: 3200, responses: 480, conversions: 96, response_rate: 15.0 },
      { id: '4', name: 'Healthcare Tech', leads: 1500, responses: 225, conversions: 45, response_rate: 15.0 }
    ]
  })

  const refreshData = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  const exportData = () => {
    const csvContent = [
      ['Campaign', 'Leads', 'Responses', 'Conversions', 'Response Rate'],
      ...analyticsData.top_campaigns.map(campaign => [
        campaign.name,
        campaign.leads,
        campaign.responses,
        campaign.conversions,
        `${campaign.response_rate}%`
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `svara-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-1">Real-time insights and performance metrics for your campaigns</p>
        </div>
        <div className="flex items-center space-x-3">
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
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.performance.total_leads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.performance.contacted.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.2%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.performance.response_rate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.performance.conversions}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+15.3%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Daily leads, responses, and conversions over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                <Line type="monotone" dataKey="leads" stroke="#6366F1" strokeWidth={2} name="Leads" />
                <Line type="monotone" dataKey="responses" stroke="#10B981" strokeWidth={2} name="Responses" />
                <Line type="monotone" dataKey="conversions" stroke="#F59E0B" strokeWidth={2} name="Conversions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
            <CardDescription>Performance breakdown by communication channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.channels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sent" fill="#6366F1" name="Sent" />
                <Bar dataKey="opened" fill="#10B981" name="Opened" />
                <Bar dataKey="replied" fill="#F59E0B" name="Replied" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="leads">Lead Quality</TabsTrigger>
          <TabsTrigger value="optimization">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Campaigns</CardTitle>
              <CardDescription>Campaigns ranked by response rate and conversion performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.top_campaigns.map((campaign, index) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                        <p className="text-sm text-gray-600">
                          {campaign.leads.toLocaleString()} leads • {campaign.responses} responses • {campaign.conversions} conversions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{campaign.response_rate}%</div>
                      <div className="text-sm text-gray-600">Response Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sequences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sequence Performance</CardTitle>
              <CardDescription>AI-generated sequence effectiveness and optimization opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">4.2</div>
                    <div className="text-sm text-blue-700">Avg Steps to Response</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">68%</div>
                    <div className="text-sm text-green-700">Sequence Completion Rate</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">12.5%</div>
                    <div className="text-sm text-amber-700">Drop-off Rate</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Best Performing Subject Lines</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">"Quick question about {{company_name}}'s growth"</span>
                      <Badge variant="secondary">34% open rate</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">"{{contact_name}}, saw your recent {{industry}} expansion"</span>
                      <Badge variant="secondary">28% open rate</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">"Following up on {{company_name}}'s automation needs"</span>
                      <Badge variant="secondary">25% open rate</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Quality Analysis</CardTitle>
              <CardDescription>AI-powered lead scoring and quality insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Lead Score Distribution</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Hot (90-100)', value: 15, color: '#10B981' },
                            { name: 'Warm (70-89)', value: 35, color: '#F59E0B' },
                            { name: 'Cold (50-69)', value: 40, color: '#6B7280' },
                            { name: 'Poor (<50)', value: 10, color: '#EF4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {[
                            { name: 'Hot (90-100)', value: 15, color: '#10B981' },
                            { name: 'Warm (70-89)', value: 35, color: '#F59E0B' },
                            { name: 'Cold (50-69)', value: 40, color: '#6B7280' },
                            { name: 'Poor (<50)', value: 10, color: '#EF4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Top Converting Industries</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Technology</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={85} className="w-20 h-2" />
                          <span className="text-sm font-medium">8.5%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Healthcare</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={72} className="w-20 h-2" />
                          <span className="text-sm font-medium">7.2%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Financial Services</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={68} className="w-20 h-2" />
                          <span className="text-sm font-medium">6.8%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Manufacturing</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={54} className="w-20 h-2" />
                          <span className="text-sm font-medium">5.4%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Optimization Insights</CardTitle>
              <CardDescription>Machine learning recommendations to improve campaign performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">🚀 Performance Boost Opportunity</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    AI analysis suggests sending emails between 10-11 AM could increase open rates by 23%.
                  </p>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Apply Optimization
                  </Button>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">✨ Subject Line Optimization</h4>
                  <p className="text-sm text-green-800 mb-3">
                    Adding industry-specific keywords could improve open rates by 15% for your Technology campaigns.
                  </p>
                  <Button size="sm" variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white">
                    View Suggestions
                  </Button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 mb-2">⚡ Lead Scoring Enhancement</h4>
                  <p className="text-sm text-amber-800 mb-3">
                    Companies with 51-200 employees show 40% higher conversion rates. Consider adjusting targeting.
                  </p>
                  <Button size="sm" variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white">
                    Update Targeting
                  </Button>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2">🎯 Sequence Optimization</h4>
                  <p className="text-sm text-purple-800 mb-3">
                    Adding a LinkedIn touchpoint on day 3 could increase overall response rates by 18%.
                  </p>
                  <Button size="sm" variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white">
                    Add Touchpoint
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}