import React, { useState, useEffect } from 'react'
import { Search, Target, TrendingUp, Users, Building2, DollarSign, Star, Filter, Download, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { blink } from '@/blink/client'

interface ScoredLead {
  id: string
  company_name: string
  contact_name: string
  contact_title: string
  contact_email: string
  industry: string
  company_size: string
  revenue_range: string
  location: string
  lead_score: number
  score_breakdown: {
    company_fit: number
    contact_seniority: number
    engagement_potential: number
    timing_signals: number
    data_quality: number
  }
  signals: string[]
  last_activity: string
  source: string
}

const demoLeads: ScoredLead[] = [
  {
    id: 'lead_1',
    company_name: 'TechFlow Solutions',
    contact_name: 'Sarah Chen',
    contact_title: 'VP of Sales',
    contact_email: 'sarah.chen@techflow.com',
    industry: 'Technology',
    company_size: '51-200',
    revenue_range: '$5M-$25M',
    location: 'San Francisco, CA',
    lead_score: 92,
    score_breakdown: {
      company_fit: 95,
      contact_seniority: 90,
      engagement_potential: 88,
      timing_signals: 94,
      data_quality: 93
    },
    signals: ['Recent funding round', 'Hiring sales team', 'Tech stack match', 'LinkedIn activity'],
    last_activity: '2024-01-15T10:30:00Z',
    source: 'ai_generated'
  },
  {
    id: 'lead_2',
    company_name: 'Digital Marketing Pro',
    contact_name: 'Michael Rodriguez',
    contact_title: 'CEO',
    contact_email: 'michael@digitalmarketingpro.com',
    industry: 'Marketing & Advertising',
    company_size: '11-50',
    revenue_range: '$1M-$5M',
    location: 'Austin, TX',
    lead_score: 88,
    score_breakdown: {
      company_fit: 85,
      contact_seniority: 95,
      engagement_potential: 82,
      timing_signals: 90,
      data_quality: 88
    },
    signals: ['Agency growth', 'New client wins', 'Automation interest', 'Conference speaker'],
    last_activity: '2024-01-14T15:45:00Z',
    source: 'industry_search'
  },
  {
    id: 'lead_3',
    company_name: 'HealthTech Innovations',
    contact_name: 'Dr. Emily Watson',
    contact_title: 'Chief Technology Officer',
    contact_email: 'emily.watson@healthtech.com',
    industry: 'Healthcare',
    company_size: '201-500',
    revenue_range: '$25M-$100M',
    location: 'Boston, MA',
    lead_score: 85,
    score_breakdown: {
      company_fit: 88,
      contact_seniority: 85,
      engagement_potential: 80,
      timing_signals: 87,
      data_quality: 85
    },
    signals: ['Digital transformation', 'AI investment', 'Compliance focus', 'Partnership seeking'],
    last_activity: '2024-01-13T09:20:00Z',
    source: 'lead_generation'
  }
]

export default function LeadScoring() {
  const [leads, setLeads] = useState<ScoredLead[]>(demoLeads)
  const [searchTerm, setSearchTerm] = useState('')
  const [minScore, setMinScore] = useState([70])
  const [industryFilter, setIndustryFilter] = useState('all')
  const [sizeFilter, setSizeFilter] = useState('all')
  const [isScoring, setIsScoring] = useState(false)
  const [selectedLead, setSelectedLead] = useState<ScoredLead | null>(null)

  const runAIScoring = async () => {
    setIsScoring(true)
    try {
      // Simulate AI scoring process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update lead scores with AI analysis
      const updatedLeads = leads.map(lead => ({
        ...lead,
        lead_score: Math.min(100, lead.lead_score + Math.floor(Math.random() * 10) - 5),
        signals: [...lead.signals, 'AI re-scored', 'Updated signals']
      }))
      
      setLeads(updatedLeads)
      alert('AI scoring completed! Lead scores have been updated with latest signals.')
    } catch (error) {
      console.error('Failed to run AI scoring:', error)
    } finally {
      setIsScoring(false)
    }
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Hot</Badge>
    if (score >= 75) return <Badge className="bg-amber-100 text-amber-800">Warm</Badge>
    if (score >= 60) return <Badge className="bg-blue-100 text-blue-800">Cold</Badge>
    return <Badge className="bg-gray-100 text-gray-800">Poor</Badge>
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-amber-600'
    if (score >= 60) return 'text-blue-600'
    return 'text-gray-600'
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.industry.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesScore = lead.lead_score >= minScore[0]
    const matchesIndustry = industryFilter === 'all' || lead.industry === industryFilter
    const matchesSize = sizeFilter === 'all' || lead.company_size === sizeFilter
    
    return matchesSearch && matchesScore && matchesIndustry && matchesSize
  })

  const industries = [...new Set(leads.map(lead => lead.industry))]
  const companySizes = [...new Set(leads.map(lead => lead.company_size))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Lead Scoring</h1>
          <p className="text-gray-600 mt-1">Intelligent lead qualification and prioritization powered by AI</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={runAIScoring} 
            disabled={isScoring}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isScoring ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                Scoring...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run AI Scoring
              </>
            )}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Leads
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Lead Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All sizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {companySizes.map((size) => (
                    <SelectItem key={size} value={size}>{size} employees</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min Score: {minScore[0]}</Label>
              <Slider
                value={minScore}
                onValueChange={setMinScore}
                max={100}
                min={0}
                step={5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Hot Leads (90-100)</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {filteredLeads.filter(lead => lead.lead_score >= 90).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-sm font-medium">Warm Leads (75-89)</span>
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              {filteredLeads.filter(lead => lead.lead_score >= 75 && lead.lead_score < 90).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium">Cold Leads (60-74)</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {filteredLeads.filter(lead => lead.lead_score >= 60 && lead.lead_score < 75).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-sm font-medium">Poor Leads (&lt;60)</span>
            </div>
            <div className="text-2xl font-bold text-gray-600 mt-2">
              {filteredLeads.filter(lead => lead.lead_score < 60).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Scored Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>AI-scored leads ranked by conversion probability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLeads
              .sort((a, b) => b.lead_score - a.lead_score)
              .map((lead) => (
                <div 
                  key={lead.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{lead.company_name}</h3>
                          <p className="text-sm text-gray-600">{lead.industry} • {lead.company_size} employees</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{lead.contact_name}</h4>
                          <p className="text-sm text-gray-600">{lead.contact_title}</p>
                          <p className="text-sm text-gray-600">{lead.contact_email}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {lead.revenue_range}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-3 h-3 mr-1" />
                            {lead.location}
                          </div>
                          <div className="text-xs text-gray-500">
                            Last activity: {new Date(lead.last_activity).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {lead.signals.slice(0, 3).map((signal, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {signal}
                          </Badge>
                        ))}
                        {lead.signals.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{lead.signals.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-2xl font-bold ${getScoreColor(lead.lead_score)}`}>
                          {lead.lead_score}
                        </span>
                        {getScoreBadge(lead.lead_score)}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Lead Score</div>
                        <Progress value={lead.lead_score} className="w-20 h-2 mt-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedLead.company_name}</CardTitle>
                  <CardDescription>{selectedLead.contact_name} • {selectedLead.contact_title}</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedLead(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="scoring">Score Breakdown</TabsTrigger>
                  <TabsTrigger value="signals">Signals</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Company</Label>
                      <p className="text-sm text-gray-600">{selectedLead.company_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Industry</Label>
                      <p className="text-sm text-gray-600">{selectedLead.industry}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Size</Label>
                      <p className="text-sm text-gray-600">{selectedLead.company_size} employees</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Revenue</Label>
                      <p className="text-sm text-gray-600">{selectedLead.revenue_range}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Location</Label>
                      <p className="text-sm text-gray-600">{selectedLead.location}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Source</Label>
                      <p className="text-sm text-gray-600">{selectedLead.source}</p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <div className={`text-3xl font-bold ${getScoreColor(selectedLead.lead_score)} mb-2`}>
                      {selectedLead.lead_score}
                    </div>
                    <div className="text-sm text-gray-600">Overall Lead Score</div>
                    {getScoreBadge(selectedLead.lead_score)}
                  </div>
                </TabsContent>
                
                <TabsContent value="scoring" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Company Fit</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={selectedLead.score_breakdown.company_fit} className="w-20 h-2" />
                        <span className="text-sm font-medium">{selectedLead.score_breakdown.company_fit}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Contact Seniority</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={selectedLead.score_breakdown.contact_seniority} className="w-20 h-2" />
                        <span className="text-sm font-medium">{selectedLead.score_breakdown.contact_seniority}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Engagement Potential</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={selectedLead.score_breakdown.engagement_potential} className="w-20 h-2" />
                        <span className="text-sm font-medium">{selectedLead.score_breakdown.engagement_potential}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Timing Signals</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={selectedLead.score_breakdown.timing_signals} className="w-20 h-2" />
                        <span className="text-sm font-medium">{selectedLead.score_breakdown.timing_signals}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Data Quality</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={selectedLead.score_breakdown.data_quality} className="w-20 h-2" />
                        <span className="text-sm font-medium">{selectedLead.score_breakdown.data_quality}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="signals" className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Buying Signals</Label>
                    <div className="space-y-2">
                      {selectedLead.signals.map((signal, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span className="text-sm">{signal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedLead(null)}>
                  Close
                </Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    alert(`Adding ${selectedLead.company_name} to campaign. This feature will be implemented in the next update.`)
                    setSelectedLead(null)
                  }}
                >
                  Add to Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}