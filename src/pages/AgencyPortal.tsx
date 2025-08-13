import React, { useState, useEffect } from 'react'
import { Building2, Users, DollarSign, Settings, Plus, Eye, Edit, Trash2, Crown, Palette, Globe } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { blink } from '@/blink/client'

interface Client {
  id: string
  name: string
  domain: string
  logo: string
  primaryColor: string
  status: 'active' | 'inactive' | 'trial'
  plan: 'starter' | 'professional' | 'enterprise'
  campaigns: number
  leads: number
  revenue: number
  lastActive: string
  customBranding: {
    companyName: string
    logoUrl: string
    primaryColor: string
    secondaryColor: string
    customDomain: string
    whiteLabel: boolean
  }
}

interface RevenueShare {
  clientId: string
  clientName: string
  plan: string
  monthlyRevenue: number
  agencyShare: number
  agencyEarnings: number
  status: 'active' | 'pending' | 'paid'
}

interface BrandingTemplate {
  id: string
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  logoPlacement: string
  preview: string
}

export default function AgencyPortal() {
  const [clients, setClients] = useState<Client[]>([])
  const [revenueShares, setRevenueShares] = useState<RevenueShare[]>([])
  const [brandingTemplates, setBrandingTemplates] = useState<BrandingTemplate[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [showAddClient, setShowAddClient] = useState(false)
  const [loading, setLoading] = useState(true)

  const [newClient, setNewClient] = useState({
    name: '',
    domain: '',
    plan: 'starter',
    customBranding: {
      companyName: '',
      logoUrl: '',
      primaryColor: '#6366F1',
      secondaryColor: '#10B981',
      customDomain: '',
      whiteLabel: true
    }
  })

  const loadClients = async () => {
    const mockClients: Client[] = [
      {
        id: '1',
        name: 'TechCorp Solutions',
        domain: 'techcorp-outreach.com',
        logo: 'https://via.placeholder.com/40x40/3B82F6/FFFFFF?text=TC',
        primaryColor: '#3B82F6',
        status: 'active',
        plan: 'professional',
        campaigns: 12,
        leads: 2847,
        revenue: 15000,
        lastActive: '2024-01-20T10:30:00Z',
        customBranding: {
          companyName: 'TechCorp Solutions',
          logoUrl: 'https://via.placeholder.com/120x40/3B82F6/FFFFFF?text=TechCorp',
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          customDomain: 'outreach.techcorp.com',
          whiteLabel: true
        }
      },
      {
        id: '2',
        name: 'Marketing Masters',
        domain: 'marketing-masters-crm.com',
        logo: 'https://via.placeholder.com/40x40/10B981/FFFFFF?text=MM',
        primaryColor: '#10B981',
        status: 'active',
        plan: 'enterprise',
        campaigns: 28,
        leads: 5632,
        revenue: 35000,
        lastActive: '2024-01-19T14:15:00Z',
        customBranding: {
          companyName: 'Marketing Masters',
          logoUrl: 'https://via.placeholder.com/120x40/10B981/FFFFFF?text=Marketing+Masters',
          primaryColor: '#10B981',
          secondaryColor: '#F59E0B',
          customDomain: 'crm.marketingmasters.io',
          whiteLabel: true
        }
      },
      {
        id: '3',
        name: 'Sales Accelerator',
        domain: 'sales-accelerator-platform.com',
        logo: 'https://via.placeholder.com/40x40/F59E0B/FFFFFF?text=SA',
        primaryColor: '#F59E0B',
        status: 'trial',
        plan: 'starter',
        campaigns: 3,
        leads: 456,
        revenue: 0,
        lastActive: '2024-01-18T09:45:00Z',
        customBranding: {
          companyName: 'Sales Accelerator',
          logoUrl: 'https://via.placeholder.com/120x40/F59E0B/FFFFFF?text=Sales+Accelerator',
          primaryColor: '#F59E0B',
          secondaryColor: '#EF4444',
          customDomain: '',
          whiteLabel: false
        }
      }
    ]
    setClients(mockClients)
  }

  const loadRevenueShares = async () => {
    const mockRevenue: RevenueShare[] = [
      {
        clientId: '1',
        clientName: 'TechCorp Solutions',
        plan: 'Professional',
        monthlyRevenue: 15000,
        agencyShare: 30,
        agencyEarnings: 4500,
        status: 'active'
      },
      {
        clientId: '2',
        clientName: 'Marketing Masters',
        plan: 'Enterprise',
        monthlyRevenue: 35000,
        agencyShare: 25,
        agencyEarnings: 8750,
        status: 'active'
      },
      {
        clientId: '3',
        clientName: 'Sales Accelerator',
        plan: 'Starter',
        monthlyRevenue: 0,
        agencyShare: 40,
        agencyEarnings: 0,
        status: 'pending'
      }
    ]
    setRevenueShares(mockRevenue)
  }

  const loadBrandingTemplates = async () => {
    const mockTemplates: BrandingTemplate[] = [
      {
        id: '1',
        name: 'Corporate Blue',
        description: 'Professional blue theme for enterprise clients',
        primaryColor: '#1E40AF',
        secondaryColor: '#3B82F6',
        logoPlacement: 'top-left',
        preview: 'https://via.placeholder.com/300x200/1E40AF/FFFFFF?text=Corporate+Blue'
      },
      {
        id: '2',
        name: 'Growth Green',
        description: 'Fresh green theme for growth-focused companies',
        primaryColor: '#059669',
        secondaryColor: '#10B981',
        logoPlacement: 'center',
        preview: 'https://via.placeholder.com/300x200/059669/FFFFFF?text=Growth+Green'
      },
      {
        id: '3',
        name: 'Premium Purple',
        description: 'Elegant purple theme for premium services',
        primaryColor: '#7C3AED',
        secondaryColor: '#A855F7',
        logoPlacement: 'top-center',
        preview: 'https://via.placeholder.com/300x200/7C3AED/FFFFFF?text=Premium+Purple'
      }
    ]
    setBrandingTemplates(mockTemplates)
  }

  const loadAgencyData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadClients(),
        loadRevenueShares(),
        loadBrandingTemplates()
      ])
    } catch (error) {
      console.error('Failed to load agency data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgencyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createClient = async () => {
    try {
      const client: Client = {
        id: Date.now().toString(),
        name: newClient.name,
        domain: newClient.domain,
        logo: `https://via.placeholder.com/40x40/${newClient.customBranding.primaryColor.slice(1)}/FFFFFF?text=${newClient.name ? newClient.name.charAt(0) : 'C'}`,
        primaryColor: newClient.customBranding.primaryColor,
        status: 'trial',
        plan: newClient.plan as any,
        campaigns: 0,
        leads: 0,
        revenue: 0,
        lastActive: new Date().toISOString(),
        customBranding: newClient.customBranding
      }

      setClients(prev => [client, ...prev])
      setShowAddClient(false)
      setNewClient({
        name: '',
        domain: '',
        plan: 'starter',
        customBranding: {
          companyName: '',
          logoUrl: '',
          primaryColor: '#6366F1',
          secondaryColor: '#10B981',
          customDomain: '',
          whiteLabel: true
        }
      })

      alert(`Client "${client.name}" created successfully!`)
    } catch (error) {
      console.error('Failed to create client:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'trial': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'starter': return 'bg-blue-100 text-blue-800'
      case 'professional': return 'bg-purple-100 text-purple-800'
      case 'enterprise': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalEarnings = revenueShares.reduce((sum, r) => sum + r.agencyEarnings, 0)
  const activeClients = clients.filter(c => c.status === 'active').length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agency Portal</h1>
            <p className="text-gray-600 mt-1">Loading agency data...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">White-Label Agency Portal</h1>
          <p className="text-gray-600 mt-1">Manage clients, branding, and revenue sharing</p>
        </div>
        <div className="flex items-center space-x-4">
          <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Create a new white-label client with custom branding
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Client Name</Label>
                    <Input
                      id="client-name"
                      value={newClient.name}
                      onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., TechCorp Solutions"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-domain">Domain</Label>
                    <Input
                      id="client-domain"
                      value={newClient.domain}
                      onChange={(e) => setNewClient(prev => ({ ...prev, domain: e.target.value }))}
                      placeholder="e.g., techcorp-outreach.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-plan">Plan</Label>
                  <Select value={newClient.plan} onValueChange={(value) => setNewClient(prev => ({ ...prev, plan: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter - $99/month</SelectItem>
                      <SelectItem value="professional">Professional - $299/month</SelectItem>
                      <SelectItem value="enterprise">Enterprise - $599/month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Custom Branding</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input
                        id="company-name"
                        value={newClient.customBranding.companyName}
                        onChange={(e) => setNewClient(prev => ({
                          ...prev,
                          customBranding: { ...prev.customBranding, companyName: e.target.value }
                        }))}
                        placeholder="Display name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-domain">Custom Domain</Label>
                      <Input
                        id="custom-domain"
                        value={newClient.customBranding.customDomain}
                        onChange={(e) => setNewClient(prev => ({
                          ...prev,
                          customBranding: { ...prev.customBranding, customDomain: e.target.value }
                        }))}
                        placeholder="e.g., crm.client.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="primary-color"
                          type="color"
                          value={newClient.customBranding.primaryColor}
                          onChange={(e) => setNewClient(prev => ({
                            ...prev,
                            customBranding: { ...prev.customBranding, primaryColor: e.target.value }
                          }))}
                          className="w-16 h-10"
                        />
                        <Input
                          value={newClient.customBranding.primaryColor}
                          onChange={(e) => setNewClient(prev => ({
                            ...prev,
                            customBranding: { ...prev.customBranding, primaryColor: e.target.value }
                          }))}
                          placeholder="#6366F1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="secondary-color"
                          type="color"
                          value={newClient.customBranding.secondaryColor}
                          onChange={(e) => setNewClient(prev => ({
                            ...prev,
                            customBranding: { ...prev.customBranding, secondaryColor: e.target.value }
                          }))}
                          className="w-16 h-10"
                        />
                        <Input
                          value={newClient.customBranding.secondaryColor}
                          onChange={(e) => setNewClient(prev => ({
                            ...prev,
                            customBranding: { ...prev.customBranding, secondaryColor: e.target.value }
                          }))}
                          placeholder="#10B981"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newClient.customBranding.whiteLabel}
                      onCheckedChange={(checked) => setNewClient(prev => ({
                        ...prev,
                        customBranding: { ...prev.customBranding, whiteLabel: checked }
                      }))}
                    />
                    <Label>Enable White-Label (Hide Svara branding)</Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setShowAddClient(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createClient} disabled={!newClient.name || !newClient.domain}>
                    Create Client
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeClients} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From revenue sharing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.reduce((sum, c) => sum + c.campaigns, 0)}</div>
            <p className="text-xs text-muted-foreground">
              Across all clients
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Crown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.reduce((sum, c) => sum + c.leads, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Generated for clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clients">Client Management</TabsTrigger>
          <TabsTrigger value="branding">Branding Templates</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Sharing</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Management</CardTitle>
              <CardDescription>
                Manage your white-label clients and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <img
                          src={client.logo}
                          alt={client.name}
                          className="w-12 h-12 rounded-lg"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">{client.name}</h3>
                          <p className="text-sm text-gray-600">{client.domain}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(client.status)}>
                          {client.status}
                        </Badge>
                        <Badge className={getPlanColor(client.plan)}>
                          {client.plan}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Campaigns</p>
                        <p className="text-lg font-semibold">{client.campaigns}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Leads</p>
                        <p className="text-lg font-semibold">{client.leads.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Revenue</p>
                        <p className="text-lg font-semibold">${client.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Last Active</p>
                        <p className="text-lg font-semibold">{formatDate(client.lastActive)}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Palette className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Brand Colors:</span>
                            <div className="flex space-x-1">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: client.primaryColor }}
                              />
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: client.customBranding.secondaryColor }}
                              />
                            </div>
                          </div>
                          {client.customBranding.customDomain && (
                            <div className="flex items-center space-x-2">
                              <Globe className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600">{client.customBranding.customDomain}</span>
                            </div>
                          )}
                        </div>
                        {client.customBranding.whiteLabel && (
                          <Badge variant="outline" className="text-xs">
                            White-Label Enabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branding Templates</CardTitle>
              <CardDescription>
                Pre-designed branding templates for quick client setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {brandingTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 space-y-4">
                    <img
                      src={template.preview}
                      alt={template.name}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: template.primaryColor }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: template.secondaryColor }}
                        />
                        <span className="text-xs text-gray-500">{template.logoPlacement}</span>
                      </div>
                      <Button variant="outline" size="sm">
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Sharing</CardTitle>
              <CardDescription>
                Track earnings from client revenue sharing agreements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueShares.map((revenue) => (
                  <div key={revenue.clientId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{revenue.clientName}</h3>
                        <p className="text-sm text-gray-600">{revenue.plan} Plan</p>
                      </div>
                      <Badge className={getStatusColor(revenue.status)}>
                        {revenue.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Monthly Revenue</p>
                        <p className="text-lg font-semibold">${revenue.monthlyRevenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Agency Share</p>
                        <p className="text-lg font-semibold">{revenue.agencyShare}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Your Earnings</p>
                        <p className="text-lg font-semibold text-green-600">${revenue.agencyEarnings.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="text-lg font-semibold">{revenue.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Total Monthly Earnings</h3>
                    <p className="text-sm text-green-700">From all active revenue sharing agreements</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">${totalEarnings.toLocaleString()}</p>
                    <p className="text-sm text-green-700">Per month</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}