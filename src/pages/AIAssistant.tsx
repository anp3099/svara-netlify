import React, { useState, useEffect } from 'react'
import { Bot, Zap, TrendingUp, AlertCircle, CheckCircle, Clock, MessageSquare, Target, Users, Mail, Phone, Linkedin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { blink } from '@/blink/client'
import { safeToUpper, safeCapitalize } from '@/lib/utils' 

interface AIRecommendation {
  id: string
  type: 'lead_scoring' | 'sequence_optimization' | 'timing' | 'channel_switch' | 'follow_up'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  action: string
  campaignId?: string
  leadId?: string
  createdAt: string
}

interface LiveActivity {
  id: string
  type: 'email_opened' | 'email_clicked' | 'response_received' | 'meeting_booked' | 'lead_scored'
  leadName: string
  companyName: string
  campaignName: string
  timestamp: string
  details: string
  score?: number
}

interface PredictiveInsight {
  id: string
  type: 'conversion_prediction' | 'optimal_timing' | 'channel_recommendation' | 'content_suggestion'
  title: string
  confidence: number
  description: string
  expectedImpact: string
  actionRequired: boolean
}

export default function AIAssistant() {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([])
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([])
  const [aiStatus, setAiStatus] = useState<'active' | 'learning' | 'optimizing'>('active')
  const [loading, setLoading] = useState(true)

  const loadRecommendations = async () => {
    // Simulate AI-generated recommendations
    const mockRecommendations: AIRecommendation[] = [
      {
        id: '1',
        type: 'lead_scoring',
        priority: 'high',
        title: 'High-Value Lead Detected',
        description: 'TechCorp Inc. shows strong buying signals - recent funding, hiring spree, and technology stack match.',
        impact: '+85% conversion probability',
        action: 'Prioritize immediate outreach',
        campaignId: 'camp_1',
        leadId: 'lead_1',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        type: 'sequence_optimization',
        priority: 'medium',
        title: 'Sequence Performance Alert',
        description: 'Email #3 in "SaaS Outreach" sequence has 12% lower open rate than industry average.',
        impact: '+23% response rate potential',
        action: 'A/B test subject line variations',
        campaignId: 'camp_2',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        type: 'timing',
        priority: 'medium',
        title: 'Optimal Send Time Identified',
        description: 'Your prospects in Healthcare respond 40% better on Tuesday mornings at 9:15 AM.',
        impact: '+40% response rate',
        action: 'Reschedule pending emails',
        createdAt: new Date().toISOString()
      },
      {
        id: '4',
        type: 'channel_switch',
        priority: 'high',
        title: 'Channel Switch Recommendation',
        description: 'LinkedIn outreach for "Enterprise Sales" campaign shows 3x better engagement than email.',
        impact: '+200% engagement rate',
        action: 'Switch to LinkedIn for next touchpoint',
        campaignId: 'camp_3',
        createdAt: new Date().toISOString()
      }
    ]
    setRecommendations(mockRecommendations)
  }

  const loadLiveActivity = async () => {
    // Simulate real-time activity feed
    const mockActivity: LiveActivity[] = [
      {
        id: '1',
        type: 'response_received',
        leadName: 'Sarah Johnson',
        companyName: 'TechCorp Inc.',
        campaignName: 'SaaS Outreach Q1',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
        details: 'Positive response - interested in meeting next week',
        score: 92
      },
      {
        id: '2',
        type: 'email_opened',
        leadName: 'Mike Chen',
        companyName: 'DataFlow Systems',
        campaignName: 'Enterprise Sales',
        timestamp: new Date(Date.now() - 12 * 60000).toISOString(), // 12 minutes ago
        details: 'Opened email 3 times, clicked pricing link',
        score: 78
      },
      {
        id: '3',
        type: 'meeting_booked',
        leadName: 'Lisa Rodriguez',
        companyName: 'CloudTech Solutions',
        campaignName: 'Agency Prospecting',
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(), // 25 minutes ago
        details: 'Booked 30-min discovery call for Thursday 2 PM',
        score: 95
      },
      {
        id: '4',
        type: 'lead_scored',
        leadName: 'David Park',
        companyName: 'InnovateLabs',
        campaignName: 'Tech Startup Outreach',
        timestamp: new Date(Date.now() - 35 * 60000).toISOString(), // 35 minutes ago
        details: 'Lead score increased from 65 to 88 - recent funding event',
        score: 88
      }
    ]
    setLiveActivity(mockActivity)
  }

  const loadPredictiveInsights = async () => {
    const mockInsights: PredictiveInsight[] = [
      {
        id: '1',
        type: 'conversion_prediction',
        title: 'High Conversion Probability This Week',
        confidence: 87,
        description: 'Based on engagement patterns, 12 leads are likely to convert within 7 days.',
        expectedImpact: '$30,000 potential revenue',
        actionRequired: true
      },
      {
        id: '2',
        type: 'optimal_timing',
        title: 'Peak Response Window Identified',
        confidence: 94,
        description: 'Tuesday-Thursday, 9-11 AM shows 65% higher response rates for your target audience.',
        expectedImpact: '+65% response rate',
        actionRequired: false
      },
      {
        id: '3',
        type: 'content_suggestion',
        title: 'Content Personalization Opportunity',
        confidence: 76,
        description: 'Adding industry-specific case studies could increase engagement by 45%.',
        expectedImpact: '+45% engagement',
        actionRequired: true
      }
    ]
    setPredictiveInsights(mockInsights)
  }

  const loadAIData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadRecommendations(),
        loadLiveActivity(),
        loadPredictiveInsights()
      ])
    } catch (error) {
      console.error('Failed to load AI data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAIData()
    // Set up real-time updates
    const interval = setInterval(loadLiveActivity, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const executeRecommendation = async (recommendationId: string) => {
    try {
      // Simulate executing AI recommendation
      const recommendation = recommendations.find(r => r.id === recommendationId)
      if (recommendation) {
        alert(`Executing: ${recommendation.action}\n\nThis would automatically implement the AI recommendation in a live system.`)
        
        // Remove executed recommendation
        setRecommendations(prev => prev.filter(r => r.id !== recommendationId))
      }
    } catch (error) {
      console.error('Failed to execute recommendation:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email_opened': return <Mail className="w-4 h-4 text-blue-600" />
      case 'email_clicked': return <Target className="w-4 h-4 text-green-600" />
      case 'response_received': return <MessageSquare className="w-4 h-4 text-purple-600" />
      case 'meeting_booked': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'lead_scored': return <TrendingUp className="w-4 h-4 text-indigo-600" />
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Sales Assistant</h1>
            <p className="text-gray-600 mt-1">Loading AI insights...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">AI Sales Assistant</h1>
          <p className="text-gray-600 mt-1">Your 24/7 AI-powered sales intelligence system</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${aiStatus === 'active' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
            <span className="text-sm font-medium text-gray-700">
              AI Status: {aiStatus === 'active' ? 'Active' : aiStatus === 'learning' ? 'Learning' : 'Optimizing'}
            </span>
          </div>
          <Button onClick={loadAIData} variant="outline">
            <Bot className="w-4 h-4 mr-2" />
            Refresh AI Insights
          </Button>
        </div>
      </div>

      {/* AI Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recommendations</CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground">
              {recommendations.filter(r => r.priority === 'high').length} high priority
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Activities</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictive Insights</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{predictiveInsights.length}</div>
            <p className="text-xs text-muted-foreground">
              {predictiveInsights.filter(i => i.actionRequired).length} require action
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
            <Bot className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">
              Prediction accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="activity">Live Activity</TabsTrigger>
          <TabsTrigger value="insights">Predictive Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Recommendations</CardTitle>
              <CardDescription>
                Real-time suggestions to optimize your sales performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge className={getPriorityColor(recommendation.priority)}>
                          {safeToUpper(recommendation?.priority, 'normal')}
                        </Badge>
                        <h3 className="font-semibold text-gray-900">{recommendation.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-2">{recommendation.description}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-600 font-medium">
                          Expected Impact: {recommendation.impact}
                        </span>
                        <span className="text-gray-500">
                          {formatTimeAgo(recommendation.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => executeRecommendation(recommendation.id)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Execute
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm font-medium text-gray-900">Recommended Action:</p>
                    <p className="text-sm text-gray-700">{recommendation.action}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Sales Activity</CardTitle>
              <CardDescription>
                Real-time updates on prospect engagement and campaign performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.leadName} • {activity.companyName}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{activity.details}</p>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="text-xs">
                          {activity.campaignName}
                        </Badge>
                        {activity.score && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">Lead Score:</span>
                            <Badge className={activity.score >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {activity.score}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Insights</CardTitle>
              <CardDescription>
                AI-powered predictions and recommendations for future performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {predictiveInsights.map((insight) => (
                <div key={insight.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                        {insight.actionRequired && (
                          <Badge className="bg-orange-100 text-orange-800">Action Required</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{insight.description}</p>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Confidence:</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={insight.confidence} className="w-20 h-2" />
                            <span className="text-sm font-medium">{insight.confidence}%</span>
                          </div>
                        </div>
                        <span className="text-sm text-green-600 font-medium">
                          {insight.expectedImpact}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}