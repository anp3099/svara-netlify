import React, { useState, useEffect, useCallback } from 'react'
import { Play, Pause, Settings, BarChart3, Users, Mail, MessageSquare, Phone, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { blink } from '@/blink/client'

interface Campaign {
  id: string
  name: string
  description: string
  status: string
  total_leads: number
  contacted_leads: number
  responses: number
  conversions: number
  created_at: string
  launched_at?: string
  product_id: string
}

interface CampaignStats {
  response_rate: number
  conversion_rate: number
  email_open_rate: number
  click_through_rate: number
  daily_contacts: number
  avg_response_time: number
}

interface CampaignManagerProps {
  campaignId: string
  onClose?: () => void
}

export function CampaignManager({ campaignId, onClose }: CampaignManagerProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLaunching, setIsLaunching] = useState(false)

  const loadCampaignData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Load campaign details
      const campaignData = await blink.db.campaigns.list({
        where: { id: campaignId },
        limit: 1
      })

      if (campaignData.length > 0) {
        setCampaign(campaignData[0])
        
        // Calculate stats
        const campaignStats: CampaignStats = {
          response_rate: campaignData[0].total_leads > 0 ? (campaignData[0].responses / campaignData[0].total_leads) * 100 : 0,
          conversion_rate: campaignData[0].responses > 0 ? (campaignData[0].conversions / campaignData[0].responses) * 100 : 0,
          email_open_rate: 65 + Math.random() * 20, // Simulated
          click_through_rate: 12 + Math.random() * 8, // Simulated
          daily_contacts: Math.floor(campaignData[0].contacted_leads / 7) || 50, // Simulated
          avg_response_time: 2.5 + Math.random() * 2 // Simulated hours
        }
        setStats(campaignStats)
      }
    } catch (error) {
      console.error('Failed to load campaign data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    loadCampaignData()
  }, [loadCampaignData])

  const toggleCampaignStatus = async () => {
    if (!campaign) return
    
    setIsLaunching(true)
    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active'
      const updateData: any = { status: newStatus }
      
      if (newStatus === 'active' && !campaign.launched_at) {
        updateData.launched_at = new Date().toISOString()
      }

      await blink.db.campaigns.update(campaign.id, updateData)
      
      setCampaign(prev => prev ? { ...prev, status: newStatus, launched_at: updateData.launched_at || prev.launched_at } : null)
      
      // Simulate lead generation when launching
      if (newStatus === 'active' && campaign.total_leads === 0) {
        setTimeout(async () => {
          const simulatedLeads = Math.floor(Math.random() * 1000) + 500
          await blink.db.campaigns.update(campaign.id, {
            total_leads: simulatedLeads,
            contacted_leads: Math.floor(simulatedLeads * 0.3),
            responses: Math.floor(simulatedLeads * 0.15),
            conversions: Math.floor(simulatedLeads * 0.05)
          })
          loadCampaignData()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to update campaign status:', error)
    } finally {
      setIsLaunching(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800' },
      active: { label: 'Active', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      paused: { label: 'Paused', variant: 'outline' as const, color: 'bg-amber-100 text-amber-800' },
      completed: { label: 'Completed', variant: 'destructive' as const, color: 'bg-blue-100 text-blue-800' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading campaign...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Campaign not found</p>
        {onClose && (
          <Button onClick={onClose} className="mt-4">
            Go Back
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            {getStatusBadge(campaign.status)}
          </div>
          <p className="text-gray-600 mt-1">{campaign.description}</p>
          {campaign.launched_at && (
            <p className="text-sm text-gray-500 mt-1">
              Launched {new Date(campaign.launched_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={toggleCampaignStatus}
            disabled={isLaunching}
            className={campaign.status === 'active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isLaunching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : campaign.status === 'active' ? (
              <Pause className="w-4 h-4 mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isLaunching ? 'Processing...' : campaign.status === 'active' ? 'Pause Campaign' : 'Launch Campaign'}
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Campaign Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{campaign.total_leads.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Mail className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{campaign.contacted_leads.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Contacted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-amber-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{campaign.responses.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{campaign.conversions.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Conversions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Key metrics and conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Response Rate</span>
                          <span>{stats.response_rate.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats.response_rate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Conversion Rate</span>
                          <span>{stats.conversion_rate.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats.conversion_rate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Email Open Rate</span>
                          <span>{stats.email_open_rate.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats.email_open_rate} className="h-2" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-gray-600 mr-2" />
                          <span className="text-sm text-gray-700">Daily Contacts</span>
                        </div>
                        <span className="font-medium">{stats.daily_contacts}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-gray-600 mr-2" />
                          <span className="text-sm text-gray-700">Avg Response Time</span>
                        </div>
                        <span className="font-medium">{stats.avg_response_time.toFixed(1)}h</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
                          <span className="text-sm text-gray-700">Click Through Rate</span>
                        </div>
                        <span className="font-medium">{stats.click_through_rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sequences">
          <Card>
            <CardHeader>
              <CardTitle>AI Sequences</CardTitle>
              <CardDescription>Automated outreach sequences for this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">AI sequences will be displayed here</p>
                <Button>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Sequences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Leads</CardTitle>
              <CardDescription>Leads targeted by this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Lead management interface will be displayed here</p>
                <Button>
                  <Users className="w-4 h-4 mr-2" />
                  Manage Leads
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest outreach activities and responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Activity timeline will be displayed here</p>
                <Button>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Full Activity
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}