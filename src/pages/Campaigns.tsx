// src/pages/Campaigns.tsx
import React, { useEffect, useMemo, useState } from "react";
import campaignsService from "@/services/campaigns";
import { blink } from "@/blink/client";

import {
  Plus, Search, Filter, MoreHorizontal, Play, Pause, BarChart3, Users, Mail, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Campaign = {
  id: string;
  userId?: string;
  productId?: string | null;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: string;
  // derived / stats
  totalLeads: number;
  contactedLeads: number;
  responses: number;
  conversions: number;
};

type Product = { id: string; name: string };

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "", product_id: "" });

  // --- initial load: list campaigns + products
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const me = await blink.auth.me().catch(() => null);

        // 1) Prefer serverless list (works even if client DB is hidden)
        const listViaApi = async (): Promise<Campaign[]> => {
          const res = await fetch("/api/campaigns?list=1").catch(() => null);
          if (!res || !res.ok) return [];
          const data = await res.json().catch(() => ({}));
          const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];
          return rows.map((r) => ({
            id: r?.id ?? r?.key ?? r?.uuid ?? r?.campaignId ?? r?.campaign_id ?? `camp_${Date.now()}`,
            name: r?.name ?? "Untitled",
            description: r?.description ?? "",
            status: (r?.status as Campaign["status"]) || "draft",
            createdAt: r?.createdAt ?? r?.created_at ?? new Date().toISOString(),
            totalLeads: 0,
            contactedLeads: 0,
            responses: 0,
            conversions: 0,
          }));
        };

        // 2) Fallback to client DB service if needed
        const listViaClient = async (): Promise<Campaign[]> => {
          const rows = await campaignsService.list(me?.id);
          return (rows || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description ?? "",
            status: (r.status as Campaign["status"]) || "draft",
            createdAt: r.createdAt ?? new Date().toISOString(),
            totalLeads: 0,
            contactedLeads: 0,
            responses: 0,
            conversions: 0,
          }));
        };

        const [listRows, prodRows] = await Promise.all([
          listViaApi().then((rows) => rows.length ? rows : listViaClient()),
          ((blink as any).db?.products?.list?.({ where: me?.id ? { userId: me.id } : undefined, limit: 200 }) ?? [])
        ]);

        setCampaigns(listRows);
        setProducts((prodRows || []).map((p: any) => ({ id: p.id || p.key, name: p.name })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- stats after campaigns are loaded
  useEffect(() => {
    if (!campaigns.length) return;
    (async () => {
      try {
        setLoadingStats(true);
        const ids = campaigns.map((c) => c.id).filter(Boolean);
        const res = await fetch(`/api/campaigns?stats=1&ids=${encodeURIComponent(ids.join(","))}`).catch(() => null);
        if (!res || !res.ok) return;
        const data = await res.json().catch(() => ({}));
        const counts = data?.counts || {};
        // counts should look like { [campaignId]: { total, contacted, responses, conversions } }
        setCampaigns((prev) =>
          prev.map((c) => {
            const s = counts[c.id] || {};
            return {
              ...c,
              totalLeads: Number(s.total ?? s.totalLeads ?? 0),
              contactedLeads: Number(s.contacted ?? s.contactedLeads ?? 0),
              responses: Number(s.responses ?? 0),
              conversions: Number(s.conversions ?? 0),
            };
          })
        );
      } finally {
        setLoadingStats(false);
      }
    })();
  }, [campaigns.length]);

  const createCampaign = async () => {
    if (!newCampaign.name.trim()) return alert("Enter a name");
    if (!newCampaign.product_id) return alert("Pick a product");
    const me = await blink.auth.me();

    const created: any = await campaignsService.create({
      userId: me.id,
      name: newCampaign.name.trim(),
      description: newCampaign.description.trim(),
      productId: newCampaign.product_id,
    });

    const newRow: Campaign = {
      id: created.id,
      name: created.name,
      description: created.description ?? "",
      status: created.status || "draft",
      createdAt: created.createdAt || new Date().toISOString(),
      totalLeads: 0,
      contactedLeads: 0,
      responses: 0,
      conversions: 0,
    };

    setCampaigns((prev) => [newRow, ...prev.filter((c) => c.id !== created.id)]);
    setIsCreateDialogOpen(false);
    setNewCampaign({ name: "", description: "", product_id: "" });

    // kick a stats refresh for the single new id
    try {
      const res = await fetch(`/api/campaigns?stats=1&ids=${encodeURIComponent(created.id)}`);
      const data = await res.json().catch(() => ({}));
      const s = data?.counts?.[created.id] || {};
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === created.id
            ? {
                ...c,
                totalLeads: Number(s.total ?? 0),
                contactedLeads: Number(s.contacted ?? 0),
                responses: Number(s.responses ?? 0),
                conversions: Number(s.conversions ?? 0),
              }
            : c
        )
      );
    } catch {}
  };

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [campaigns, searchTerm]
  );

  const toggleStatus = (id: string, status: Campaign["status"]) => {
    const next = status === "active" ? "paused" : "active";
    setCampaigns((p) => p.map((c) => (c.id === id ? { ...c, status: next } : c)));
    // (optional) call a serverless endpoint to persist status if you need
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: any }> = {
      draft: { label: "Draft", variant: "secondary" },
      active: { label: "Active", variant: "default" },
      paused: { label: "Paused", variant: "outline" },
      completed: { label: "Completed", variant: "destructive" },
    };
    const cfg = map[status] || map.draft;
    return <Badge variant={cfg.variant as any}>{cfg.label}</Badge>;
  };

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
              <DialogDescription>Link a product, then create the campaign.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Q4 Outreach"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={newCampaign.product_id} onValueChange={(v) => setNewCampaign((p) => ({ ...p, product_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.length ? (
                        products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                      ) : (
                        <SelectItem value="no" disabled>No products found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe goals and target…"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={createCampaign} disabled={!newCampaign.name || !newCampaign.product_id}>Create Campaign</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input className="pl-10" placeholder="Search campaigns…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Button variant="outline" disabled={loadingStats} onClick={() => {
          // manual refresh stats
          setCampaigns((prev) => [...prev]); // trigger effect by changing length? do a direct call:
          (async () => {
            try {
              setLoadingStats(true);
              const ids = campaigns.map((c) => c.id).filter(Boolean);
              const res = await fetch(`/api/campaigns?stats=1&ids=${encodeURIComponent(ids.join(","))}`);
              const data = await res.json().catch(() => ({}));
              const counts = data?.counts || {};
              setCampaigns((prev) =>
                prev.map((c) => {
                  const s = counts[c.id] || {};
                  return {
                    ...c,
                    totalLeads: Number(s.total ?? 0),
                    contactedLeads: Number(s.contacted ?? 0),
                    responses: Number(s.responses ?? 0),
                    conversions: Number(s.conversions ?? 0),
                  };
                })
              );
            } finally {
              setLoadingStats(false);
            }
          })();
        }}>
          <Filter className="w-4 h-4 mr-2" />
          {loadingStats ? "Refreshing…" : "Refresh counts"}
        </Button>
      </div>

      {/* Grid */}
      <div className="grid gap-6">
        {filtered.map((c) => (
          <Card key={c.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">{c.name}</CardTitle>
                  {getStatusBadge(c.status)}
                </div>
                <CardDescription className="mt-1">{c.description || "No description"}</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleStatus(c.id, c.status)}>
                    {c.status === "active" ? (<><Pause className="w-4 h-4 mr-2" />Pause</>) : (<><Play className="w-4 h-4 mr-2" />Launch</>)}
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
                <Stat icon={<Users className="w-5 h-5 text-blue-600" />} label="Total Leads" value={c.totalLeads} bg="bg-blue-100" />
                <Stat icon={<Mail className="w-5 h-5 text-green-600" />} label="Contacted" value={c.contactedLeads} bg="bg-green-100" />
                <Stat icon={<MessageSquare className="w-5 h-5 text-amber-600" />} label="Responses" value={c.responses} bg="bg-amber-100" />
                <Stat icon={<BarChart3 className="w-5 h-5 text-purple-600" />} label="Conversions" value={c.conversions} bg="bg-purple-100" />
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

function Stat({ icon, label, value, bg }: any) {
  return (
    <div className="text-center">
      <div className={`flex items-center justify-center w-10 h-10 ${bg} rounded-full mb-2 mx-auto`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{Number(value || 0).toLocaleString()}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}
