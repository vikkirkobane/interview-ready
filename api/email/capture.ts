/**
 * POST /api/email/capture — THE capture trigger for the LinkedIn funnel.
 *
 * coder-bot's landing-page capture handler calls this (server-side, right
 * after the visitor submits the email form, alongside firing the
 * `email_captured` analytics event). It:
 *   1. upserts the subscriber in Airtable,
 *   2. sends the welcome email IMMEDIATELY (lead magnet + LINKEDIN20),
 *   3. schedules drip-1 for +4 days (tick.ts sends the rest).
 *
 * Idempotent: a second capture for the same email never re-sends the welcome.
 *
 * Body: { email: string, name?: string, source?: string, utm_campaign?: string }
 * Response: { success, existed, welcomeSent, status }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { renderCampaign } from './_lib/content.js';
import { sendMail } from './_lib/mail.js';
import {
  findSubscriberByEmail,
  atCreateRecord,
  atPatchRecord,
  logEvent,
  statusOrder,
  subscribersTable,
  type SubscriberStatus,
} from './_lib/airtable.js';
import { daysFromNow, DRIP_DAY_OFFSETS, PROMO_CODE } from './_lib/lifecycle.js';

/** RFC-ish recipient validation (was shared with the Spaceship lib). */
export function isValidRecipientEmail(raw: unknown): boolean {
  const s = String(raw ?? '')
    .replace(/[\r\n\t\0\x0B\x0C]/g, '')
    .trim()
    .toLowerCase();
  if (s.length < 5 || s.length > 254) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(s))
    return false;
  const [local, domain] = s.split('@');
  if (local.length > 64 || !domain.includes('.')) return false;
  const blocked = ['<script', 'javascript:', 'data:', 'vbscript:', 'onclick', 'onerror'];
  return !blocked.some((p) => s.includes(p));
}

const rateLimitMap = new Map<string, number[]>();
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return true;
  hits.push(now);
  rateLimitMap.set(key, hits);
  return false;
}

function deriveFirstName(name: string | undefined, email: string): string {
  const fromName = (name || '').trim().split(/\s+/)[0];
  if (fromName) return fromName.replace(/[^A-Za-z0-9]/g, '').slice(0, 20) || 'there';
  const local = (email.split('@')[0] || '').replace(/[^A-Za-z]/g, '').slice(0, 12);
  if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  return 'there';
}

export const maxDuration = 30;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip, 10, 60000)) {
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  }

  try {
    const body = (req.body || {}) as { email?: string; name?: string; source?: string; utm_campaign?: string };
    const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!isValidRecipientEmail(rawEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const first = deriveFirstName(body.name, rawEmail);
    const source = (body.source || 'linkedin').slice(0, 60);
    const utm = (body.utm_campaign || '').slice(0, 120);

    let existing = await findSubscriberByEmail(rawEmail);
    if (existing) {
      const st: string = existing.fields.Status || 'new';
      if (['unsubscribed', 'signed_up', 'done'].includes(st)) {
        return res.status(200).json({
          success: true,
          existed: true,
          welcomeSent: false,
          status: st,
          message: 'Email already on the list; no further sends.',
        });
      }
      if (statusOrder(st as SubscriberStatus) >= statusOrder('welcome_sent')) {
        return res.status(200).json({
          success: true,
          existed: true,
          welcomeSent: false,
          status: st,
          message: 'Welcome email already sent previously.',
        });
      }
      // Status 'new' = a previous welcome send failed; retry it now.
    } else {
      const created = await atCreateRecord(subscribersTable(), {
        Email: rawEmail,
        'First Name': first,
        Source: source,
        'UTM Campaign': utm,
        Promo: PROMO_CODE,
        Status: 'new',
        'Captured At': new Date().toISOString(),
      });
      existing = { id: created.id, email: rawEmail, fields: created.fields || {} };
    }

    // ---- Send welcome immediately ----
    const rendered = renderCampaign('welcome', {
      first,
      email: rawEmail,
      promo: PROMO_CODE,
      credits: 20,
    });
    let welcomeSent = false;
    let status: SubscriberStatus = 'new';
    if (rendered) {
      const result = await sendMail({
        to: rawEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
      if (result.sent) {
        welcomeSent = true;
        status = 'welcome_sent';
        await atPatchRecord(subscribersTable(), existing!.id, {
          Status: 'welcome_sent',
          'Welcome At': new Date().toISOString(),
          'Next Due At': daysFromNow(DRIP_DAY_OFFSETS['drip-1']), // drip-1 at +4d
          'Send Errors': 0,
        });
        await logEvent({
          email: rawEmail,
          campaign: 'welcome',
          type: 'send',
          note: `capture trigger (${source})`,
        });
      } else {
        status = 'new';
        const errs = Number(existing!.fields['Send Errors'] || 0) + 1;
        await atPatchRecord(subscribersTable(), existing!.id, {
          Status: 'new',
          'Send Errors': errs,
          'Next Due At': daysFromNow(1), // retry via drip tick tomorrow
        });
        await logEvent({
          email: rawEmail,
          campaign: 'welcome',
          type: 'error',
          note: result.error?.slice(0, 300) || 'SMTP error',
        });
      }
    }

    return res.status(200).json({
      success: true,
      existed: true,
      email: rawEmail,
      welcomeSent,
      status,
      promo: PROMO_CODE,
      message: welcomeSent
        ? 'Welcome email sent — check your inbox for your ATS checklist and credits.'
        : 'Subscriber recorded; welcome email will retry shortly.',
    });
  } catch (err: any) {
    console.error('[Email Capture] error:', err?.message || err);
    return res.status(500).json({ error: 'Capture service error. Please try again.' });
  }
}
