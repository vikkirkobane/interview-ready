/**
 * POST /api/email/signed-up — stop the drip when a subscriber signs up.
 *
 * Called by the app/backend when a captured email completes signup (ideally
 * when LINKEDIN20 is redeemed). Sets Status='signed_up' so no further drip
 * emails are sent — a user who converted should never be sold the product
 * again. Logs an event so the weekly report can attribute drip→signup.
 *
 * Body: { email: string }
 * Auth: x-email-cron-secret header or ?key= (same as EMAIL_CRON_SECRET).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findSubscriberByEmail, atPatchRecord, logEvent, subscribersTable } from './_lib/airtable.js';

export const maxDuration = 30;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const expected = (process.env.EMAIL_CRON_SECRET || '').trim();
  const given = (req.query.key as string) || (req.headers['x-email-cron-secret'] as string) || '';
  if (expected && given !== expected) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  try {
    const email = String((req.body || {}).email || '').trim().toLowerCase();
    if (!email.includes('@')) return res.status(400).json({ error: 'Email required.' });

    const sub = await findSubscriberByEmail(email);
    if (!sub) {
      // Not an email-list member — nothing to stop. Not an error for the app.
      return res.status(200).json({ ok: true, found: false });
    }
    if (sub.fields.Status === 'signed_up') {
      return res.status(200).json({ ok: true, found: true, status: 'signed_up' });
    }

    await atPatchRecord(subscribersTable(), sub.id, {
      Status: 'signed_up',
      'Signed Up At': new Date().toISOString(),
      'Next Due At': '',
    });
    await logEvent({ email, type: 'signed_up', note: 'signup webhook (LINKEDIN20 funnel)' });

    return res.status(200).json({ ok: true, found: true, status: 'signed_up', dripStopped: true });
  } catch (err: any) {
    console.error('[Email SignedUp] error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Signed-up webhook failed.' });
  }
}
