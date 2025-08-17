import React, { useState, useEffect } from 'react'
import { Search, Filter, Download, Plus, Building2, MapPin, Users, DollarSign, ExternalLink, Star, Crown, AlertCircle, Sparkles, Award, BookOpen, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { blink } from '@/blink/client'

interface Lead {
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
  // PDL enrichment data
  pdlEnriched?: boolean
  pdlEnrichmentScore?: number
  pdlExperienceSummary?: string
  pdlSkills?: string[]
  pdlInterests?: string[]
  pdlEducationSummary?: string
  pdlSocialProfiles?: Array<{
    network: string
    url: string
  }>
}

// Sample leads data for immediate display
const sampleLeads: Lead[] = [
  {
    id: 'lead_1',
    companyName: 'TechCorp Solutions',
    industry: 'Software',
    companySize: '100-500',
    revenueRange: '$10M-$50M',
    location: 'San Francisco, CA',
    website: 'https://techcorp.com',
    contactName: 'Sarah Johnson',
    contactTitle: 'VP of Sales',
    contactEmail: 'sarah.johnson@techcorp.com',
    contactPhone: '+1 (555) 123-4567',
    linkedinUrl: 'https://linkedin.com/in/sarahjohnson',
    leadScore: 92,
    dataSource: 'proprietary'
  },
  {
    id: 'lead_2',
    companyName: 'DataFlow Systems',
    industry: 'Data Analytics',
    companySize: '50-100',
    revenueRange: '$5M-$10M',
    location: 'Austin, TX',
    website: 'https://dataflow.com',
    contactName: 'Michael Chen',
    contactTitle: 'CTO',
    contactEmail: 'michael.chen@dataflow.com',
    contactPhone: '+1 (555) 234-5678',
    linkedinUrl: 'https://linkedin.com/in/michaelchen',
    leadScore: 87,
    dataSource: 'proprietary'
  },
  {
    id: 'lead_3',
    companyName: 'GrowthLabs Inc',
    industry: 'Marketing',
    companySize: '25-50',
    revenueRange: '$1M-$5M',
    location: 'New York, NY',
    website: 'https://growthlabs.com',
    contactName: 'Emily Rodriguez',
    contactTitle: 'Head of Marketing',
    contactEmail: 'emily.rodriguez@growthlabs.com',
    contactPhone: '+1 (555) 345-6789',
    linkedinUrl: 'https://linkedin.com/in/emilyrodriguez',
    leadScore: 78,
    dataSource: 'proprietary'
  },
  {
    id: 'lead_4',
    companyName: 'CloudScale Ventures',
    industry: 'Cloud Services',
    companySize: '200-500',
    revenueRange: '$20M-$50M',
    location: 'Seattle, WA',
    website: 'https://cloudscale.com',
    contactName: 'David Kim',
    contactTitle: 'VP of Operations',
    contactEmail: 'david.kim@cloudscale.com',
    contactPhone: '+1 (555) 456-7890',
    linkedinUrl: 'https://linkedin.com/in/davidkim',
    leadScore: 85,
    dataSource: 'proprietary'
  },
  {
    id: 'lead_5',
    companyName: 'InnovateTech',
    industry: 'Technology',
    companySize: '500-1000',
    revenueRange: '$50M-$100M',
    location: 'Boston, MA',
    website: 'https://innovatetech.com',
    contactName: 'Lisa Wang',
    contactTitle: 'Chief Revenue Officer',
    contactEmail: 'lisa.wang@innovatetech.com',
    contactPhone: '+1 (555) 567-8901',
    linkedinUrl: 'https://linkedin.com/in/lisawang',
    leadScore: 94,
    dataSource: 'proprietary'
  }
]

export default function LeadsDatabase() {
  const [leads, setLeads] = useState<Lead[]>(sampleLeads)
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>(sampleLeads)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [industryFilter, setIndustryFilter] = useState('all')
  const [companySizeFilter, setCompanySizeFilter] = useState('all')
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedLeadForView, setSelectedLeadForView] = useState<Lead | null>(null)
  const [isLeadViewDialogOpen, setIsLeadViewDialogOpen] = useState(false)

  // Initialize auth
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  // Load real leads from database
  useEffect(() => {
    const loadRealLeads = async () => {
      if (!user?.id) return

      try {
        setLoading(true)
        setError(null)
        
        const realLeads = await blink.db.leads.list({
          where: { user_id: user.id },
          orderBy: { lead_score: 'desc' },
          limit: 50
        })

        if (realLeads.length > 0) {
          const formattedLeads = realLeads.map(lead => ({
            id: lead.id,
            companyName: lead.company_name || 'Unknown Company',
            industry: lead.industry || 'Unknown',
            companySize: lead.company_size || 'Unknown',
            revenueRange: lead.revenue_range || 'Unknown',
            location: lead.location || 'Unknown',
            website: lead.website || '',
            contactName: lead.contact_name || 'Unknown',
            contactTitle: lead.contact_title || 'Unknown',
            contactEmail: lead.contact_email || '',
            contactPhone: lead.contact_phone || '',
            linkedinUrl: lead.linkedin_url || '',
            leadScore: Number(lead.lead_score) || 0,
            dataSource: lead.data_source || 'proprietary',
            // PDL enrichment data (if available)
            pdlEnriched: Boolean(lead.pdl_enriched),
            pdlEnrichmentScore: lead.pdl_enrichment_score ? Number(lead.pdl_enrichment_score) : undefined,
            pdlExperienceSummary: lead.pdl_experience_summary || undefined,
            pdlSkills: lead.pdl_skills ? JSON.parse(lead.pdl_skills) : undefined,
            pdlInterests: lead.pdl_interests ? JSON.parse(lead.pdl_interests) : undefined,
            pdlEducationSummary: lead.pdl_education_summary || undefined,
            pdlSocialProfiles: lead.pdl_social_profiles ? JSON.parse(lead.pdl_social_profiles) : undefined
          }))
          setLeads(formattedLeads)
          setFilteredLeads(formattedLeads)
        }
      } catch (error) {
        console.error('Failed to load leads:', error)
        setError('Failed to load leads from database. Showing sample data.')
        // Keep sample data on error
      } finally {
        setLoading(false)
      }
    }

    loadRealLeads()
  }, [user?.id])

  // Filter leads
  useEffect(() => {
    let filtered = leads

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (industryFilter && industryFilter !== 'all') {
      filtered = filtered.filter(lead => lead.industry === industryFilter)
    }

    if (companySizeFilter && companySizeFilter !== 'all') {
      filtered = filtered.filter(lead => lead.companySize === companySizeFilter)
    }

    setFilteredLeads(filtered)
  }, [leads, searchTerm, industryFilter, companySizeFilter])

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedLeads(
      selectedLeads.length === filteredLeads.length
        ? []
        : filteredLeads.map(lead => lead.id)
    )
  }

  const exportSelectedLeads = () => {
    const selectedLeadsData = filteredLeads.filter(lead => selectedLeads.includes(lead.id))
    
    // Create CSV content
    const headers = ['Company Name', 'Contact Name', 'Title', 'Email', 'Phone', 'Industry', 'Company Size', 'Revenue', 'Location', 'Website', 'LinkedIn', 'Lead Score']
    const csvContent = [
      headers.join(','),
      ...selectedLeadsData.map(lead => [
        lead.companyName,
        lead.contactName,
        lead.contactTitle,
        lead.contactEmail,
        lead.contactPhone,
        lead.industry,
        lead.companySize,
        lead.revenueRange,
        lead.location,
        lead.website,
        lead.linkedinUrl,
        lead.leadScore
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `svara_leads_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    setIsExportDialogOpen(false)
  }

  const getLeadScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Hot</Badge>
    if (score >= 75) return <Badge className="bg-amber-100 text-amber-800">Warm</Badge>
    return <Badge className="bg-gray-100 text-gray-800">Cold</Badge>
  }

  const viewLeadDetails = (lead: Lead) => {
    setSelectedLeadForView(lead)
    setIsLeadViewDialogOpen(true)
  }

  const uniqueIndustries = [...new Set(leads.map(lead => lead.industry).filter(Boolean))].sort()
  const uniqueCompanySizes = [...new Set(leads.map(lead => lead.companySize).filter(Boolean))].sort()

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
            onClick={() => {
              const csvContent = [
                ['Company Name', 'Contact Name', 'Title', 'Email', 'Phone', 'Industry', 'Company Size', 'Revenue', 'Location', 'Website', 'LinkedIn', 'Lead Score'].join(','),
                ...filteredLeads.map(lead => [
                  lead.companyName,
                  lead.contactName,
                  lead.contactTitle,
                  lead.contactEmail,
                  lead.contactPhone,
                  lead.industry,
                  lead.companySize,
                  lead.revenueRange,
                  lead.location,
                  lead.website,
                  lead.linkedinUrl,
                  lead.leadScore
                ].map(field => `"${field}"`).join(','))
              ].join('\n')
              
              const blob = new Blob([csvContent], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `svara_all_leads_${new Date().toISOString().split('T')[0]}.csv`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
            }}
            disabled={filteredLeads.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export All ({filteredLeads.length})
          </Button>
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={selectedLeads.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export Selected ({selectedLeads.length})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Selected Leads</DialogTitle>
                <DialogDescription>
                  Export {selectedLeads.length} selected leads to CSV format for use in your campaigns.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={exportSelectedLeads}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              if (selectedLeads.length === 0) {
                alert('Please select leads to add to campaign')
                return
              }
              alert(`Adding ${selectedLeads.length} leads to campaign. This feature will be implemented in the next update.`)
            }}
            disabled={selectedLeads.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Campaign
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">70M+</div>
            <p className="text-xs text-muted-foreground">Business records available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loaded Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
            <p className="text-xs text-muted-foreground">Currently loaded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Industries</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">500+</div>
            <p className="text-xs text-muted-foreground">Industry categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedLeads.length}</div>
            <p className="text-xs text-muted-foreground">Leads selected</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search companies, contacts, industries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {uniqueIndustries.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companySizeFilter} onValueChange={setCompanySizeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Company Sizes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Company Sizes</SelectItem>
            {uniqueCompanySizes.map((size) => (
              <SelectItem key={size} value={size}>
                {size} employees
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>
        <div className="text-sm text-gray-600">
          {selectedLeads.length > 0 && `${selectedLeads.length} selected`}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leads...</p>
          </div>
        </div>
      )}

      {/* Leads Table */}
      {!loading && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={toggleSelectAll}
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
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{lead.companyName}</div>
                      {lead.website && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">
                            {lead.website.replace('https://', '').replace('http://', '')}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{lead.contactName}</div>
                      <div className="text-sm text-gray-500">{lead.contactTitle}</div>
                      <div className="text-sm text-gray-500">{lead.contactEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.industry}</Badge>
                  </TableCell>
                  <TableCell>{lead.companySize}</TableCell>
                  <TableCell>{lead.revenueRange}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      {lead.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{lead.leadScore}</span>
                      {getLeadScoreBadge(lead.leadScore)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => viewLeadDetails(lead)}
                      >
                        View Details
                      </Button>
                      {lead.linkedinUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      {lead.pdlEnriched && (
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

      {/* Empty State */}
      {!loading && filteredLeads.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
          </CardContent>
        </Card>
      )}

      {/* Lead Details Dialog */}
      <Dialog open={isLeadViewDialogOpen} onOpenChange={setIsLeadViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>{selectedLeadForView?.companyName}</span>
              {selectedLeadForView?.pdlEnriched && (
                <Badge className="bg-purple-100 text-purple-800 flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" />
                  PDL Enriched
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Detailed lead information and enrichment data
            </DialogDescription>
          </DialogHeader>
          
          {selectedLeadForView && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-sm">{selectedLeadForView.contactName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Title</label>
                      <p className="text-sm">{selectedLeadForView.contactTitle}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm">{selectedLeadForView.contactEmail}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-sm">{selectedLeadForView.contactPhone || 'Not available'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">LinkedIn</label>
                      {selectedLeadForView.linkedinUrl ? (
                        <a 
                          href={selectedLeadForView.linkedinUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Profile
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400">Not available</p>
                      )}
                    </div>
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
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company</label>
                      <p className="text-sm">{selectedLeadForView.companyName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Industry</label>
                      <Badge variant="outline">{selectedLeadForView.industry}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company Size</label>
                      <p className="text-sm">{selectedLeadForView.companySize}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Revenue Range</label>
                      <p className="text-sm">{selectedLeadForView.revenueRange}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Location</label>
                      <p className="text-sm flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {selectedLeadForView.location}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Website</label>
                      {selectedLeadForView.website ? (
                        <a 
                          href={selectedLeadForView.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {selectedLeadForView.website.replace('https://', '').replace('http://', '')}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400">Not available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lead Scoring */}
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
                      <div className="text-2xl font-bold text-indigo-600">{selectedLeadForView.leadScore}</div>
                      <div className="text-sm text-gray-500">Lead Score</div>
                      {getLeadScoreBadge(selectedLeadForView.leadScore)}
                    </div>
                    {selectedLeadForView.pdlEnriched && selectedLeadForView.pdlEnrichmentScore && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{selectedLeadForView.pdlEnrichmentScore}</div>
                        <div className="text-sm text-gray-500">Enrichment Score</div>
                        <Badge className="bg-purple-100 text-purple-800">PDL Verified</Badge>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700">{selectedLeadForView.dataSource}</div>
                      <div className="text-sm text-gray-500">Data Source</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PDL Enrichment Data */}
              {selectedLeadForView.pdlEnriched && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                    People Data Labs Enrichment
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Experience */}
                    {selectedLeadForView.pdlExperienceSummary && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Professional Experience
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{selectedLeadForView.pdlExperienceSummary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Education */}
                    {selectedLeadForView.pdlEducationSummary && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Education
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700">{selectedLeadForView.pdlEducationSummary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Skills */}
                    {selectedLeadForView.pdlSkills && selectedLeadForView.pdlSkills.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <Award className="w-4 h-4 mr-2" />
                            Skills
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedLeadForView.pdlSkills.slice(0, 8).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {selectedLeadForView.pdlSkills.length > 8 && (
                              <Badge variant="outline" className="text-xs">
                                +{selectedLeadForView.pdlSkills.length - 8} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Interests */}
                    {selectedLeadForView.pdlInterests && selectedLeadForView.pdlInterests.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center">
                            <Star className="w-4 h-4 mr-2" />
                            Interests
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedLeadForView.pdlInterests.slice(0, 6).map((interest, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                            {selectedLeadForView.pdlInterests.length > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{selectedLeadForView.pdlInterests.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Social Profiles */}
                  {selectedLeadForView.pdlSocialProfiles && selectedLeadForView.pdlSocialProfiles.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Social Profiles
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-3">
                          {selectedLeadForView.pdlSocialProfiles.map((profile, index) => (
                            <a
                              key={index}
                              href={profile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="capitalize">{profile.network}</span>
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsLeadViewDialogOpen(false)}>
                  Close
                </Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    // Add to campaign functionality
                    alert('Adding lead to campaign. This feature will be implemented in the next update.')
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Campaign
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}