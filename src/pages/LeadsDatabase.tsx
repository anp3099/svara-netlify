// src/pages/LeadsDatabase.tsx
import React, { useEffect, useMemo, useState } from "react";

type ApiLead = Record<string, any>;
type ApiResp = { items: ApiLead[]; cursor?: string; truncated?: boolean };

type Row = {
  company: string;
  website?: string;
  contact?: string;
  email?: string;
  industry?: string;
  size?: string;
  revenue?: string;
  location?: string;
  score?: number;
};

function mapLead(x: ApiLead): Row {
  // company / website
  const company =
    x.company_name ||
    x.company ||
    x.person_company_name ||
    x.company_meta_title ||
    "Unknown Company";

  const domain =
    x.domain ||
    x.company_domain ||
    (x.company_linkedin_url ? undefined : undefined);
  const website =
    x.company_url ||
    (domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : undefined);

  // contact & email & title
  const first = x.first_name || x.person_first_name;
  const last = x.last_name || x.person_last_name;
  const full = x.full_name || [first, last].filter(Boolean).join(" ").trim();

  const email =
    x.email ||
    x.person_business_email ||
    x.business_email ||
    x.professional_email ||
    undefined;

  // meta
  const industry = x.company_industry || x.industry || undefined;
  const size =
    x.company_size ||
    (x.company_size_min && x.company_size_max
      ? `${x.company_size_min}-${x.company_size_max}`
      : undefined);
  const revenue = x.company_revenue || undefined;

  const location =
    x.person_location ||
    [x.person_city, x.person_state || x.person_region, x.person_country]
      .filter(Boolean)
      .join(", ") ||
    [x.company_city, x.company_state || x.company_region, x.company_country]
      .filter(Boolean)
      .join(", ") ||
    undefined;

  return {
    company,
    website,
    contact: full || undefined,
    email,
    industry,
    size,
    revenue,
    location,
    score: typeof x.score === "number" ? x.score : undefined,
  };
}

export default function LeadsDatabase() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(undefined);
        const r = await fetch(`/api/leads?limit=50`, { credentials: "same-origin" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: ApiResp = await r.json();
        if (cancelled) return;
        setRows((j.items || []).map(mapLead));
        setCursor(j.cursor);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load leads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pagination (optional “Load more”)
  const loadMore = async () => {
    if (!cursor || loading) return;
    try {
      setLoading(true);
      const r = await fetch(`/api/leads?limit=50&cursor=${encodeURIComponent(cursor)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: ApiResp = await r.json();
      setRows((prev) => [...prev, ...((j.items || []).map(mapLead))]);
      setCursor(j.cursor);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load more");
    } finally {
      setLoading(false);
    }
  };

  const loadedCount = rows.length;

  // Render — replace this with your table component
  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Loaded Records</div>
          <div className="text-2xl font-semibold">{loadedCount}</div>
        </div>
        {error && <div className="text-red-600">Error: {error}</div>}
      </div>

      <div className="rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="p-3">Company</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Email</th>
              <th className="p-3">Industry</th>
              <th className="p-3">Size</th>
              <th className="p-3">Revenue</th>
              <th className="p-3">Location</th>
              <th className="p-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">
                  {r.website ? (
                    <a href={r.website} target="_blank" rel="noreferrer" className="text-primary underline">
                      {r.company}
                    </a>
                  ) : (
                    r.company
                  )}
                </td>
                <td className="p-3">{r.contact || "—"}</td>
                <td className="p-3">{r.email || "—"}</td>
                <td className="p-3">{r.industry || "—"}</td>
                <td className="p-3">{r.size || "—"}</td>
                <td className="p-3">{r.revenue || "—"}</td>
                <td className="p-3">{r.location || "—"}</td>
                <td className="p-3">{r.score ?? "—"}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  No leads yet — import or generate to see results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {cursor && (
        <div className="mt-4">
          <button className="btn" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
