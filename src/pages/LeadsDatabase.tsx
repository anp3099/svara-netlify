// src/pages/LeadsDatabase.tsx
import React, { useEffect, useMemo, useState } from "react"
import {
  Search,
  Filter,
  Download,
  Plus,
  Building2,
  MapPin,
  Users,
  DollarSign,
  ExternalLink,
  Star,
  AlertCircle,
  Sparkles,
  Award,
  BookOpen,
  Briefcase,
  ChevronDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { blink } from "@/blink/client"
import * as ReactDOM from "react-dom"
import { campaignsService as _campaignsService } from "@/services/campaigns" // ok if missing; we guard

/** ---------- Types ---------- */
type Lead = {
  id: string
  companyName: string
  industry: string
  companySize: string
  revenueRange: string
  location: string
  website: string
  contactName: string
  contactTitle: string
  contactEmail: string
  contactPhone: string
  linkedinUrl: string
  leadScore: number
  dataSource: string
  pdlEnriched?: boolean
  pdlEnrichmentScore?: number
  pdlExperienceSummary?: string
  pdlSkills?: string[]
  pdlInterests?: string[]
  pdlEducationSummary?: string
  pdlSocialProfiles?: Array<{ network: string; url: string }>
}

type Campaign = { id: string; name: string; status?: string; createdAt?: string }

/** ---------- Fallback sample rows ---------- */
const sampleLeads: Lead[] = [
  {
    id: "demo_1",
    companyName: "TechCorp Solutions",
    industry: "Software",
    companySize: "100-500",
    revenueRange: "$10M-$50M",
    location: "San Francisco, CA",
    website: "https://techcorp.com",
    contactName: "Sarah Johnson",
    contactTitle: "VP of Sales",
    contactEmail: "sarah.johnson@techcorp.com",
    contactPhone: "+1 (555) 123-4567",
    linkedinUrl: "https://linkedin.com/in/sarahjohnson",
    leadScore: 92,
    dataSource: "proprietary",
  },
  {
    id: "demo_2",
    companyName: "DataFlow Systems",
    industry: "Data Analytics",
    companySize: "50-100",
    revenueRange: "$5M-$10M",
    location: "Austin, TX",
    website: "https://dataflow.com",
    contactName: "Michael Chen",
    contactTitle: "CTO",
    contactEmail: "michael.chen@dataflow.com",
    contactPhone: "+1 (555) 234-5678",
    linkedinUrl: "https://linkedin.com/in/michaelchen",
    leadScore: 87,
    dataSource: "proprietary",
  },
]

/** ---------- Helpers ---------- */
const toStr = (v: any) => (v === undefined || v === null ? "" : String(v))
const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase())

function tryParseArray(v: any): string[] | any[] | undefined {
  if (!v) return undefined
  if (Array.isArray(v)) return v
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function mapApiItemToLead(item: any): Lead {
  const raw = item?.raw ?? {}
  const first = raw.first_name || raw.person_first_name || ""
  const last = raw.last_name || raw.person_last_name || ""
  const fullName = (item.full_name || `${first} ${last}`).trim()
  const companyName =
    item.company_name || raw.company_name || raw.person_company_name || "Unknown Company"
  const industry = raw.company_industry || item.industry || "Unknown"
  const companySize = raw.company_size || raw.company_size_range || item.company_size || ""
  const revenue = raw.company_revenue || raw.company_revenue_range || item.company_revenue || ""
  const city = raw.person_city || raw.company_city || ""
  const country = raw.person_country || raw.company_country || ""
  const location = [city, country].filter(Boolean).join(", ")
  const domain = item.domain || raw.company_domain || raw.website || raw.company_website || ""
  const website = domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : ""
  const title = item.title || raw.person_job_title || raw.person_headline || ""
  const phone = raw.person_phone || ""
  const linkedin = item.linkedin || raw.person_linkedin_url || ""
  const leadScore = Number(item.score ?? 0)

  return {
    id: item.key || crypto.randomUUID(),
    companyName,
    industry: industry ? titleCase(industry) : "Unknown",
    companySize: toStr(companySize),
    revenueRange: toStr(revenue),
    location,
    website,
    contactName: fullName || "Unknown",
    contactTitle: toStr(title),
    contactEmail: toStr(item.email || raw.person_business_email || raw.person_personal_email || ""),
    contactPhone: toStr(phone),
    linkedinUrl: toStr(linkedin),
    leadScore: isNaN(leadScore) ? 0 : leadScore,
    dataSource: toStr(item.source || "import"),
    pdlEnriched: Boolean(item.pdl_enriched),
    pdlEnrichmentScore: item.pdl_enrichment_score ? Number(item.pdl_enrichment_score) : undefined,
    pdlExperienceSummary: item.pdl_experience_summary || undefined,
    pdlSkills: item.pdl_skills ? tryParseArray(item.pdl_skills) : undefined,
    pdlInterests: item.pdl_interests ? tryParseArray(item.pdl_interests) : undefined,
    pdlEducationSummary: item.pdl_education_summary || undefined,
    pdlSocialProfiles: item.pdl_social_profiles ? tryParseArray(item.pdl_social_profiles) : undefined,
  }
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-500">{label}</label>
      <div className="text-sm">{children}</div>
    </div>
  )
}

