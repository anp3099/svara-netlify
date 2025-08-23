import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Zap, Target, MessageSquare, Calendar, MapPin, Database, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { blink } from '@/blink/client'

/** --- Unique ID helpers (same as Campaigns.tsx) --- */
function generateCampaignId() {
  const core =
    typeof crypto !== 'undefined' && (crypto as any).randomUUID
      ? (crypto as any).randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  return `camp_${core}`
}
async function ensureUniqueCampaignId(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateCampaignId()
    try {
      const rows = await blink.db.campaigns.list({ where: { id }, limit: 1 })
      if (!rows || rows.length === 0) return id
    } catch { return id }
  }
  return generateCampaignId()
}

export default function CampaignBuilder() {
  // lightweight, optional creator so this page can also make uniquely-id’d campaigns
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [products, setProducts] = useState<{id:string; name:string}[]>([])
  const [form, setForm] = useState({ name:'', description:'', product_id:'' })

  useEffect(() => {
    (async () => {
      try {
        const me = await blink.auth.me()
        const prods = await blink.db.products.list({ where: { userId: me.id } })
        setProducts(prods)
      } catch {
        setProducts([])
      }
    })()
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.product_id) {
      alert('Please enter a name and select a product.')
      return
    }
    try {
      setCreating(true)
      const me = await blink.auth.me()

      let id = await ensureUniqueCampaignId()
      const payload = {
        id,
        userId: me.id,
        productId: form.product_id,
        name: form.name.trim(),
        description: form.description.trim(),
        status: 'draft',
        totalLeads: 0,
        contactedLeads: 0,
        responses: 0,
        conversions: 0,
        createdAt: new Date().toISOString(),
      }

      try {
        await blink.db.campaigns.create(payload)
      } catch (e: any) {
        const m = String(e?.message || '')
        if (/duplicate|constraint/i.test(m)) {
          id = await ensureUniqueCampaignId()
          await blink.db.campaigns.create({ ...payload, id })
        } else {
          throw e
        }
      }

      setOpen(false)
      setForm({ name:'', description:'', product_id:'' })
      alert('Campaign created!')
    } catch (e: any) {
      alert(`Failed to create campaign: ${e?.message || 'Unknown error'}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Builder</h1>
          <p className="text-gray-600">Create and configure your AI-powered outreach campaigns</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}>
          <Zap className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-indigo-600" />
              Target Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Define your ideal customer profile and targeting criteria.</p>
            <Button variant="outline" className="w-full">Configure Targeting</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5 text-indigo-600" />
              AI Sequences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Generate personalized email and LinkedIn sequences with AI.</p>
            <Button variant="outline" className="w-full">Build Sequences</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-indigo-600" />
              Schedule & Launch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Set timing, frequency, and launch your campaign.</p>
            <Button variant="outline" className="w-full">Schedule Campaign</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center mb-2">
                <MapPin className="mr-2 h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Google Maps</h3>
                <Badge variant="secondary" className="ml-auto">New</Badge>
              </div>
              <p className="text-sm text-gray-600">Extract real business data from Google Maps searches</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center mb-2">
                <Database className="mr-2 h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Leads Database</h3>
              </div>
              <p className="text-sm text-gray-600">Use your existing leads database for campaigns</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center mb-2">
                <Search className="mr-2 h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Industry Search</h3>
              </div>
              <p className="text-sm text-gray-600">Target specific industries with AI-powered search</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Local Business Outreach</h3>
                <Badge variant="secondary">New</Badge>
              </div>
              <p className="text-sm text-gray-600">Target local businesses found through Google Maps</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">SaaS Outreach</h3>
                <Badge variant="secondary">Popular</Badge>
              </div>
              <p className="text-sm text-gray-600">Target SaaS companies with personalized value propositions</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <h3 className="font-semibold mb-2">Agency Prospecting</h3>
              <p className="text-sm text-gray-600">Reach marketing agencies with service-focused messaging</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
              <h3 className="font-semibold mb-2">Enterprise Sales</h3>
              <p className="text-sm text-gray-600">Multi-touch sequences for enterprise decision makers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              Search Google Maps
            </Button>
            <Button variant="outline" className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              Import Leads
            </Button>
            <Button variant="outline" className="flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              Generate Sequences
            </Button>
            <Button variant="outline" className="flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Set Targeting
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Minimal create dialog (unique IDs) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>Creates a draft campaign with a guaranteed-unique ID.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  placeholder="Q4 Outreach"
                  value={form.name}
                  onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select
                  value={form.product_id}
                  onValueChange={(v) => setForm(s => ({ ...s, product_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length ? products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    )) : (
                      <SelectItem value="__none" disabled>No products</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your campaign goals…"
                value={form.description}
                onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !form.name || !form.product_id}>
                {creating ? 'Creating…' : 'Create Campaign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
