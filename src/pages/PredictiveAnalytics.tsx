import React, { useState, useEffect } from 'react'
import { TrendingUp, Target, Brain, Zap, Calendar, DollarSign, Users, Mail, Clock, AlertTriangle, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import { blink } from '@/blink/client'

interface ConversionPrediction {
  id: string
  leadName: string
  companyName: string
  currentScore: number
  conversionProbability: number
  predictedValue: number
  timeToConversion: number
  keyFactors: string[]
  recommendedActions: string[]
  confidence: number
}

interface OptimalTiming {
  channel: string
  dayOfWeek: string
  hour: number
  responseRate: number
  confidence: number
  sampleSize: number
}

interface RevenueForecasting {
  period: string
  predictedRevenue: number
  confidence: number
  factors: {
    pipelineValue: number
    conversionRate: number
    averageDealSize: number
    salesCycle: number
  }
}

interface ABTestResult {
  id: string
  testName: string
  variant: string
  metric: string
  improvement: number
  significance: number
  status: 'running' | 'completed' | 'planned'
  sampleSize: number
}

export default function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState<ConversionPrediction[]>([])
  const [optimalTimings, setOptimalTimings] = useState<OptimalTiming[]>([])
  const [revenueForecasts, setRevenueForecasts] = useState<RevenueForecasting[]>([])
  const [abTests, setAbTests] = useState<ABTestResult[]>([])
  const [loading, setLoading] = useState(true)

  const performanceData = [
    { month: 'Jan', actual: 45000, predicted: 42000, confidence: 85 },
    { month: 'Feb', actual: 52000, predicted: 48000, confidence: 88 },
    { month: 'Mar', actual: 48000, predicted: 51000, confidence: 82 },
    { month: 'Apr', actual: 61000, predicted: 58000, confidence: 90 },
    { month: 'May', actual: null, predicted: 65000, confidence: 87 },
    { month: 'Jun', actual: null, predicted: 72000, confidence: 84 },
  ]

  const leadScoringData = [
    { score: 20, conversion: 2, leads: 150 },
    { score: 30, conversion: 5, leads: 120 },
    { score: 40, conversion: 8, leads: 100 },
    { score: 50, conversion: 12, leads: 85 },
    { score: 60, conversion: 18, leads: 70 },
    { score: 70, conversion: 25, leads: 55 },
    { score: 80, conversion: 35, leads: 40 },
    { score: 90, conversion: 48, leads: 25 },
    { score: 95, conversion: 62, leads: 15 },
  ]

  const timingHeatmapData = [
    { day: 'Mon', hour: 9, responseRate: 12.5 },
    { day: 'Mon', hour: 11, responseRate: 15.2 },
    { day: 'Mon', hour: 14, responseRate: 8.7 },
    { day: 'Tue', hour: 9, responseRate: 18.3 },
    { day: 'Tue', hour: 11, responseRate: 22.1 },
    { day: 'Tue', hour: 14, responseRate: 14.6 },
    { day: 'Wed', hour: 9, responseRate: 16.8 },
    { day: 'Wed', hour: 11, responseRate: 19.4 },
    { day: 'Wed', hour: 14, responseRate: 12.3 },
    { day: 'Thu', hour: 9, responseRate: 17.9 },
    { day: 'Thu', hour: 11, responseRate: 20.7 },
    { day: 'Thu', hour: 14, responseRate: 13.8 },
    { day: 'Fri', hour: 9, responseRate: 11.2 },
    { day: 'Fri', hour: 11, responseRate: 13.5 },
    { day: 'Fri', hour: 14, responseRate: 9.1 },
  ]

  const loadConversionPredictions = async () => {
    const mockPredictions: ConversionPrediction[] = [
      {
        id: '1',
        leadName: 'Sarah Johnson',
        companyName: 'TechCorp Inc.',
        currentScore: 88,
        conversionProbability: 92,
        predictedValue: 15000,
        timeToConversion: 7,
        keyFactors: ['Recent funding', 'High engagement', 'Decision maker contact'],
        recommendedActions: ['Schedule demo ASAP', 'Send case study', 'Introduce pricing'],
        confidence: 94
      },
      {
        id: '2',
        leadName: 'Mike Chen',
        companyName: 'DataFlow Systems',
        currentScore: 76,
        conversionProbability: 78,
        predictedValue: 8500,
        timeToConversion: 14,
        keyFactors: ['Multiple email opens', 'LinkedIn profile views', 'Company growth'],
        recommendedActions: ['Follow up via LinkedIn', 'Share ROI calculator', 'Book discovery call'],
        confidence: 87
      },
      {
        id: '3',
        leadName: 'Lisa Rodriguez',
        companyName: 'CloudTech Solutions',
        currentScore: 82,
        conversionProbability: 85,
        predictedValue: 12000,
        timeToConversion: 10,
        keyFactors: ['Technology stack match', 'Budget confirmed', 'Urgent timeline'],
        recommendedActions: ['Propose pilot program', 'Connect with technical team', 'Prepare contract'],
        confidence: 91
      }
    ]
    setPredictions(mockPredictions)
  }

  const loadOptimalTimings = async () => {
    const mockTimings: OptimalTiming[] = [
      {
        channel: 'Email',
        dayOfWeek: 'Tuesday',
        hour: 10,
        responseRate: 22.1,
        confidence: 94,
        sampleSize: 2847
      },
      {
        channel: 'LinkedIn',
        dayOfWeek: 'Wednesday',
        hour: 14,
        responseRate: 18.7,
        confidence: 89,
        sampleSize: 1523
      },
      {
        channel: 'SMS',
        dayOfWeek: 'Thursday',
        hour: 11,
        responseRate: 31.5,
        confidence: 82,
        sampleSize: 456
      }
    ]
    setOptimalTimings(mockTimings)
  }

  const loadRevenueForecasts = async () => {
    const mockForecasts: RevenueForecasting[] = [
      {
        period: 'Next 30 Days',
        predictedRevenue: 125000,
        confidence: 87,
        factors: {
          pipelineValue: 450000,
          conversionRate: 28,
          averageDealSize: 12500,
          salesCycle: 21
        }
      },
      {
        period: 'Next 90 Days',
        predictedRevenue: 380000,
        confidence: 82,
        factors: {
          pipelineValue: 1200000,
          conversionRate: 32,
          averageDealSize: 13200,
          salesCycle: 19
        }
      }
    ]
    setRevenueForecasts(mockForecasts)
  }

  const loadABTests = async () => {
    const mockTests: ABTestResult[] = [
      {
        id: '1',
        testName: 'Subject Line Optimization',
        variant: 'Question vs Statement',
        metric: 'Open Rate',
        improvement: 23.5,
        significance: 95,
        status: 'completed',
        sampleSize: 1200
      },
      {
        id: '2',
        testName: 'CTA Button Color',
        variant: 'Blue vs Green',
        metric: 'Click Rate',
        improvement: 15.2,
        significance: 88,
        status: 'running',
        sampleSize: 800
      },
      {
        id: '3',
        testName: 'Email Length',
        variant: 'Short vs Long',
        metric: 'Response Rate',
        improvement: -8.3,
        significance: 92,
        status: 'completed',
        sampleSize: 950
      }
    ]
    setAbTests(mockTests)
  }

  const loadPredictiveData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadConversionPredictions(),
        loadOptimalTimings(),
        loadRevenueForecasts(),
        loadABTests()
      ])
    } catch (error) {
      console.error('Failed to load predictive data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPredictiveData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600 bg-green-100'
    if (probability >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'planned': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Predictive Analytics</h1>
            <p className="text-gray-600 mt-1">Loading predictive insights...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Predictive Analytics</h1>
          <p className="text-gray-600 mt-1">AI-powered predictions and insights for sales optimization</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={loadPredictiveData} variant="outline">
            <Brain className="w-4 h-4 mr-2" />
            Refresh Predictions
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Zap className="w-4 h-4 mr-2" />
            Run New Analysis
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prediction Accuracy</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Probability Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{predictions.filter(p => p.conversionProbability >= 80).length}</div>
            <p className="text-xs text-muted-foreground">
              ${predictions.filter(p => p.conversionProbability >= 80).reduce((sum, p) => sum + p.predictedValue, 0).toLocaleString()} potential
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${revenueForecasts[0]?.predictedRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days ({revenueForecasts[0]?.confidence}% confidence)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active A/B Tests</CardTitle>
            <Brain className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{abTests.filter(t => t.status === 'running').length}</div>
            <p className="text-xs text-muted-foreground">
              {abTests.filter(t => t.status === 'completed').length} completed this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="predictions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictions">Conversion Predictions</TabsTrigger>
          <TabsTrigger value="timing">Optimal Timing</TabsTrigger>
          <TabsTrigger value="forecasting">Revenue Forecasting</TabsTrigger>
          <TabsTrigger value="testing">A/B Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>High-Probability Conversions</CardTitle>
                <CardDescription>
                  Leads most likely to convert in the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {predictions.map((prediction) => (
                  <div key={prediction.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{prediction.leadName}</h3>
                        <p className="text-sm text-gray-600">{prediction.companyName}</p>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded-full text-sm font-medium ${getProbabilityColor(prediction.conversionProbability)}`}>
                          {prediction.conversionProbability}%
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{prediction.confidence}% confidence</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Predicted Value</p>
                        <p className="font-medium">${prediction.predictedValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Time to Close</p>
                        <p className="font-medium">{prediction.timeToConversion} days</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Lead Score</p>
                        <p className="font-medium">{prediction.currentScore}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Key Factors:</p>
                      <div className="flex flex-wrap gap-1">
                        {prediction.keyFactors.map((factor, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {prediction.recommendedActions.map((action, idx) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <Zap className="w-3 h-3 text-indigo-600" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Score vs Conversion Rate</CardTitle>
                <CardDescription>
                  Relationship between lead scoring and actual conversions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart data={leadScoringData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="score" name="Lead Score" />
                    <YAxis dataKey="conversion" name="Conversion Rate %" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="conversion" fill="#3B82F6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimal Send Times by Channel</CardTitle>
                <CardDescription>
                  Best times to reach prospects for maximum response rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {optimalTimings.map((timing, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        {timing.channel === 'Email' && <Mail className="w-6 h-6 text-indigo-600" />}
                        {timing.channel === 'LinkedIn' && <Users className="w-6 h-6 text-indigo-600" />}
                        {timing.channel === 'SMS' && <MessageSquare className="w-6 h-6 text-indigo-600" />}
                      </div>
                      <div>
                        <h3 className="font-semibold">{timing.channel}</h3>
                        <p className="text-sm text-gray-600">
                          {timing.dayOfWeek} at {timing.hour}:00
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{timing.responseRate}%</p>
                      <p className="text-xs text-gray-500">{timing.confidence}% confidence</p>
                      <p className="text-xs text-gray-500">{timing.sampleSize.toLocaleString()} samples</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Rate Heatmap</CardTitle>
                <CardDescription>
                  Email response rates by day and time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timingHeatmapData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="responseRate" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Predictions</CardTitle>
                <CardDescription>
                  AI-powered revenue forecasting based on current pipeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {revenueForecasts.map((forecast, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{forecast.period}</h3>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${forecast.predictedRevenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">{forecast.confidence}% confidence</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Pipeline Value</p>
                        <p className="font-medium">${forecast.factors.pipelineValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Conversion Rate</p>
                        <p className="font-medium">{forecast.factors.conversionRate}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Deal Size</p>
                        <p className="font-medium">${forecast.factors.averageDealSize.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sales Cycle</p>
                        <p className="font-medium">{forecast.factors.salesCycle} days</p>
                      </div>
                    </div>
                    
                    <Progress value={forecast.confidence} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actual vs Predicted Performance</CardTitle>
                <CardDescription>
                  Track prediction accuracy over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} name="Actual" />
                    <Line type="monotone" dataKey="predicted" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" name="Predicted" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A/B Test Results</CardTitle>
              <CardDescription>
                Automated testing and optimization of campaign elements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {abTests.map((test) => (
                  <div key={test.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{test.testName}</h3>
                        <p className="text-sm text-gray-600">{test.variant}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(test.status)}>
                          {test.status}
                        </Badge>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${test.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {test.improvement > 0 ? '+' : ''}{test.improvement}%
                          </p>
                          <p className="text-xs text-gray-500">{test.significance}% significance</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500">Metric: <span className="font-medium">{test.metric}</span></span>
                        <span className="text-gray-500">Sample: <span className="font-medium">{test.sampleSize.toLocaleString()}</span></span>
                      </div>
                      {test.status === 'running' && (
                        <div className="flex items-center space-x-2 text-blue-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">In progress</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}