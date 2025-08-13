import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Play, Pause, BarChart3, Users, Mail, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { blink } from '@/blink/client'
import { planRestrictionService } from '@/services/planRestrictions'

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
  product_name?: string
}

interface Product {
  id: string
  name: string
  description: string
  category: string
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    product_id: ''
  })

  const loadCampaigns = async () => {
    try {
      const user = await blink.auth.me()
      const campaignData = await blink.db.campaigns.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' }
      })
      
      // Load products to get product names
      const productData = await blink.db.products.list({
        where: { user_id: user.id }
      })
      
      // Map campaigns with product names
      const campaignsWithProducts = campaignData.map(campaign => {
        const product = productData.find(p => p.id === campaign.product_id)
        return {
          ...campaign,
          product_name: product?.name
        }
      })
      
      setCampaigns(campaignsWithProducts)
      setProducts(productData)
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  const createCampaign = async () => {
    // Validation
    if (!newCampaign.name.trim()) {
      alert('Please enter a campaign name')
      return
    }
    if (products.length === 0) {
      alert('No products available. Please create a product first before creating a campaign.')
      return
    }
    if (!newCampaign.product_id) {
      alert('Please select a product')
      return
    }

    try {
      const user = await blink.auth.me()
      
      // Check plan restrictions for campaign creation
      const planCheck = await planRestrictionService.canCreateCampaign(user.id)
      if (!planCheck.allowed) {
        alert(planCheck.message || 'Campaign limit reached for your current plan.')
        return
      }
      const campaignId = `camp_${Date.now()}`
      const product = products.find(p => p.id === newCampaign.product_id)
      
      const campaignData = {
        id: campaignId,
        user_id: user.id,
        product_id: newCampaign.product_id,
        name: newCampaign.name.trim(),
        description: newCampaign.description.trim(),
        status: 'draft',
        total_leads: 0,
        contacted_leads: 0,
        responses: 0,
        conversions: 0
      }

      await blink.db.campaigns.create(campaignData)
      
      // Add to local state with product name
      const newCampaignWithProduct: Campaign = {
        ...campaignData,
        created_at: new Date().toISOString(),
        product_name: product?.name
      }

      setCampaigns(prev => [newCampaignWithProduct, ...prev])
      setIsCreateDialogOpen(false)
      setNewCampaign({ name: '', description: '', product_id: '' })
      alert('Campaign created successfully!')
    } catch (error) {
      console.error('Failed to create campaign:', error)
      alert(`Failed to create campaign: ${error?.message || 'Unknown error'}. Please try again.`)
    }
  }

  const toggleCampaignStatus = (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    setCampaigns(prev => prev.map(campaign => 
      campaign.id === campaignId 
        ? { ...campaign, status: newStatus }
        : campaign
    ))
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      active: { label: 'Active', variant: 'default' as const },
      paused: { label: 'Paused', variant: 'outline' as const },
      completed: { label: 'Completed', variant: 'destructive' as const }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600 mt-1">Loading campaigns...</p>
          </div>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
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
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage your AI-powered outreach campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new AI-powered outreach campaign to generate leads and drive conversions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="Q1 Enterprise Outreach"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-select">Product</Label>
                  <Select value={newCampaign.product_id} onValueChange={(value) => setNewCampaign(prev => ({ ...prev, product_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.length > 0 ? (
                        products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-products" disabled>
                          No products available - Create a product first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-description">Description</Label>
                <Textarea
                  id="campaign-description"
                  placeholder="Describe your campaign goals and target audience..."
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createCampaign} 
                  disabled={!newCampaign.name || !newCampaign.product_id || products.length === 0}
                >
                  Create Campaign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid gap-6">
        {filteredCampaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-xl">{campaign.name}</CardTitle>
                  {getStatusBadge(campaign.status)}
                </div>
                <CardDescription className="mt-1">
                  {campaign.description || 'No description provided'}
                </CardDescription>
                {campaign.product_name && (
                  <Badge variant="outline" className="mt-2">
                    {campaign.product_name}
                  </Badge>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}>
                    {campaign.status === 'active' ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Campaign
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Launch Campaign
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2 mx-auto">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{campaign.total_leads.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Leads</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-2 mx-auto">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{campaign.contacted_leads.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Contacted</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full mb-2 mx-auto">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{campaign.responses.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Responses</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2 mx-auto">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{campaign.conversions.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Conversions</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
                  <span className="text-indigo-600 font-medium">
                    {campaign.total_leads > 0 ? `${((campaign.responses / campaign.total_leads) * 100).toFixed(1)}% response rate` : 'No data yet'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}