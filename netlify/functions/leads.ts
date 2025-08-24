import type { Handler } from '@netlify/functions';
import { blink } from './_blink';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const send = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

// Find a leads-like table on the server DB
function findLeadsTableKey(db: any): string | null {
  const keys = Object.keys(db || {});
  const preferred = [
    'Leads', 'leads', 'lead', 'contacts', 'prospects', 'people',
    'persons', 'records', 'leadDatabase', 'realLeadDatabase', 'realLeads',
  ];
  for (const k of preferred) {
    if (typeof db?.[k]?.list === 'function') return k;
  }
  return keys.find(k => /lead|contact|prospect|people|person|record/i.test(k) &&
                         typeof db?.[k]?.list === 'function') ?? null;
}

// Normalize both shapes: [{...}] or [{ key, value }]
const norm = (row: any) => {
  const v = row?.value ?? row;
  const name =
    v?.name ?? v?.fullName ?? v?.full_name ??
    [v?.firstName, v?.lastName].filter(Boolean).join(' ') || null;

  return {
    id: v?.id ?? v?.key ?? row?.key ?? v?._id ?? v?.uuid ?? null,
    company:
      v?.company ?? v?.companyName ?? v?.org ?? v?.business ?? v?.domain ?? null,
    name,
    email:
      v?.email ?? v?.workEmail ?? v?.businessEmail ??
      v?.work_email ?? v?.business_email ?? null,
    industry: v?.industry ?? v?.vertical ?? null,
    size: v?.size ?? v?.companySize ?? v?.employees ?? null,
    revenue: v?.revenue ?? v?.annualRevenue ?? null,
    location: v?.location ?? v?.city ?? v?.region ?? v?.state ?? null,
    score: v?.score ?? v?.fit ?? 0,
    raw: row,
  };
};

export const handler: Handler = async (event) => {
  const db: any = (blink as any)?.db;
  const debug = 'debug' in (event.queryStringParameters ?? {});

  if (!db) return send(200, { ok: false, rows: [], reason: 'db-unavailable' });

  // quick debug endpoint
  if (debug) {
    return send(200, {
      ok: true,
      matchedFn: 'leads',
      hasDb: !!db,
      keys: Object.keys(db || {}),
    });
  }

  const leadsKey = findLeadsTableKey(db);
  if (!leadsKey) return send(200, { ok: true, rows: [], table: null });

  const limit = Math.min(
    parseInt(event.queryStringParameters?.limit || '50', 10) || 50,
    200
  );

  // Some stores return { items: [...] }, some return [...]
  const raw = (await db[leadsKey].list?.({ limit })) ?? [];
  const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];

  return send(200, { ok: true, rows: items.map(norm), table: leadsKey });
};
