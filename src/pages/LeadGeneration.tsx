import React, { useEffect, useMemo, useState } from 'react'
import {
  Target, Users, Building2, MapPin, DollarSign, Zap, Plus, Database,
  CreditCard, AlertTriangle
} from 'lucide-react'
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
import { safeCapitalize } from '@/lib/utils'
import { leadGenerationService, type LeadCriteria } from '@/services/leadGeneration'
import { quotaTracker, type UserQuota } from '@/services/quotaTracker'
import { planRestrictionService } from '@/services/planRestrictions'
import { QuotaLimitModal } from '@/components/dashboard/QuotaLimitModal'
import { UsageDashboard } from '@/components/dashboard/UsageDashboard'

/** ---------- DEV BYPASS (for demo/testing) ---------- */
const envBypass =
  typeof process !== 'undefined' &&
  (process as any)?.env?.NEXT_PUBLIC_BYPASS_QUOTA === '1'

const runtimeBypass =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('bypass') === '1' ||
    localStorage.getItem('sv:bypassQuota') === '1' ||
    (window as any).__SVARA_BYPASS__ === true)

const BYPASS = envBypass || runtimeBypass

/* ---------------- Types ------------------ */
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

/* ---------------- Helpers ------------------ */
const industriesList = [
  'Technology', 'Healthcare', 'Financial Services', 'Manufacturing',
  'Retail & E-commerce', 'Marketing & Advertising', 'Professional Services', 'Education'
]
const companySizesList = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
const revenueRangesList = ['$0-$1M', '$1M-$5M', '$5M-$25M', '$25M-$100M', '$100M-$500M', '$500M+']

const scoreBadge = (score: number) => {
  if (score >= 90) return <Badge className="bg-green-100 text-green-800">Hot</Badge>
  if (score >= 75) return <Badge className="bg-amber-100 text-amber-800">Warm</Badge>
  return <Badge className="bg-gray-100 text-gray-800">Cold</Badge>
}

/** Quick-ish normalization for /api/leads blobs */
function normalizeDbLead(it: any): GeneratedLead | null {
  const company =
    it.company ||
    it.raw?.company ||
    it.raw?.company_name ||
    'Unknown Company'

  const contact =
    it.full_name ||
    `${it.first_name || ''} ${it.last_name || ''}`.trim() ||
    it.raw?.person_full_name ||
    'Unknown'

  const email = it.email || it.raw?.email
  if (!email) return null

  const out: GeneratedLead = {
    id: it.key || email,
    company_name: company,
    industry: it.industry || it.raw?.company_industry || '—',
    company_size: it.company_size || it.raw?.company_size || '',
    revenue_range: it.revenue_range || '',
    location:
      it.location ||
      it.raw?.person_city ||
      it.raw?.company_country ||
      '',
    contact_name: contact,
    contact_title: it.title || it.raw?.person_job_title || '',
    contact_email: email,
    linkedin_url: it.linkedin || it.raw?.linkedin || '',
    lead_score: Number(it.score ?? 0),
    match_reason:
      it.raw?.match_reason ||
      (it.industry ? `Match in ${it.industry}` : 'Imported lead'),
  }
  return out
}

/** Local filter/scoring */
function filterByCriteria(leads: GeneratedLead[], c: LeadGenerationCriteria) {
  const ind = c.industry !== 'any' ? c.industry.toLowerCase() : ''
  const size = c.company_size !== 'any' ? c.company_size : ''
  const rev = c.revenue_range !== 'any' ? c.revenue_range : ''
  const loc = (c.location || '').toLowerCase()

  return leads.filter(l => {
    if (ind && !String(l.industry || '').toLowerCase().includes(ind)) return false
    if (size && String(l.company_size || '') !== size) return false
    if (rev && String(l.revenue_range || '') !== rev) return false
    if (loc && !String(l.location || '').toLowerCase().includes(loc)) return false
    if (typeof c.lead_score_min === 'number' && l.lead_score < c.lead_score_min) return false
    return true
  })
}

