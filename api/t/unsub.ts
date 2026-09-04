/**
 * GET /api/t/unsub — one-click unsubscribe (footer of every email).
 *
 * Marks the subscriber Status='unsubscribed' (stops all future sends),
 * logs the event, then redirects to the site with ?unsubscribed=1.
 *
 * Query: ?e=<b64url email>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dec, SITE_URL } from '../email/_lib/lifecycle.js';
import { findSubscriberByEmail, atPatchRecord, logEvent, subscribersTable } from '../email/_lib/airtable.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = dec(String(req.query.e || '')).toLowerCase();

  if (email.includes('@')) {
    try {
      const sub = await findSubscriberByEmail(email);
      if (sub && sub.fields.Status !== 'unsubscribed') {
        await atPatchRecord(subscribersTable(), sub.id, {
          Status: 'unsubscribed',
          'Unsubscribed At': new Date().toISOString(),
          'Next Due At': '',
        });
      }
      await logEvent({ email, type: 'unsubscribe' });
    } catch (err) {
      console.error('[Unsub] failed to record:', err);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, `${SITE_URL}/?unsubscribed=1`);
}
