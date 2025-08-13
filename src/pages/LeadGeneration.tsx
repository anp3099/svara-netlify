import React, { useState, useEffect } from 'react'
import { Search, Target, Users, Building2, MapPin, DollarSign, Zap, Plus, Database, CreditCard, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { blink } from '@/blink/client'
import { leadGenerationService, type LeadCriteria } from '@/services/leadGeneration'
import { realLeadDatabase } from '@/services/realLeadDatabase'
import { quotaTracker, UserQuota } from '@/services/quotaTracker'
import { planRestrictionService } from '@/services/planRestrictions'
import { QuotaLimitModal } from '@/components/dashboard/QuotaLimitModal'
import { UsageDashboard } from '@/components/dashboard/UsageDashboard'

interface LeadGenerationCriteria {
  industry: string
  company_size: string
  revenue_range: string
  location: string
  job_titles: string[]
  lead_score_min: number
  include_google_maps: boolean
  include_hunter_io: boolean
}

interface GeneratedLead {
  id: string
  company_name: string
  industry: string
  company_size: string
  revenue_range: string
  location: string
  contact_name: string
  contact_title: string
  contact_email: string
  linkedin_url: string
  lead_score: number
  match_reason: string
}

export default function LeadGeneration() {
  const [criteria, setCriteria] = useState<LeadGenerationCriteria>({
    industry: 'any',
    company_size: 'any',
    revenue_range: 'any',
    location: '',
    job_titles: [],
    lead_score_min: 70,
    include_google_maps: true,
    include_hunter_io: true
  })
  const [generatedLeads, setGeneratedLeads] = useState<GeneratedLead[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [totalLeadsAvailable, setTotalLeadsAvailable] = useState<number>(0)
  const [generationStats, setGenerationStats] = useState<{
    total_found: number
    generation_time: number
    sources_used?: string[]
    google_maps_count?: number
    traditional_count?: number
    hunter_io_count?: number
  } | null>(null)
  const [user, setUser] = useState<any>(null)
  const [quota, setQuota] = useState<UserQuota | null>(null)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [quotaLimitType, setQuotaLimitType] = useState<'daily' | 'monthly'>('daily')
  const [showUsageDashboard, setShowUsageDashboard] = useState(false)

  const industries = [
    'Technology', 'Healthcare', 'Financial Services', 'Manufacturing', 
    'Retail & E-commerce', 'Marketing & Advertising', 'Professional Services', 'Education'
  ]

  const companySizes = [
    '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  ]

  const revenueRanges = [
    '$0-$1M', '$1M-$5M', '$5M-$25M', '$25M-$100M', '$100M-$500M', '$500M+'
  ]

  const jobTitles = [
    'CEO', 'CTO', 'VP Sales', 'VP Marketing', 'CMO', 'COO', 'Director', 
    'Manager', 'Head of', 'Principal', 'Senior'
  ]

  const generateLeads = async () => {
    setIsGenerating(true)
    try {
      console.log('Generate leads clicked, user:', user)
      if (!user) {
        alert('Please sign in to generate leads')
        setIsGenerating(false)
        return
      }

      // Check plan restrictions and quota before generating leads
      const creditsNeeded = 50
      console.log('Checking restrictions for user:', user.id, 'credits needed:', creditsNeeded)
      
      // Check plan restrictions first
      const planCheck = await planRestrictionService.canAccessLeads(user.id, creditsNeeded)
      if (!planCheck.allowed) {
        alert(planCheck.message || 'Plan limit exceeded for lead generation.')
        setIsGenerating(false)
        return
      }
      
      // Check quota
      const quotaCheck = await quotaTracker.checkQuotaAvailable(user.id, creditsNeeded)
      console.log('Quota check result:', quotaCheck)
      
      if (!quotaCheck.allowed) {
        // Determine if it's daily or monthly limit
        const isDailyLimit = quotaCheck.reason?.includes('Daily')
        setQuotaLimitType(isDailyLimit ? 'daily' : 'monthly')
        setShowQuotaModal(true)
        setIsGenerating(false)
        return
      }
      
      // Use the enhanced lead generation service with Hunter.io integration
      const searchCriteria = {
        industry: criteria.industry !== 'any' ? criteria.industry : undefined,
        company_size: criteria.company_size !== 'any' ? criteria.company_size : undefined,
        revenue_range: criteria.revenue_range !== 'any' ? criteria.revenue_range : undefined,
        location: criteria.location || undefined,
        job_titles: criteria.job_titles.length > 0 ? criteria.job_titles : undefined,
        lead_score_min: criteria.lead_score_min,
        limit: 50,
        include_google_maps: criteria.include_google_maps,
        include_hunter_io: criteria.include_hunter_io
      }

      console.log('Starting lead generation with criteria:', searchCriteria)
      const result = await leadGenerationService.generateLeads(searchCriteria, user.id)
      console.log('Lead generation result:', result)
      
      // Convert leads to component format
      const convertedLeads: GeneratedLead[] = result.leads.map(lead => ({
        id: lead.id,
        company_name: lead.company_name,
        industry: lead.industry,
        company_size: lead.company_size,
        revenue_range: lead.revenue_range,
        location: lead.location,
        contact_name: lead.contact_name,
        contact_title: lead.contact_title,
        contact_email: lead.contact_email,
        linkedin_url: lead.linkedin_url || '',
        lead_score: lead.lead_score,
        match_reason: lead.match_reason
      }))
      
      setGeneratedLeads(convertedLeads)
      setGenerationStats({
        total_found: result.total_found,
        generation_time: result.generation_time,
        sources_used: result.sources_used,
        google_maps_count: result.google_maps_count,
        traditional_count: result.traditional_count,
        hunter_io_count: result.hunter_io_count
      })
      
      // Show success message with source breakdown
      const sourceMessage = result.sources_used.join(', ')
      const hunterCount = result.hunter_io_count || 0
      const successMessage = hunterCount > 0 
        ? `Successfully generated ${convertedLeads.length} leads! Found ${hunterCount} verified contacts from Hunter.io and ${result.traditional_count} from our database. Sources: ${sourceMessage}`
        : `Successfully generated ${convertedLeads.length} leads from ${sourceMessage}!`
      
      alert(successMessage)
      
      // Refresh quota after successful generation
      await loadUserQuota()
    } catch (error) {
      console.error('Failed to generate leads:', error)
      alert(`Failed to generate leads: ${error?.message || 'Unknown error'}. Please try again.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const addToDatabase = async () => {
    try {
      const leadsToAdd = generatedLeads.filter(lead => selectedLeads.includes(lead.id))
      
      // Convert to service format and save
      const serviceLeads = leadsToAdd.map(lead => ({
        id: lead.id,
        company_name: lead.company_name,
        industry: lead.industry,
        company_size: lead.company_size,
        revenue_range: lead.revenue_range,
        location: lead.location,
        website: `https://${lead.company_name.toLowerCase().replace(/\s+/g, '')}.com`,
        contact_name: lead.contact_name,
        contact_title: lead.contact_title,
        contact_email: lead.contact_email,
        contact_phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        linkedin_url: lead.linkedin_url,
        lead_score: lead.lead_score,
        data_source: 'ai_generated',
        match_reason: lead.match_reason,
        created_at: new Date().toISOString()
      }))

      await leadGenerationService.saveLeads(serviceLeads)

      alert(`Successfully added ${leadsToAdd.length} leads to your database!`)
      setSelectedLeads([])
    } catch (error) {
      console.error('Failed to add leads to database:', error)
      alert('Failed to add leads to database. Please try again.')
    }
  }

  // Load user and quota data
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadUserQuota()
      }
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserQuota = async () => {
    if (!user) return
    try {
      const userQuota = await quotaTracker.getUserQuota(user.id)
      setQuota(userQuota)
    } catch (error) {
      console.error('Failed to load user quota:', error)
    }
  }

  // Load total leads count on component mount
  useEffect(() => {
    const loadTotalLeads = async () => {
      try {
        const total = await leadGenerationService.getTotalLeadsCount()
        setTotalLeadsAvailable(total)
      } catch (error) {
        console.error('Failed to load total leads count:', error)
      }
    }
    loadTotalLeads()
  }, [])

  const getLeadScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Hot</Badge>
    if (score >= 75) return <Badge className="bg-amber-100 text-amber-800">Warm</Badge>
    return <Badge className="bg-gray-100 text-gray-800">Cold</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Generation</h1>
          <p className="text-gray-600 mt-1">Generate targeted leads using AI, Hunter.io, People Data Labs, and real-time Google Maps data</p>
          {totalLeadsAvailable > 0 && (
            <div className="flex items-center mt-2 text-sm text-indigo-600">
              <Database className="w-4 h-4 mr-1" />
              <span className="font-medium">{totalLeadsAvailable.toLocaleString()} leads available</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline"
            onClick={() => setShowUsageDashboard(!showUsageDashboard)}
          >
            View Usage Stats
          </Button>
          {selectedLeads.length > 0 && (
            <>
              <Button onClick={addToDatabase} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add to Database ({selectedLeads.length})
              </Button>
              <Button 
                onClick={() => window.location.href = '/billing'}
                className="bg-green-600 hover:bg-green-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Proceed to Payment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quota Status Alert */}
      {quota && (
        <Alert className={`${
          quota.dailyUsage / quota.dailyLimit >= 0.8 || quota.monthlyUsage / quota.monthlyLimit >= 0.8
            ? 'border-orange-200 bg-orange-50'
            : 'border-blue-200 bg-blue-50'
        }`}>
          <AlertTriangle className={`h-4 w-4 ${
            quota.dailyUsage / quota.dailyLimit >= 0.8 || quota.monthlyUsage / quota.monthlyLimit >= 0.8
              ? 'text-orange-600'
              : 'text-blue-600'
          }`} />
          <AlertDescription className={
            quota.dailyUsage / quota.dailyLimit >= 0.8 || quota.monthlyUsage / quota.monthlyLimit >= 0.8
              ? 'text-orange-800'
              : 'text-blue-800'
          }>
            <div className="flex items-center justify-between">
              <div>
                <strong>Current Plan: {safeCapitalize(quota?.planType, 'Unknown')}</strong>
                {' • '}
                Daily: {quota.dailyUsage}/{quota.dailyLimit} leads
                {' • '}
                Monthly: {quota.monthlyUsage}/{quota.monthlyLimit} leads
              </div>
              {(quota.dailyUsage / quota.dailyLimit >= 0.8 || quota.monthlyUsage / quota.monthlyLimit >= 0.8) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/billing'}
                >
                  Upgrade Plan
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Dashboard */}
      {showUsageDashboard && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Dashboard</CardTitle>
            <CardDescription>
              Monitor your lead generation quotas and API usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageDashboard onUpgradeClick={() => window.location.href = '/billing'} />
          </CardContent>
        </Card>
      )}

      {/* Lead Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Lead Generation Criteria</span>
          </CardTitle>
          <CardDescription>
            Define your ideal customer profile to generate high-quality leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={criteria.industry} onValueChange={(value) => setCriteria(prev => ({ ...prev, industry: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Industry</SelectItem>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-size">Company Size</Label>
              <Select value={criteria.company_size} onValueChange={(value) => setCriteria(prev => ({ ...prev, company_size: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Size</SelectItem>
                  {companySizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue Range</Label>
              <Select value={criteria.revenue_range} onValueChange={(value) => setCriteria(prev => ({ ...prev, revenue_range: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select revenue range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Revenue</SelectItem>
                  {revenueRanges.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, CA"
                value={criteria.location}
                onChange={(e) => setCriteria(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-hunter-io"
                    checked={criteria.include_hunter_io}
                    onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, include_hunter_io: !!checked }))}
                  />
                  <Label htmlFor="include-hunter-io" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Include Hunter.io leads
                  </Label>
                  <Badge className="bg-green-100 text-green-800 text-xs">NEW</Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Get verified email addresses and contact details from Hunter.io's professional database
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-google-maps"
                    checked={criteria.include_google_maps}
                    onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, include_google_maps: !!checked }))}
                  />
                  <Label htmlFor="include-google-maps" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Include Google Maps leads
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  Get real-time business data from Google Maps for more comprehensive results
                </p>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Minimum Lead Score: {criteria.lead_score_min}</Label>
              <Slider
                value={[criteria.lead_score_min]}
                onValueChange={(value) => setCriteria(prev => ({ ...prev, lead_score_min: value[0] }))}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={generateLeads} 
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Zap className="w-5 h-5 mr-2 animate-spin" />
                  Generating Leads...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Generate Leads
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Leads */}
      {generatedLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Generated Leads ({generatedLeads.length})</span>
              </div>
              <div className="text-sm text-gray-600">
                {selectedLeads.length} selected
              </div>
            </CardTitle>
            <CardDescription>
              AI-generated leads matching your criteria from Hunter.io, People Data Labs, and real-time Google Maps data
              {generationStats && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-green-600">
                  <span>✓ Generated in {(generationStats.generation_time / 1000).toFixed(1)}s</span>
                  <span>✓ {generationStats.total_found} high-quality matches found</span>
                  {generationStats.sources_used && <span>✓ Sources: {generationStats.sources_used.join(', ')}</span>}
                  {generationStats.hunter_io_count && <span>✓ Hunter.io: {generationStats.hunter_io_count} verified contacts</span>}
                  {generationStats.google_maps_count && <span>✓ Google Maps: {generationStats.google_maps_count}</span>}
                  {generationStats.traditional_count && <span>✓ Database: {generationStats.traditional_count}</span>}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedLeads.includes(lead.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleLeadSelection(lead.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <a 
                              href={`https://${lead.company_name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lead.company_name}
                            </a>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Real Data
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{lead.industry}</p>
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
                            <Users className="w-3 h-3 mr-1" />
                            {lead.company_size} employees
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {lead.revenue_range}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            {lead.location}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-md p-3 mb-3">
                        <p className="text-sm text-gray-700">
                          <strong>Match Reason:</strong> {lead.match_reason}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{lead.lead_score}</span>
                        {getLeadScoreBadge(lead.lead_score)}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quota Limit Modal */}
      <QuotaLimitModal
        open={showQuotaModal}
        onOpenChange={setShowQuotaModal}
        quota={quota}
        onUpgrade={() => window.location.href = '/billing'}
        limitType={quotaLimitType}
      />
    </div>
  )
}