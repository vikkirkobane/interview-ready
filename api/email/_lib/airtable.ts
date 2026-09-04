/**
 * Airtable helpers for the InterviewReady email lifecycle.
 *
 * Two tables back the lifecycle (created by scripts/ensure-email-tables or the
 * Airtable UI — see docs/EMAIL_LIFECYCLE.md for the exact schema):
 *
 *   1. "Email Subscribers" — one row per captured email.
 *   2. "Email Events"     — one row per open / click / send / unsubscribe.
 *
 * Env:
 *   AIRTABLE_API_KEY                 (already used by the rest of the app)
 *   AIRTABLE_BASE_ID                 (already used by the rest of the app)
 *   AIRTABLE_SUBSCRIBERS_TABLE       optional, default "Email Subscribers"
 *   AIRTABLE_EVENTS_TABLE            optional, default "Email Events"
 */

const AIRTABLE_API = 'https://api.airtable.com/v0';

function env(name: string, fallback = ''): string {
  return (process.env[name] || fallback).trim().replace(/['"]/g, '');
}

export function subscribersTable(): string {
  return env('AIRTABLE_SUBSCRIBERS_TABLE', 'Email Subscribers');
}

export function eventsTable(): string {
  return env('AIRTABLE_EVENTS_TABLE', 'Email Events');
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${env('AIRTABLE_API_KEY')}`,
    'Content-Type': 'application/json',
  };
}

export function baseUrl(): string {
  return env('AIRTABLE_BASE_ID');
}

async function airtableFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${AIRTABLE_API}/${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* ignore */
    }
    throw new Error(`Airtable ${init?.method || 'GET'} ${path} failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/** Airtable REST helpers (base table, not /meta). */
export async function atListRecords(
  table: string,
  opts: { filterByFormula?: string; pageSize?: number; fields?: string[] } = {}
): Promise<any[]> {
  const params = new URLSearchParams();
  if (opts.filterByFormula) params.set('filterByFormula', opts.filterByFormula);
  if (opts.pageSize) params.set('pageSize', String(Math.min(opts.pageSize, 100)));
  // Airtable's list endpoint rejects a single comma-joined `fields` value
  // (422); it requires one repeated `fields[]=<name>` param per field.
  if (opts.fields?.length) opts.fields.forEach((f) => params.append('fields[]', f));
  const qs = params.toString();

  const out: any[] = [];
  let offset: string | undefined;
  do {
    const data = await airtableFetch(
      `${baseUrl()}/${encodeURIComponent(table)}?${qs}${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`
    );
    out.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return out;
}

export async function atCreateRecord(table: string, fields: Record<string, unknown>): Promise<any> {
  return airtableFetch(`${baseUrl()}/${encodeURIComponent(table)}`, {
    method: 'POST',
    body: JSON.stringify({ fields, typecast: true }),
  });
}

export async function atPatchRecord(table: string, recordId: string, fields: Record<string, unknown>): Promise<any> {
  return airtableFetch(`${baseUrl()}/${encodeURIComponent(table)}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields, typecast: true }),
  });
}

/* ------------------------------------------------------------------ */
/* Subscriber domain helpers                                           */
/* ------------------------------------------------------------------ */

export type SubscriberStatus =
  | 'new' // captured; welcome not yet confirmed sent
  | 'welcome_sent'
  | 'drip1_sent'
  | 'drip2_sent'
  | 'drip3_sent'
  | 'drip4_sent'
  | 'drip5_sent'
  | 'done' // full drip finished
  | 'signed_up' // user signed up in-app: stop all sends
  | 'unsubscribed';

export interface Subscriber {
  id: string;
  email: string;
  fields: Record<string, any>;
}

export function statusOrder(s: SubscriberStatus): number {
  const order: SubscriberStatus[] = [
    'new',
    'welcome_sent',
    'drip1_sent',
    'drip2_sent',
    'drip3_sent',
    'drip4_sent',
    'drip5_sent',
    'done',
  ];
  const i = order.indexOf(s);
  return i === -1 ? -1 : i;
}

/** Campaign key that should fire for a subscriber in the given status, or null. */
export function nextCampaignForStatus(status: string): string | null {
  const map: Record<string, string> = {
    new: 'welcome',
    welcome_sent: 'drip-1',
    drip1_sent: 'drip-2',
    drip2_sent: 'drip-3',
    drip3_sent: 'drip-4',
    drip4_sent: 'drip-5',
  };
  return map[status] || null;
}

export function statusAfterCampaign(campaignKey: string): SubscriberStatus {
  const map: Record<string, SubscriberStatus> = {
    welcome: 'welcome_sent',
    'drip-1': 'drip1_sent',
    'drip-2': 'drip2_sent',
    'drip-3': 'drip3_sent',
    'drip-4': 'drip4_sent',
    'drip-5': 'drip5_sent',
  };
  return map[campaignKey] || 'done';
}

export async function findSubscriberByEmail(email: string): Promise<Subscriber | null> {
  const safe = email.toLowerCase().replace(/'/g, "\\'");
  const records = await atListRecords(subscribersTable(), {
    filterByFormula: `LOWER({Email})='${safe}'`,
    pageSize: 1,
  });
  return records.length ? { id: records[0].id, email: records[0].fields?.Email || email, fields: records[0].fields || {} } : null;
}

export async function logEvent(evt: {
  email: string;
  campaign?: string;
  type: 'send' | 'open' | 'click' | 'unsubscribe' | 'signed_up' | 'error';
  sendId?: string;
  url?: string;
  note?: string;
}): Promise<void> {
  // Fire-and-forget is a deliberate choice in callers: tracking must never
  // block a user redirect or an email send.
  try {
    await atCreateRecord(eventsTable(), {
      'Event ID': `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      Email: evt.email.toLowerCase(),
      Campaign: evt.campaign || '',
      Type: evt.type,
      'Send ID': evt.sendId || '',
      URL: evt.url || '',
      Note: evt.note || '',
      Timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[EmailEvents] failed to log event:', err);
  }
}
