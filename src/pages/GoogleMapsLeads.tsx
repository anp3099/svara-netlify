import React, { useState, useEffect } from 'react'
import { Search, MapPin, Phone, Globe, Star, Users, DollarSign, Download, Plus, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { googleMapsService, GoogleMapsLead, GoogleMapsSearchParams } from '@/services/googleMapsService'
import { createClient } from '@blinkdotnew/sdk'

const blink = createClient({
  projectId: 'spark-ai-sales-outreach-saas-platform-68hyt0cq',
  authRequired: true
})

export default function GoogleMapsLeads() {
  const [searchParams, setSearchParams] = useState<GoogleMapsSearchParams>({
    query: '',
    location: '',
    radius: 10,
    minRating: 3.0,
    limit: 50
  })
  const [leads, setLeads] = useState<GoogleMapsLead[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  const handleSearch = async () => {
    if (!searchParams.query.trim() || !searchParams.location.trim()) {
      toast.error('Please enter both search query and location')
      return
    }

    setLoading(true)
    try {
      const results = await googleMapsService.searchBusinesses(searchParams)
      setLeads(results)
      toast.success(`Found ${results.length} businesses`)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search businesses. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)))
    }
  }

  const handleSaveSelected = async () => {
    if (selectedLeads.size === 0) {
      toast.error('Please select leads to save')
      return
    }

    if (!user?.id) {
      toast.error('Please log in to save leads')
      return
    }

    try {
      const selectedLeadData = leads.filter(lead => selectedLeads.has(lead.id))
      await googleMapsService.saveLeadsToDatabase(selectedLeadData, user.id)
      toast.success(`Saved ${selectedLeads.size} leads to your database`)
      setSelectedLeads(new Set())
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save leads. Please try again.')
    }
  }

  const handleExportSelected = () => {
    if (selectedLeads.size === 0) {
      toast.error('Please select leads to export')
      return
    }

    const selectedLeadData = leads.filter(lead => selectedLeads.has(lead.id))
    const csvContent = [
      ['Business Name', 'Category', 'Address', 'Phone', 'Website', 'Rating', 'Reviews'].join(','),
      ...selectedLeadData.map(lead => [
        lead.businessName,
        lead.category,
        lead.address,
        lead.phone || '',
        lead.website || '',
        lead.rating || '',
        lead.reviewCount || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `google-maps-leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Leads exported successfully')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Google Maps Lead Generation</h1>
          <p className="text-muted-foreground">
            Discover and extract real business data from Google Maps to fuel your outreach campaigns.
            All leads are validated and verified before being added to your database.
          </p>
        </div>

        {/* Search Section */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Parameters
            </CardTitle>
            <CardDescription>
              Define your search criteria to find relevant businesses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="query">Business Type / Keywords</Label>
                <Input
                  id="query"
                  placeholder="e.g., restaurants, dentists, marketing agencies"
                  value={searchParams.query}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., New York, NY or San Francisco, CA"
                  value={searchParams.location}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search Radius (miles)</Label>
                <Select
                  value={searchParams.radius?.toString()}
                  onValueChange={(value) => setSearchParams(prev => ({ ...prev, radius: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <div className="px-3">
                  <Slider
                    value={[searchParams.minRating || 3.0]}
                    onValueChange={([value]) => setSearchParams(prev => ({ ...prev, minRating: value }))}
                    max={5}
                    min={1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>1.0</span>
                    <span className="font-medium">{searchParams.minRating?.toFixed(1)}</span>
                    <span>5.0</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Results Limit</Label>
                <Select
                  value={searchParams.limit?.toString()}
                  onValueChange={(value) => setSearchParams(prev => ({ ...prev, limit: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                    <SelectItem value="100">100 results</SelectItem>
                    <SelectItem value="200">200 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching Google Maps...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Businesses
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {leads.length > 0 && (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">
                  Found {leads.length} Businesses
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-border hover:bg-muted"
                >
                  {selectedLeads.size === leads.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              {selectedLeads.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedLeads.size} selected
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSaveSelected}
                    className="bg-accent hover:bg-accent/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Save to Database
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportSelected}
                    className="border-border hover:bg-muted"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              )}
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {leads.map((lead) => (
                <Card 
                  key={lead.id} 
                  className={`bg-card border-border cursor-pointer transition-all hover:border-muted-foreground ${
                    selectedLeads.has(lead.id) ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                  onClick={() => handleSelectLead(lead.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{lead.businessName}</CardTitle>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          {lead.category}
                        </Badge>
                      </div>
                      {lead.verified && (
                        <Badge className="bg-accent text-accent-foreground">Verified</Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Rating */}
                    {lead.rating && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="ml-1 font-medium">{lead.rating}</span>
                        </div>
                        <span className="text-muted-foreground text-sm">
                          ({lead.reviewCount} reviews)
                        </span>
                      </div>
                    )}

                    {/* Address */}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{lead.address}</span>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2">
                      {lead.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{lead.phone}</span>
                        </div>
                      )}
                      {lead.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={lead.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:text-primary/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Website
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Business Hours */}
                    {lead.hours && (
                      <div className="text-sm text-muted-foreground">
                        {lead.hours}
                      </div>
                    )}

                    {/* AI Insights */}
                    {lead.description && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-sm text-foreground line-clamp-3">
                          {lead.description}
                        </p>
                      </div>
                    )}

                    {/* Price Level */}
                    {lead.priceLevel && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div className="flex">
                          {Array.from({ length: 4 }, (_, i) => (
                            <DollarSign 
                              key={i} 
                              className={`h-3 w-3 ${
                                i < lead.priceLevel ? 'text-accent' : 'text-muted'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {leads.length === 0 && !loading && (
          <Card className="bg-card border-border">
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
              <p className="text-muted-foreground mb-4">
                Enter your search criteria above to discover businesses on Google Maps
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}