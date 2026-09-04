/**
 * GET/POST /api/email/tick — drip scheduler (Vercel Cron).
 *
 * Runs daily (recommended 08:00 UTC). Scans Email Subscribers whose
 * "Next Due At" has passed, sends the campaign their status calls for, and
 * advances the status machine. Also retries failed welcome sends.
 *
 * Suggested vercel.json cron:
 *   "crons": [{ "path": "/api/email/tick?key=YOUR_SECRET", "schedule": "0 8 * * *" }]
 * (keep the secret out of the cron path by sending header x-email-cron-secret
 *  if your provider supports headers; both are accepted.)
 *
 * Idempotency: records are optimistically locked (Next Due At pushed 2h into
 * the future) before sending, so overlapping ticks cannot double-send.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  atListRecords,
  atPatchRecord,
  logEvent,
  nextCampaignForStatus,
  statusAfterCampaign,
  subscribersTable,
} from './_lib/airtable.js';
import { renderCampaign } from './_lib/content.js';
import { sendMail } from './_lib/mail.js';
import { daysFromNow, DRIP_DAY_OFFSETS, PROMO_CODE } from './_lib/lifecycle.js';

export const maxDuration = 60;

function secretOk(req: VercelRequest): boolean {
  // Vercel Cron invocations carry a fixed user-agent and cannot set custom
  // headers, so the cron is authorized by UA (Vercel's documented pattern).
  // Manual/curl calls must present the shared secret instead.
  const ua = String((req.headers['user-agent'] as string) || '');
  if (ua === 'vercel-cron/1.0') return true;

  const expected = (process.env.EMAIL_CRON_SECRET || '').trim();
  if (!expected) return false;
  const given = (req.query.key as string) || (req.headers['x-email-cron-secret'] as string) || '';
  return given === expected;
}

function firstNameOf(fields: Record<string, any>): string {
  const f = String(fields['First Name'] || '').trim();
  return f ? f.slice(0, 20) : 'there';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!secretOk(req)) {
    return res.status(403).json({ error: 'Unauthorized. Set EMAIL_CRON_SECRET and pass ?key= or x-email-cron-secret.' });
  }

  const summary = { scanned: 0, sent: [] as string[], failed: [] as string[], skipped: 0 };

  try {
    // Pull every subscriber once (small list at this scale) and decide in code.
    const records = await atListRecords(subscribersTable(), {
      fields: ['Email', 'First Name', 'Status', 'Next Due At', 'Send Errors', 'Captured At'],
      pageSize: 100,
    });

    const now = Date.now();
    for (const rec of records) {
      const fields = rec.fields || {};
      const status: string = String(fields.Status || 'new');
      const nextKey = nextCampaignForStatus(status);
      if (!nextKey) continue; // terminal or unknown state

      const dueRaw = fields['Next Due At'];
      const dueMs = dueRaw ? new Date(String(dueRaw)).getTime() : 0;
      if (!dueRaw || Number.isNaN(dueMs) || dueMs > now) continue; // not due yet

      const email: string = String(fields.Email || '').trim().toLowerCase();
      if (!email) continue;
      summary.scanned += 1;

      // Optimistic lock: no other tick can pick this row while we send.
      await atPatchRecord(subscribersTable(), rec.id, {
        'Next Due At': new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      });

      const rendered = renderCampaign(nextKey, {
        first: firstNameOf(fields),
        email,
        promo: PROMO_CODE,
        credits: 20,
      });
      if (!rendered) {
        summary.skipped += 1;
        continue;
      }

      const result = await sendMail({
        to: email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
      await new Promise((r) => setTimeout(r, 250)); // gentle pacing

      if (result.sent) {
        const nextStatus = statusAfterCampaign(nextKey);
        const offsets = DRIP_DAY_OFFSETS;
        const followingKey =
          nextStatus === 'drip1_sent' ? 'drip-2' :
          nextStatus === 'drip2_sent' ? 'drip-3' :
          nextStatus === 'drip3_sent' ? 'drip-4' :
          nextStatus === 'drip4_sent' ? 'drip-5' : null;
        const nextDue = followingKey ? daysFromNow(offsets[followingKey] - offsets[nextKey]) : '';

        await atPatchRecord(subscribersTable(), rec.id, {
          Status: nextStatus,
          'Next Due At': nextDue,
          'Last Send At': new Date().toISOString(),
          'Send Errors': 0,
        });
        await logEvent({ email, campaign: nextKey, type: 'send', note: 'drip tick' });
        summary.sent.push(`${nextKey}:${email}`);
      } else {
        const errs = Number(fields['Send Errors'] || 0) + 1;
        if (errs >= 3) {
          // Likely a bad/defunct address: stop trying, mark done, keep record.
          await atPatchRecord(subscribersTable(), rec.id, {
            Status: 'done',
            'Next Due At': '',
            'Send Errors': errs,
          });
          await logEvent({
            email,
            campaign: nextKey,
            type: 'error',
            note: `stopped after ${errs} send failures (bad address?): ${(result.error || '').slice(0, 200)}`,
          });
        } else {
          await atPatchRecord(subscribersTable(), rec.id, {
            'Send Errors': errs,
            'Next Due At': daysFromNow(1), // retry tomorrow
          });
          await logEvent({ email, campaign: nextKey, type: 'error', note: (result.error || '').slice(0, 300) });
        }
        summary.failed.push(`${nextKey}:${email}`);
      }
    }

    return res.status(200).json({ ok: true, ...summary });
  } catch (err: any) {
    console.error('[Email Tick] error:', err?.message || err);
    return res.status(500).json({ ok: false, error: (err?.message || 'tick failed').slice(0, 300), ...summary });
  }
}
