// src/lib/useLeads.ts
import { useEffect, useState } from "react";
import { fetchLeads, Lead } from "./leadsApi";

export function useLeads(pageSize = 50) {
  const [items, setItems] = useState<Lead[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = async (next?: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const { items: batch, cursor: nextCursor } = await fetchLeads(pageSize, next ? cursor : undefined);
      setItems(prev => (next ? [...prev, ...batch] : batch));
      setCursor(nextCursor);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false); /* initial */ }, []);

  return {
    items,
    count: items.length,
    hasMore: !!cursor,
    loadMore: () => load(true),
    reload: () => load(false),
    loading,
    error,
  };
}