/** ---------- HTTP helper (throws with status text) ---------- */
async function httpJSON(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const msg = text || `${init?.method || "GET"} ${typeof input === "string" ? input : ""} -> ${res.status}`
    throw new Error(msg)
  }
  return res.json().catch(() => ({}))
}

/** ---------- Add-to-Campaign Modal ---------- */
function AddToCampaignModal({
  open,
  onOpenChange,
  leadIds,
  onAttached,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  leadIds: string[]
  onAttached: () => void
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("")
  const [newName, setNewName] = useState("")
  const [err, setErr] = useState<string | null>(null)

  const loadCampaigns = async () => {
    setLoading(true)
    setErr(null)
    try {
      const svc: any = _campaignsService as any
      let list: any[] | null = null

      if (svc?.listCampaigns) list = await svc.listCampaigns()
      else if (svc?.list) list = await svc.list()
      else if (svc?.getAll) list = await svc.getAll()
      else {
        // direct DB fallback
        list = await (blink as any).db?.campaigns?.list?.({
          orderBy: { createdAt: "desc" },
          limit: 100,
        })
      }

      const mapped =
        (list || []).map((c: any) => ({
          id: c.id || c.key,
          name: c.name || c.title || "Untitled",
          status: c.status || c.state,
          createdAt: c.createdAt || c.created_at,
        })) ?? []

      setCampaigns(mapped)
      if (mapped.length && !selectedCampaignId) setSelectedCampaignId(mapped[0].id)
    } catch (e: any) {
      console.warn("Campaigns load failed:", e)
      setErr("Failed to load campaigns")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void loadCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const createCampaign = async () => {
    if (!newName.trim()) return
    setErr(null)
    setCreating(true)
    try {
      const svc: any = _campaignsService as any
      let created: any = null
      if (svc?.createCampaign) created = await svc.createCampaign(newName.trim())
      else if (svc?.create) created = await svc.create({ name: newName.trim() })
      else {
        // DB fallback
        created = await (blink as any).db?.campaigns?.create?.({
          name: newName.trim(),
          status: "draft",
          createdAt: new Date().toISOString(),
        })
      }

      if (!created?.id && created?.error) throw new Error(created.error)

      const newItem: Campaign = {
        id: created.id || created.key,
        name: created.name || newName.trim(),
        status: created.status || "draft",
        createdAt: created.createdAt || created.created_at,
      }

      setCampaigns((prev) => [newItem, ...prev])
      setSelectedCampaignId(newItem.id)
      setNewName("")
      setErr(null)
    } catch (e: any) {
      const m = String(e?.message || e)
      // If duplicate, auto-select existing
      if (m.toLowerCase().includes("duplicate") || m.toLowerCase().includes("constraint")) {
        const existing = campaigns.find(
          (c) => c.name.toLowerCase().trim() === newName.toLowerCase().trim(),
        )
        if (existing) {
          setSelectedCampaignId(existing.id)
          setNewName("")
          setErr(null)
          return
        }
      }
      setErr("Constraint violation – duplicate or invalid data")
    } finally {
      setCreating(false)
    }
  }

  /** Try several ways to attach, then DB fallbacks with auto-discovery of a join table */
  const attachLeads = async () => {
    const uniqueLeadIds = Array.from(new Set(leadIds))
    if (!selectedCampaignId || uniqueLeadIds.length === 0) return

    setAdding(true)
    setErr(null)
    try {
      // 1) API attempts
      const apiVariants = [
        { url: `/api/campaigns/${selectedCampaignId}/leads`, method: "POST" },
        { url: `/api/campaigns/add-leads`, method: "POST" },
        { url: `/api/campaigns/attach`, method: "POST" },
      ] as const

      let apiWorked = false
      for (const v of apiVariants) {
        try {
          await httpJSON(v.url, {
            method: v.method,
            body: JSON.stringify({ campaignId: selectedCampaignId, leadIds: uniqueLeadIds }),
          })
          apiWorked = true
          break
        } catch (e) {
          // try next
        }
      }

      if (!apiWorked) {
        // 2) DB fallback – try join table first
        const db: any = (blink as any).db
        if (!db) throw new Error("DB unavailable")

        const dbKeys = Object.keys(db || {})
        const joinKey =
          dbKeys.find(
            (k) =>
              /campaign/i.test(k) &&
              /lead/i.test(k) &&
              typeof db[k]?.create === "function",
          ) || null

        let success = 0

        if (joinKey) {
          for (const leadId of uniqueLeadIds) {
            try {
              await db[joinKey].create({ campaignId: selectedCampaignId, leadId })
              success++
            } catch (e: any) {
              // ignore duplicates/constraints for individual rows
              continue
            }
          }
        } else {
          // last resort: update leads with campaignId
          const leadsTableKey =
            dbKeys.find((k) => /^leads$/i.test(k) && typeof db[k]?.update === "function") || "leads"
          for (const leadId of uniqueLeadIds) {
            try {
              await db[leadsTableKey].update(leadId, { campaignId: selectedCampaignId })
              success++
            } catch {
              continue
            }
          }
        }

        if (success === 0) throw new Error("No rows attached (possible schema mismatch)")
      }

      onAttached()
      onOpenChange(false)
      alert(`Attached ${uniqueLeadIds.length} lead(s) to the campaign.`)
    } catch (e: any) {
      setErr(String(e?.message || e) || "Failed to add to campaign")
    } finally {
      setAdding(false)
    }
  }

  return ReactDOM.createPortal(
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add {leadIds.length} {leadIds.length === 1 ? "lead" : "leads"} to a campaign</DialogTitle>
          <DialogDescription>Select a campaign or create a new one.</DialogDescription>
        </DialogHeader>

        {err && (
          <Alert className="border-amber-200 bg-amber-50 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">{err}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium">Campaign</label>
          <div className="relative">
            <Select
              value={selectedCampaignId}
              onValueChange={(v) => {
                setSelectedCampaignId(v)
                setErr(null) // clear old banner
              }}
              disabled={loading || !campaigns.length}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loading ? "Loading..." : campaigns.length ? "Choose a campaign" : "No campaigns found"}
                />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="pt-2">
            <label className="text-sm font-medium">Create new campaign</label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="e.g., Q4 Outreach"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (err) setErr(null)
                }}
                disabled={creating}
              />
              <Button onClick={createCampaign} disabled={!newName.trim() || creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={attachLeads}
              disabled={!selectedCampaignId || adding}
            >
              {adding ? "Adding..." : "Add to Campaign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>,
    document.body
  )
}

/** ---------- Page ---------- */
export default function LeadsDatabase() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [industryFilter, setIndustryFilter] = useState("all")
  const [sizeFilter, setSizeFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [viewLead, setViewLead] = useState<Lead | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  // Load real leads
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setErr(null)
        const res = await fetch("/api/leads?limit=50")
        if (!res.ok) throw new Error(`GET /api/leads -> ${res.status}`)
        const json = await res.json()
        const items: any[] = json?.items || []
        const mapped = items.map(mapApiItemToLead).sort((a, b) => b.leadScore - a.leadScore)
        if (mapped.length === 0) {
          setLeads(sampleLeads)
          setFilteredLeads(sampleLeads)
        } else {
          setLeads(mapped)
          setFilteredLeads(mapped)
        }
      } catch (e: any) {
        console.error(e)
        setErr("Failed to load leads from API. Showing sample data.")
        setLeads(sampleLeads)
        setFilteredLeads(sampleLeads)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  // Derived filters
  const uniqueIndustries = useMemo(
    () => [...new Set(leads.map((l) => l.industry).filter(Boolean))].sort(),
    [leads],
  )
  const uniqueSizes = useMemo(
    () => [...new Set(leads.map((l) => l.companySize).filter(Boolean))].sort(),
    [leads],
  )

  // Client-side filter
  useEffect(() => {
    let data = [...leads]
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (l) =>
          l.companyName.toLowerCase().includes(q) ||
          l.contactName.toLowerCase().includes(q) ||
          l.industry.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q),
      )
    }
    if (industryFilter !== "all") data = data.filter((l) => l.industry === industryFilter)
    if (sizeFilter !== "all") data = data.filter((l) => l.companySize === sizeFilter)
    setFilteredLeads(data)
  }, [leads, search, industryFilter, sizeFilter])

  const toggleAll = () => {
    setSelected((prev) => (prev.length === filteredLeads.length ? [] : filteredLeads.map((l) => l.id)))
  }
  const toggleRow = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const scorePill = (n: number) => {
    if (n >= 90) return <Badge className="bg-green-100 text-green-800">Hot</Badge>
    if (n >= 75) return <Badge className="bg-amber-100 text-amber-800">Warm</Badge>
    return <Badge className="bg-gray-100 text-gray-800">Cold</Badge>
  }

  const exportCSV = (rows: Lead[], filename: string) => {
    const headers = [
      "Company Name",
      "Contact Name",
      "Title",
      "Email",
      "Phone",
      "Industry",
      "Company Size",
      "Revenue",
      "Location",
      "Website",
      "LinkedIn",
      "Lead Score",
    ]
    const csv = [
      headers.join(","),
      ...rows.map((l) =>
        [
          l.companyName,
          l.contactName,
          l.contactTitle,
          l.contactEmail,
          l.contactPhone,
          l.industry,
          l.companySize,
          l.revenueRange,
          l.location,
          l.website,
          l.linkedinUrl,
          l.leadScore,
        ]
          .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads Database</h1>
          <p className="text-gray-600 mt-1">Access 70M+ business records with AI-powered insights</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() =>
              exportCSV(
                filteredLeads,
                `svara_all_leads_${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
            disabled={filteredLeads.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export All ({filteredLeads.length})
          </Button>

          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <Button variant="outline" disabled={selected.length === 0} onClick={() => setExportOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export Selected ({selected.length})
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Selected Leads</DialogTitle>
                <DialogDescription>Export {selected.length} selected leads to CSV.</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setExportOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    exportCSV(
                      filteredLeads.filter((l) => selected.includes(l.id)),
                      `svara_selected_${new Date().toISOString().slice(0, 10)}.csv`,
                    )
                    setExportOpen(false)
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={selected.length === 0}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Campaign
          </Button>
        </div>
      </div>

      {/* Error notice */}
      {err && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">{err}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">70M+</div>
            <p className="text-xs text-muted-foreground">Business records available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Loaded Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
            <p className="text-xs text-muted-foreground">Currently loaded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Industries</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">500+</div>
            <p className="text-xs text-muted-foreground">Industry categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selected.length}</div>
            <p className="text-xs text-muted-foreground">Leads selected</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search companies, contacts, industries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {uniqueIndustries.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sizeFilter} onValueChange={setSizeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Company Sizes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Company Sizes</SelectItem>
            {uniqueSizes.map((sz) => (
              <SelectItem key={sz} value={sz}>
                {sz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>
        <div className="text-sm text-gray-600">{selected.length > 0 && `${selected.length} selected`}</div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading leads…</p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && filteredLeads.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.length > 0 && selected.length === filteredLeads.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredLeads.map((l) => (
                <TableRow key={l.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox checked={selected.includes(l.id)} onCheckedChange={() => toggleRow(l.id)} />
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{l.companyName}</div>
                      {l.website && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          <a href={l.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">
                            {l.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{l.contactName}</div>
                      <div className="text-sm text-gray-600">{l.contactTitle}</div>
                      <div className="text-sm text-gray-600">{l.contactEmail}</div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">{l.industry || "—"}</Badge>
                  </TableCell>

                  <TableCell>{l.companySize || "—"}</TableCell>
                  <TableCell>{l.revenueRange || "—"}</TableCell>

                  <TableCell>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      {l.location || "—"}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{l.leadScore}</span>
                      {scorePill(l.leadScore)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setViewLead(l)}>
                        View Details
                      </Button>
                      {l.linkedinUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      {l.pdlEnriched && (
                        <Badge className="bg-purple-100 text-purple-800 flex items-center">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Enriched
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Empty state */}
      {!loading && filteredLeads.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">Try adjusting your search or filters.</p>
          </CardContent>
        </Card>
      )}

      {/* Lead details dialog */}
      <Dialog open={!!viewLead} onOpenChange={(open) => !open && setViewLead(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <span>{viewLead?.companyName}</span>
              {viewLead?.pdlEnriched && (
                <Badge className="bg-purple-100 text-purple-800 flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" />
                  PDL Enriched
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Detailed lead information</DialogDescription>
          </DialogHeader>

          {viewLead && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Labeled label="Name">{viewLead.contactName}</Labeled>
                    <Labeled label="Title">{viewLead.contactTitle}</Labeled>
                    <Labeled label="Email">{viewLead.contactEmail}</Labeled>
                    <Labeled label="Phone">{viewLead.contactPhone || "Not available"}</Labeled>
                    <Labeled label="LinkedIn">
                      {viewLead.linkedinUrl ? (
                        <a
                          href={viewLead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Profile
                        </a>
                      ) : (
                        <span className="text-gray-400">Not available</span>
                      )}
                    </Labeled>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Building2 className="w-4 h-4 mr-2" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Labeled label="Company">{viewLead.companyName}</Labeled>
                    <Labeled label="Industry">
                      <Badge variant="outline">{viewLead.industry || "—"}</Badge>
                    </Labeled>
                    <Labeled label="Company Size">{viewLead.companySize || "—"}</Labeled>
                    <Labeled label="Revenue Range">{viewLead.revenueRange || "—"}</Labeled>
                    <Labeled label="Location">
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {viewLead.location || "—"}
                      </span>
                    </Labeled>
                    <Labeled label="Website">
                      {viewLead.website ? (
                        <a
                          href={viewLead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {viewLead.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-gray-400">Not available</span>
                      )}
                    </Labeled>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    Lead Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{viewLead.leadScore}</div>
                      <div className="text-sm text-gray-500">Lead Score</div>
                      <div className="mt-1">{scorePill(viewLead.leadScore)}</div>
                    </div>
                    {viewLead.pdlEnriched && viewLead.pdlEnrichmentScore && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{viewLead.pdlEnrichmentScore}</div>
                        <div className="text-sm text-gray-500">Enrichment Score</div>
                        <Badge className="bg-purple-100 text-purple-800">PDL Verified</Badge>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700">{viewLead.dataSource}</div>
                      <div className="text-sm text-gray-500">Data Source</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(viewLead.pdlExperienceSummary ||
                viewLead.pdlEducationSummary ||
                (viewLead.pdlSkills && viewLead.pdlSkills.length) ||
                (viewLead.pdlInterests && viewLead.pdlInterests.length) ||
                (viewLead.pdlSocialProfiles && viewLead.pdlSocialProfiles.length)) && (
                <>
                  <h3 className="text-lg font-semibold flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                    People Data Labs Enrichment
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {viewLead.pdlExperienceSummary && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Professional Experience
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{viewLead.pdlExperienceSummary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {viewLead.pdlEducationSummary && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Education
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{viewLead.pdlEducationSummary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {viewLead.pdlSkills && viewLead.pdlSkills.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <Award className="w-4 h-4 mr-2" />
                            Skills
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {viewLead.pdlSkills.slice(0, 8).map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {String(s)}
                              </Badge>
                            ))}
                            {viewLead.pdlSkills.length > 8 && (
                              <Badge variant="outline" className="text-xs">
                                +{viewLead.pdlSkills.length - 8} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {viewLead.pdlInterests && viewLead.pdlInterests.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <Star className="w-4 h-4 mr-2" />
                            Interests
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {viewLead.pdlInterests.slice(0, 6).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {String(s)}
                              </Badge>
                            ))}
                            {viewLead.pdlInterests.length > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{viewLead.pdlInterests.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {viewLead.pdlSocialProfiles && viewLead.pdlSocialProfiles.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Social Profiles
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-3">
                          {viewLead.pdlSocialProfiles.map((p, i) => (
                            <a
                              key={i}
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="capitalize">{p.network}</span>
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setViewLead(null)}>
                  Close
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Campaign
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add-to-Campaign modal */}
      <AddToCampaignModal
        open={addOpen}
        onOpenChange={setAddOpen}
        leadIds={selected}
        onAttached={() => {
          setSelected([])
        }}
      />
    </div>
  )
}