/* ---------------- Component ------------------ */
export default function LeadGeneration() {
  const [criteria, setCriteria] = useState<LeadGenerationCriteria>({
    industry: 'any',
    company_size: 'any',
    revenue_range: 'any',
    location: '',
    job_titles: [],
    lead_score_min: 70,
    include_google_maps: true,
    include_hunter_io: true,
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

  /* ---- auth + quota ---- */
  useEffect(() => {
    const unsub = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) void loadUserQuota(state.user.id)
    })
    return unsub
  }, [])

  const loadUserQuota = async (uid?: string) => {
    const id = uid || user?.id
    if (!id) return
    try {
      const q = await quotaTracker.getUserQuota(id)
      setQuota(q)
    } catch (e) {
      console.warn('quota load failed', e)
    }
  }

  /* ---- headline total ---- */
  useEffect(() => {
    ;(async () => {
      try {
        const total = await leadGenerationService.getTotalLeadsCount()
        setTotalLeadsAvailable(total)
      } catch {
        // ignore
      }
    })()
  }, [])

  /* ---- generate handler with safe fallback ---- */
  const generateLeads = async () => {
    setIsGenerating(true)
    const started = Date.now()
    try {
      if (!user) {
        alert('Please sign in to generate leads')
        return
      }

      const creditsNeeded = 50
      if (!BYPASS) {
        const planCheck = await planRestrictionService.canAccessLeads(user.id, creditsNeeded)
        if (!planCheck.allowed) {
          alert(planCheck.message || 'Plan limit exceeded for lead generation.')
          return
        }
        const quotaCheck = await quotaTracker.checkQuotaAvailable(user.id, creditsNeeded)
        console.log('Quota check:', quotaCheck)
        if (!quotaCheck.allowed) {
          const isDaily = quotaCheck.reason?.includes('Daily')
          setQuotaLimitType(isDaily ? 'daily' : 'monthly')
          setShowQuotaModal(true)
          return
        }
      } else {
        console.warn('[DEV] BYPASS enabled: skipping plan/quota checks')
      }

      const searchCriteria: LeadCriteria = {
        industry: criteria.industry !== 'any' ? criteria.industry : undefined,
        company_size: criteria.company_size !== 'any' ? criteria.company_size : undefined,
        revenue_range: criteria.revenue_range !== 'any' ? criteria.revenue_range : undefined,
        location: criteria.location || undefined,
        job_titles: criteria.job_titles.length > 0 ? criteria.job_titles : undefined,
        lead_score_min: criteria.lead_score_min,
        limit: 50,
        include_google_maps: criteria.include_google_maps,
        include_hunter_io: criteria.include_hunter_io,
      }

      // Try primary service first
      try {
        const result = await leadGenerationService.generateLeads(searchCriteria, user.id)
        const converted: GeneratedLead[] = (result.leads || []).map((lead: any) => ({
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
          match_reason: lead.match_reason,
        }))

        setGeneratedLeads(converted)
        setGenerationStats({
          total_found: result.total_found ?? converted.length,
          generation_time: result.generation_time ?? Date.now() - started,
          sources_used: result.sources_used ?? ['primary'],
          google_maps_count: result.google_maps_count ?? 0,
          traditional_count: result.traditional_count ?? 0,
          hunter_io_count: result.hunter_io_count ?? 0,
        })
        if (converted.length === 0) {
          console.warn('Primary generator returned 0 rows; falling back to DB.')
          await fallbackFromDatabase(started)
        }
      } catch (err) {
        console.warn('Primary generator failed, falling back to DB:', err)
        await fallbackFromDatabase(started)
      }

      // Refresh quota view (no-op in BYPASS)
      await loadUserQuota()
    } catch (error: any) {
      console.error('Failed to generate leads:', error)
      alert(`Failed to generate leads: ${error?.message || 'Please try again.'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const fallbackFromDatabase = async (startedAt: number) => {
    // Pull a bunch from your blobs-backed /api/leads and filter locally
    const url = new URL('/api/leads', window.location.origin)
    url.searchParams.set('limit', '500') // get a healthy batch
    const r = await fetch(url.toString())
    if (!r.ok) throw new Error(`/api/leads failed: ${r.status}`)
    const j = await r.json()
    const parsed = (j.items || []).map((x: any) => x) // already parsed by the function

    const normalized = parsed
      .map(normalizeDbLead)
      .filter(Boolean) as GeneratedLead[]

    const filtered = filterByCriteria(normalized, criteria)
    setGeneratedLeads(filtered)
    setGenerationStats({
      total_found: filtered.length,
      generation_time: Date.now() - startedAt,
      sources_used: ['database'],
      traditional_count: filtered.length,
      google_maps_count: 0,
      hunter_io_count: 0,
    })
    const msg = `Loaded ${filtered.length} leads from your database (fallback).`
    console.log(msg)
    if (filtered.length > 0) alert(msg)
  }

  /* ---- selects ---- */
  const industryOptions = useMemo(() => ['any', ...industriesList], [])
  const sizeOptions = useMemo(() => ['any', ...companySizesList], [])
  const revenueOptions = useMemo(() => ['any', ...revenueRangesList], [])

  /* ---- UI ---- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Generation</h1>
          <p className="text-gray-600 mt-1">
            Generate targeted leads using AI, Hunter.io, People Data Labs, and real-time Google Maps data
          </p>
          {totalLeadsAvailable > 0 && (
            <div className="flex items-center mt-2 text-sm text-indigo-600">
              <Database className="w-4 h-4 mr-1" />
              <span className="font-medium">{totalLeadsAvailable.toLocaleString()} leads available</span>
            </div>
          )}
          {BYPASS && (
            <div className="mt-2">
              <Badge className="bg-orange-100 text-orange-800">DEV BYPASS: quota &amp; plan checks disabled</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setShowUsageDashboard(!showUsageDashboard)}>
            View Usage Stats
          </Button>
          {selectedLeads.length > 0 && (
            <>
              <Button
                onClick={async () => {
                  try {
                    const leadsToAdd = generatedLeads.filter(l => selectedLeads.includes(l.id))
                    // you can save with your existing service if desired:
                    // await leadGenerationService.saveLeads(...)
                    alert(`(Demo) Would add ${leadsToAdd.length} leads to database.`)
                  } catch (e) {
                    alert('Failed to add leads. Try again.')
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Database ({selectedLeads.length})
              </Button>
              <Button onClick={() => (window.location.href = '/billing')} className="bg-green-600 hover:bg-green-700">
                <CreditCard className="w-4 h-4 mr-2" />
                Proceed to Payment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quota Status */}
      {quota && (
        <Alert
          className={`${
            quota.dailyUsage / quota.dailyLimit >= 0.8 || quota.monthlyUsage / quota.monthlyLimit >= 0.8
              ? 'border-orange-200 bg-orange-50'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          <AlertTriangle
            className={`h-4 w-4 ${
              quota.dailyUsage / quota.dailyLimit >= 0.8 || quota.monthlyUsage / quota.monthlyLimit >= 0.8
                ? 'text-orange-600'
                : 'text-blue-600'
            }`}
          />
          <AlertDescription
            className={
              quota.dailyUsage / quota.dailyLimit >= 0.8 || quota.monthlyUsage / quota.monthlyLimit >= 0.8
                ? 'text-orange-800'
                : 'text-blue-800'
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <strong>Current Plan: {safeCapitalize(quota?.planType, 'Unknown')}</strong>
                {' • '}Daily: {quota.dailyUsage}/{quota.dailyLimit} leads{' • '}Monthly: {quota.monthlyUsage}/{quota.monthlyLimit} leads
              </div>
              {(quota.dailyUsage / quota.dailyLimit >= 0.8 || quota.monthlyUsage / quota.monthlyLimit >= 0.8) && (
                <Button variant="outline" size="sm" onClick={() => (window.location.href = '/billing')}>
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
            <CardDescription>Monitor your lead generation quotas and API usage</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageDashboard onUpgradeClick={() => (window.location.href = '/billing')} />
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Lead Generation Criteria</span>
          </CardTitle>
          <CardDescription>Define your ideal customer profile to generate high-quality leads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={criteria.industry}
                onValueChange={(v) => setCriteria((p) => ({ ...p, industry: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {industryOptions.map(i => (
                    <SelectItem key={i} value={i}>{i === 'any' ? 'Any Industry' : i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-size">Company Size</Label>
              <Select
                value={criteria.company_size}
                onValueChange={(v) => setCriteria((p) => ({ ...p, company_size: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select company size" /></SelectTrigger>
                <SelectContent>
                  {sizeOptions.map(s => (
                    <SelectItem key={s} value={s}>{s === 'any' ? 'Any Size' : `${s} employees`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue Range</Label>
              <Select
                value={criteria.revenue_range}
                onValueChange={(v) => setCriteria((p) => ({ ...p, revenue_range: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select revenue range" /></SelectTrigger>
                <SelectContent>
                  {revenueOptions.map(r => (
                    <SelectItem key={r} value={r}>{r === 'any' ? 'Any Revenue' : r}</SelectItem>
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
                onChange={(e) => setCriteria((p) => ({ ...p, location: e.target.value }))}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-hunter-io"
                    checked={criteria.include_hunter_io}
                    onCheckedChange={(c) => setCriteria((p) => ({ ...p, include_hunter_io: !!c }))}
                  />
                  <Label htmlFor="include-hunter-io" className="text-sm font-medium">Include Hunter.io leads</Label>
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
                    onCheckedChange={(c) => setCriteria((p) => ({ ...p, include_google_maps: !!c }))}
                  />
                  <Label htmlFor="include-google-maps" className="text-sm font-medium">Include Google Maps leads</Label>
                </div>
                <p className="text-xs text-gray-500">Get real-time business data from Google Maps for more comprehensive results</p>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Minimum Lead Score: {criteria.lead_score_min}</Label>
              <Slider
                value={[criteria.lead_score_min]}
                onValueChange={(v) => setCriteria((p) => ({ ...p, lead_score_min: v[0] }))}
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

      {/* Results */}
      {generatedLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Generated Leads ({generatedLeads.length})</span>
              </div>
              <div className="text-sm text-gray-600">{selectedLeads.length} selected</div>
            </CardTitle>
            <CardDescription>
              AI-generated leads (with automatic database fallback if the generator is unavailable)
              {generationStats && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-green-600">
                  <span>✓ Generated in {(generationStats.generation_time / 1000).toFixed(1)}s</span>
                  <span>✓ {generationStats.total_found} matches</span>
                  {generationStats.sources_used?.length ? <span>✓ Sources: {generationStats.sources_used.join(', ')}</span> : null}
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
                  onClick={() =>
                    setSelectedLeads(prev =>
                      prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]
                    )
                  }
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
                            {lead.company_size || '—'} {lead.company_size && 'employees'}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {lead.revenue_range || '—'}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            {lead.location || '—'}
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
                        {scoreBadge(lead.lead_score)}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() =>
                          setSelectedLeads(prev =>
                            prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]
                          )
                        }
                        className="w-4 h-4 text-indigo-600 rounded"
                        onClick={(e) => e.stopPropagation()}
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
        onUpgrade={() => (window.location.href = '/billing')}
        limitType={quotaLimitType}
      />
    </div>
  )
}
