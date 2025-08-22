// src/pages/LeadsDatabase.tsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// OPTIONAL: use your campaigns service if present
// Safe to keep — code checks for existence at runtime.
let campaignsService: any = undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  campaignsService = require("@/services/campaigns");
  campaignsService = campaignsService?.campaignsService || campaignsService?.default || campaignsService;
} catch { /* optional */ }

/** UI Lead shape */
type Lead = {
  id: string;
  companyName: string;
  industry: string;
  companySize: string;
  revenueRange: string;
  location: string;
  website: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  linkedinUrl: string;
  leadScore: number;
  dataSource: string;

  pdlEnriched?: boolean;
  pdlEnrichmentScore?: number;
  pdlExperienceSummary?: string;
  pdlSkills?: string[];
  pdlInterests?: string[];
  pdlEducationSummary?: string;
  pdlSocialProfiles?: Array<{ network: string; url: string }>;
};

type CampaignLite = { id: string; name: string };

/** Fallback sample list used ONLY if the API returns nothing */
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
];

/** ---- helpers to map your API objects into UI leads ---- */
const toStr = (v: any) => (v === undefined || v === null ? "" : String(v));
const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

function mapApiItemToLead(item: any): Lead {
  const raw = item?.raw ?? {};

  const first = raw.first_name || raw.person_first_name || "";
  const last = raw.last_name || raw.person_last_name || "";
  const fullName = (item.full_name || `${first} ${last}`).trim();

  const companyName =
    item.company_name || raw.company_name || raw.person_company_name || "Unknown Company";

  const industry = raw.company_industry || item.industry || "Unknown";
  const companySize =
    raw.company_size || raw.company_size_range || item.company_size || "";
  const revenue = raw.company_revenue || raw.company_revenue_range || item.company_revenue || "";

  const city = raw.person_city || raw.company_city || "";
  const country = raw.person_country || raw.company_country || "";
  const location = [city, country].filter(Boolean).join(", ");

  const domain = item.domain || raw.company_domain || raw.website || raw.company_website || "";
  const website = domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : "";

  const title = item.title || raw.person_job_title || raw.person_headline || "";
  const phone = raw.person_phone || "";
  const linkedin = item.linkedin || raw.person_linkedin_url || "";

  const leadScore = Number(item.score ?? 0);

  return {
    id: item.key || (typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random())),
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
  };
}

