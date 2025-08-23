// src/pages/Campaigns.tsx
import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  BarChart3,
  Users,
  Mail,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { blink } from "@/blink/client";
import { planRestrictionService } from "@/services/planRestrictions";
import campaignService from "@/services/campaigns";

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  totalLeads: number;
  contactedLeads: number;
  responses: number;
  conversions: number;
  createdAt: string;

  // compatibility fields coming from DB (snake_case)
  total_leads?: number;
  contacted_leads?: number;
  created_at?: string;
  productId?: string;
  product_id?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    product_id: "",
  });

  async function load() {
    try {
      setLoading(true);
      const me = await blink.auth.me();

      const [cs, ps] = await Promise.all([
        campaignService.list(me.id),
        blink.db.products.list({ where: { userId: me.id } }),
      ]);

      const normalized = cs.map((c: any) => ({
        ...c,
        totalLeads: c.totalLeads ?? c.total_leads ?? 0,
        contactedLeads: c.contactedLeads ?? c.contacted_leads ?? 0,
        createdAt: c.createdAt ?? c.created_at ?? new Date().toISOString(),
      }));

      setCampaigns(normalized);
      setProducts(ps);
    } catch (e) {
      console.error("Failed to load campaigns/products", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createCampaign() {
    if (!newCampaign.name.trim()) return alert("Please enter a campaign name");
    if (!newCampaign.product_id) return alert("Please select a product");

    try {
      const me = await blink.auth.me();

      const plan = await planRestrictionService.canCreateCampaign(me.id);
      if (!plan.allowed) return alert(plan.message || "Campaign limit reached.");

      const created = await campaignService.create({
        userId: me.id,
        name: newCampaign.name,
        description: newCampaign.description,
        productId: newCampaign.product_id,
      });

      setCampaigns((p) => [
        {
          ...created,
          createdAt: new Date().toISOString(),
          totalLeads: 0,
          contactedLeads: 0,
          responses: 0,
          conversions: 0,
        },
        ...p,
      ]);

      setIsCreateDialogOpen(false);
      setNewCampaign({ name: "", description: "", product_id: "" });
      alert("Campaign created!");
    } catch (e: any) {
      console.error(e);
      alert(`Failed to create campaign: ${e?.message || "Unknown error"}`);
    }
  }

  function toggleStatus(id: string, status: string) {
    const next = status === "active" ? "paused" : "active";
    setCampaigns((p) => p.map((c) => (c.id === id ? { ...c, status: next } : c)));
    // NOTE: add blink.db.campaigns.update call if you persist status server-side
  }

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600 mt-1">Loading campaigns…</p>
          </div>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
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
              <DialogDescription>Give your campaign a name and pick a product.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  placeholder="Q4 Outreach"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={newCampaign.product_id}
                  onValueChange={(v) => setNewCampaign((p) => ({ ...p, product_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length ? (
                      products.map((prd) => (
                        <SelectItem key={prd.id} value={prd.id}>
                          {prd.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No products yet
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your campaign goals…"
                value={newCampaign.description}
                onChange={(e) =>
                  setNewCampaign((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createCampaign} disabled={!newCampaign.name || !newCampaign.product_id}>
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            className="pl-10"
            placeholder="Search campaigns…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Grid */}
      <div className="grid gap-6">
        {filtered.map((c) => (
          <Card key={c.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex items-center justify-between space-y-0 pb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">{c.name}</CardTitle>
                  <Badge variant={c.status === "active" ? "default" : c.status === "paused" ? "outline" : "secondary"}>
                    {c.status ?? "draft"}
                  </Badge>
                </div>
                <CardDescription className="mt-1">{c.description || "No description provided"}</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleStatus(c.id, c.status)}>
                    {c.status === "active" ? (
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
                <Stat icon={<Users className="w-5 h-5 text-blue-600" />} label="Total Leads" value={c.totalLeads} badgeClass="bg-blue-100" />
                <Stat icon={<Mail className="w-5 h-5 text-green-600" />} label="Contacted" value={c.contactedLeads} badgeClass="bg-green-100" />
                <Stat icon={<MessageSquare className="w-5 h-5 text-amber-600" />} label="Responses" value={c.responses} badgeClass="bg-amber-100" />
                <Stat icon={<BarChart3 className="w-5 h-5 text-purple-600" />} label="Conversions" value={c.conversions} badgeClass="bg-purple-100" />
              </div>
              <div className="mt-4 pt-4 border-t text-sm text-gray-600 flex justify-between">
                <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                <span className="text-indigo-600 font-medium">
                  {c.totalLeads > 0 ? `${((c.responses / c.totalLeads) * 100).toFixed(1)}% response rate` : "No data yet"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  badgeClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  badgeClass: string;
}) {
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center w-10 h-10 rounded-full mb-2 mx-auto ${badgeClass}`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{(value ?? 0).toLocaleString()}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
