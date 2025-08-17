import React, { useState, useEffect } from 'react'
import { Mail, Linkedin, MessageSquare, Phone, Calendar, Target, Zap, Settings, Play, Pause, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { blink } from '@/blink/client'
import { safeToUpper, safeCapitalize } from '@/lib/utils'

interface Channel {
  id: string
  name: string
  type: 'email' | 'linkedin' | 'sms' | 'phone' | 'direct_mail'
  icon: React.ComponentType<any>
  enabled: boolean
  priority: number
  successRate: number
  avgResponseTime: number
  costPerContact: number
  dailyLimit: number
  currentUsage: number
}

interface SequenceStep {
  id: string
  stepNumber: number
  channel: string
  delayDays: number
  subject?: string
  content: string
  conditions: string[]
  enabled: boolean
}

interface ProspectJourney {
  id: string
  prospectName: string
  companyName: string
  currentStep: number
  totalSteps: number
  channels: string[]
  status: 'active' | 'paused' | 'completed' | 'responded'
  lastContact: string
  nextContact: string
  responseRate: number
}

export default function MultiChannelOrchestration() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [sequences, setSequences] = useState<SequenceStep[]>([])
  const [prospects, setProspects] = useState<ProspectJourney[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [orchestrationMode, setOrchestrationMode] = useState<'ai_optimized' | 'manual'>('ai_optimized')
  const [loading, setLoading] = useState(true)

  const loadChannels = async () => {
    const mockChannels: Channel[] = [
      {
        id: 'email',
        name: 'Email',
        type: 'email',
        icon: Mail,
        enabled: true,
        priority: 1,
        successRate: 12.5,
        avgResponseTime: 2.3,
        costPerContact: 0.05,
        dailyLimit: 500,
        currentUsage: 287
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        type: 'linkedin',
        icon: Linkedin,
        enabled: true,
        priority: 2,
        successRate: 18.7,
        avgResponseTime: 1.8,
        costPerContact: 0.15,
        dailyLimit: 100,
        currentUsage: 67
      },
      {
        id: 'sms',
        name: 'SMS',
        type: 'sms',
        icon: MessageSquare,
        enabled: false,
        priority: 3,
        successRate: 25.3,
        avgResponseTime: 0.5,
        costPerContact: 0.25,
        dailyLimit: 50,
        currentUsage: 0
      },
      {
        id: 'phone',
        name: 'Cold Calling',
        type: 'phone',
        icon: Phone,
        enabled: false,
        priority: 4,
        successRate: 8.2,
        avgResponseTime: 0.1,
        costPerContact: 2.50,
        dailyLimit: 20,
        currentUsage: 0
      }
    ]
    setChannels(mockChannels)
  }

  const loadSequences = async () => {
    const mockSequences: SequenceStep[] = [
      {
        id: '1',
        stepNumber: 1,
        channel: 'email',
        delayDays: 0,
        subject: 'Quick question about {{company_name}}\'s growth',
        content: 'Hi {{first_name}}, I noticed {{company_name}} recently {{recent_activity}}. I have a quick question about your {{department}} strategy...',
        conditions: ['lead_score > 70'],
        enabled: true
      },
      {
        id: '2',
        stepNumber: 2,
        channel: 'linkedin',
        delayDays: 3,
        content: 'Hi {{first_name}}, I sent you an email about {{company_name}}\'s {{pain_point}}. Would love to connect and share some insights...',
        conditions: ['email_not_opened', 'linkedin_profile_exists'],
        enabled: true
      },
      {
        id: '3',
        stepNumber: 3,
        channel: 'email',
        delayDays: 7,
        subject: 'Re: {{company_name}} - Different approach?',
        content: 'Hi {{first_name}}, I realize you\'re probably busy. Let me try a different approach...',
        conditions: ['no_response_previous_steps'],
        enabled: true
      },
      {
        id: '4',
        stepNumber: 4,
        channel: 'sms',
        delayDays: 14,
        content: 'Hi {{first_name}}, {{mutual_connection}} suggested I reach out about {{value_prop}}. Worth a quick chat?',
        conditions: ['phone_number_exists', 'high_intent_signals'],
        enabled: false
      }
    ]
    setSequences(mockSequences)
  }

  const loadProspectJourneys = async () => {
    const mockProspects: ProspectJourney[] = [
      {
        id: '1',
        prospectName: 'Sarah Johnson',
        companyName: 'TechCorp Inc.',
        currentStep: 2,
        totalSteps: 4,
        channels: ['email', 'linkedin'],
        status: 'active',
        lastContact: '2024-01-15T10:30:00Z',
        nextContact: '2024-01-18T10:30:00Z',
        responseRate: 0
      },
      {
        id: '2',
        prospectName: 'Mike Chen',
        companyName: 'DataFlow Systems',
        currentStep: 1,
        totalSteps: 4,
        channels: ['email'],
        status: 'responded',
        lastContact: '2024-01-14T14:15:00Z',
        nextContact: '',
        responseRate: 100
      },
      {
        id: '3',
        prospectName: 'Lisa Rodriguez',
        companyName: 'CloudTech Solutions',
        currentStep: 3,
        totalSteps: 4,
        channels: ['email', 'linkedin', 'email'],
        status: 'active',
        lastContact: '2024-01-12T09:45:00Z',
        nextContact: '2024-01-19T09:45:00Z',
        responseRate: 0
      }
    ]
    setProspects(mockProspects)
  }

  const loadOrchestrationData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadChannels(),
        loadSequences(),
        loadProspectJourneys()
      ])
    } catch (error) {
      console.error('Failed to load orchestration data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrchestrationData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, enabled: !channel.enabled }
        : channel
    ))
  }

  const updateChannelPriority = (channelId: string, priority: number) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, priority }
        : channel
    ))
  }

  const getChannelIcon = (channelType: string) => {
    const channel = channels.find(c => c.id === channelType)
    if (!channel) return Mail
    return channel.icon
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'responded': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Multi-Channel Orchestration</h1>
            <p className="text-gray-600 mt-1">Loading orchestration data...</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Multi-Channel Orchestration</h1>
          <p className="text-gray-600 mt-1">Coordinate email, LinkedIn, SMS, and phone outreach across all campaigns</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="orchestration-mode">AI Optimization:</Label>
            <Switch
              id="orchestration-mode"
              checked={orchestrationMode === 'ai_optimized'}
              onCheckedChange={(checked) => setOrchestrationMode(checked ? 'ai_optimized' : 'manual')}
            />
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Settings className="w-4 h-4 mr-2" />
            Configure Channels
          </Button>
        </div>
      </div>

      {/* Channel Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {channels.map((channel) => {
          const IconComponent = channel.icon
          return (
            <Card key={channel.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{channel.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={channel.enabled}
                    onCheckedChange={() => toggleChannel(channel.id)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate:</span>
                    <span className="font-medium">{channel.successRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Response:</span>
                    <span className="font-medium">{channel.avgResponseTime}d</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cost/Contact:</span>
                    <span className="font-medium">${channel.costPerContact}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Daily Usage:</span>
                      <span className="font-medium">{channel.currentUsage}/{channel.dailyLimit}</span>
                    </div>
                    <Progress value={(channel.currentUsage / channel.dailyLimit) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="sequences" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sequences">Sequence Builder</TabsTrigger>
          <TabsTrigger value="journeys">Prospect Journeys</TabsTrigger>
          <TabsTrigger value="analytics">Channel Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Channel Sequence</CardTitle>
              <CardDescription>
                Design cross-channel sequences that adapt based on prospect behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sequences.map((step, index) => {
                  const IconComponent = getChannelIcon(step.channel)
                  return (
                    <div key={step.id} className="relative">
                      {index > 0 && (
                        <div className="absolute left-6 -top-6 w-0.5 h-6 bg-gray-300" />
                      )}
                      <div className="flex items-start space-x-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-indigo-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold">Step {step.stepNumber}</h3>
                              <Badge variant="outline">{safeToUpper(step.channel, 'unknown')}</Badge>
                              <span className="text-sm text-gray-500">
                                {step.delayDays === 0 ? 'Immediate' : `${step.delayDays} days delay`}
                              </span>
                            </div>
                            <Switch checked={step.enabled} />
                          </div>
                          {step.subject && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-gray-700">Subject:</p>
                              <p className="text-sm text-gray-600">{step.subject}</p>
                            </div>
                          )}
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700">Content:</p>
                            <p className="text-sm text-gray-600">{step.content}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {step.conditions.map((condition, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {condition}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-center">
                  <Button variant="outline" className="w-full max-w-md">
                    <Zap className="w-4 h-4 mr-2" />
                    Add Sequence Step
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journeys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Prospect Journeys</CardTitle>
              <CardDescription>
                Track prospects across all channels and touchpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prospects.map((prospect) => (
                  <div key={prospect.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{prospect.prospectName}</h3>
                        <p className="text-sm text-gray-600">{prospect.companyName}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(prospect.status)}>
                          {prospect.status}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Play className="w-4 h-4 text-green-600" />
                          <Pause className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Progress</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Progress value={(prospect.currentStep / prospect.totalSteps) * 100} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{prospect.currentStep}/{prospect.totalSteps}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Last Contact</p>
                        <p className="text-sm font-medium">{formatDate(prospect.lastContact)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Next Contact</p>
                        <p className="text-sm font-medium">{formatDate(prospect.nextContact)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Channels:</span>
                        <div className="flex space-x-1">
                          {prospect.channels.map((channel, idx) => {
                            const IconComponent = getChannelIcon(channel)
                            return (
                              <div key={idx} className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                <IconComponent className="w-3 h-3 text-gray-600" />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Response Rate:</span>
                        <span className="text-sm font-medium">{prospect.responseRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance Comparison</CardTitle>
                <CardDescription>Success rates across different channels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {channels.map((channel) => {
                    const IconComponent = channel.icon
                    return (
                      <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <IconComponent className="w-5 h-5 text-gray-600" />
                          <span className="font-medium">{channel.name}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{channel.successRate}%</p>
                            <p className="text-xs text-gray-500">Success Rate</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{channel.avgResponseTime}d</p>
                            <p className="text-xs text-gray-500">Avg Response</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${channel.costPerContact}</p>
                            <p className="text-xs text-gray-500">Cost/Contact</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Optimization Insights</CardTitle>
                <CardDescription>AI-powered recommendations for channel optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Target className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900">LinkedIn Optimization</p>
                        <p className="text-sm text-green-700">Switch to LinkedIn for prospects with 80+ lead scores. Expected +35% response rate.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Timing Optimization</p>
                        <p className="text-sm text-blue-700">Send emails on Tuesday-Thursday 9-11 AM for 40% better open rates.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">SMS Opportunity</p>
                        <p className="text-sm text-yellow-700">Enable SMS for high-intent prospects. 25% success rate with proper timing.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}