function tryParseArray(v: any): string[] | any[] | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export default function LeadsDatabase() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Campaign dialog state
  const [campaignsOpen, setCampaignsOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignLite[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [addingToCampaign, setAddingToCampaign] = useState(false);

  // Load real leads
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/leads?limit=50");
        if (!res.ok) throw new Error(`GET /api/leads -> ${res.status}`);
        const json = await res.json();
        const items: any[] = json?.items || [];

        const mapped = items.map(mapApiItemToLead).sort((a, b) => b.leadScore - a.leadScore);

        if (mapped.length === 0) {
          setLeads(sampleLeads);
          setFilteredLeads(sampleLeads);
        } else {
          setLeads(mapped);
          setFilteredLeads(mapped);
        }
      } catch (e: any) {
        console.error(e);
        setErr("Failed to load leads from API. Showing sample data.");
        setLeads(sampleLeads);
        setFilteredLeads(sampleLeads);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Derived filters
  const uniqueIndustries = useMemo(
    () => [...new Set(leads.map((l) => l.industry).filter(Boolean))].sort(),
    [leads]
  );
  const uniqueSizes = useMemo(
    () => [...new Set(leads.map((l) => l.companySize).filter(Boolean))].sort(),
    [leads]
  );

  // Filter as user types / selects
  useEffect(() => {
    let data = [...leads];

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (l) =>
          l.companyName.toLowerCase().includes(q) ||
          l.contactName.toLowerCase().includes(q) ||
          l.industry.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q)
      );
    }

    if (industryFilter !== "all") data = data.filter((l) => l.industry === industryFilter);
    if (sizeFilter !== "all") data = data.filter((l) => l.companySize === sizeFilter);

    setFilteredLeads(data);
  }, [leads, search, industryFilter, sizeFilter]);

  const toggleAll = () => {
    setSelected((prev) =>
      prev.length === filteredLeads.length ? [] : filteredLeads.map((l) => l.id)
    );
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const scorePill = (n: number) => {
    if (n >= 90) return <Badge className="bg-green-100 text-green-800">Hot</Badge>;
    if (n >= 75) return <Badge className="bg-amber-100 text-amber-800">Warm</Badge>;
    return <Badge className="bg-gray-100 text-gray-800">Cold</Badge>;
  };

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
    ];
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
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // -------- Campaign wiring --------
  const openCampaignsDialog = (ids?: string[]) => {
    if (ids && ids.length) setSelected(ids);
    setCampaignsOpen(true);
  };

  useEffect(() => {
    // lazy-load campaigns when dialog opens
    const load = async () => {
      if (!campaignsOpen) return;
      if (campaigns.length > 0) return;

      setCampaignLoading(true);
      try {
        let list: CampaignLite[] = [];

        if (campaignsService?.listCampaigns) {
          const res = await campaignsService.listCampaigns();
          list = (res || []).map((c: any) => ({
            id: c.id || c.campaignId || c.key,
            name: c.name || c.title || c.campaignName || "Untitled Campaign",
          }));
        } else {
          // generic REST fallback
          const r = await fetch("/api/campaigns");
          if (r.ok) {
            const j = await r.json();
            const arr = Array.isArray(j) ? j : j?.items || [];
            list = arr.map((c: any) => ({
              id: c.id || c.campaignId || c.key,
              name: c.name || c.title || c.campaignName || "Untitled Campaign",
            }));
          }
        }

        setCampaigns(list);
        if (!selectedCampaignId && list.length) setSelectedCampaignId(list[0].id);
      } catch (e) {
        console.warn("Failed to load campaigns", e);
      } finally {
        setCampaignLoading(false);
      }
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignsOpen]);

  const doAddToCampaign = async () => {
    const toAdd = filteredLeads.filter((l) => selected.includes(l.id));
    if (!selectedCampaignId || toAdd.length === 0) return;

    setAddingToCampaign(true);
    try {
      // payload you’ll persist / upsert, then associate
      const payload = toAdd.map((l) => ({
        id: l.id,
        company_name: l.companyName,
        industry: l.industry,
        company_size: l.companySize,
        revenue_range: l.revenueRange,
        location: l.location,
        website: l.website,
        contact_name: l.contactName,
        contact_title: l.contactTitle,
        contact_email: l.contactEmail,
        contact_phone: l.contactPhone,
        linkedin_url: l.linkedinUrl,
        lead_score: l.leadScore,
        data_source: l.dataSource || "database",
      }));

      if (campaignsService?.addLeadsToCampaign) {
        await campaignsService.addLeadsToCampaign(selectedCampaignId, payload);
      } else {
        const r = await fetch("/api/campaigns/add-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: selectedCampaignId, leads: payload }),
        });
        if (!r.ok) throw new Error(`POST /api/campaigns/add-leads -> ${r.status}`);
      }

      alert(`Added ${toAdd.length} lead${toAdd.length === 1 ? "" : "s"} to the campaign.`);
      setCampaignsOpen(false);
      setSelected([]);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to add leads to campaign.");
    } finally {
      setAddingToCampaign(false);
    }
  };

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
              exportCSV(filteredLeads, `svara_all_leads_${new Date().toISOString().slice(0, 10)}.csv`)
            }
            disabled={filteredLeads.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export All ({filteredLeads.length})
          </Button>

          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={selected.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export Selected ({selected.length})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Selected Leads</DialogTitle>
                <DialogDescription>
                  Export {selected.length} selected leads to CSV format.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setExportOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    exportCSV(
                      filteredLeads.filter((l) => selected.includes(l.id)),
                      `svara_selected_${new Date().toISOString().slice(0, 10)}.csv`
                    );
                    setExportOpen(false);
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
            onClick={() => openCampaignsDialog()}
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
                          <a
                            href={l.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-600"
                          >
                            {l.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{l.contactName}</div>
                      <div className="text-sm text-gray-500">{l.contactTitle}</div>
                      <div className="text-sm text-gray-500">{l.contactEmail}</div>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCampaignsDialog([l.id])}
                        className="text-indigo-600"
                      >
                        Add to Campaign
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
              {/* Basic info */}
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

              {/* Score / source */}
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
                        <div className="text-2xl font-bold text-purple-600">
                          {viewLead.pdlEnrichmentScore}
                        </div>
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

              {/* Optional enrichment sections */}
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
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => openCampaignsDialog([viewLead.id])}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Campaign
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Campaign dialog */}
      <Dialog open={campaignsOpen} onOpenChange={setCampaignsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {selected.length} lead{selected.length === 1 ? "" : "s"} to a campaign</DialogTitle>
            <DialogDescription>Select a campaign to attach the selected leads.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Campaign</label>
            <Select
              value={selectedCampaignId}
              onValueChange={(v) => setSelectedCampaignId(v)}
              disabled={campaignLoading || campaigns.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={campaignLoading ? "Loading..." : "Choose a campaign"} />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {campaigns.length === 0 && !campaignLoading && (
              <div className="text-xs text-gray-500">
                No campaigns found.{" "}
                <a href="/campaigns" className="text-indigo-600 hover:text-indigo-800 underline">
                  Create one
                </a>{" "}
                and come back.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCampaignsOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedCampaignId || addingToCampaign || selected.length === 0}
              onClick={doAddToCampaign}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {addingToCampaign ? "Adding…" : "Add to Campaign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-500">{label}</label>
      <div className="text-sm">{children}</div>
    </div>
  );
}
