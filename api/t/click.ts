/**
 * GET /api/t/click — click tracker: logs the click then 302s to the
 * UTM-tagged destination.
 *
 * Guard rails:
 *  - destination must decode and share the appinterviewready.top origin
 *    (no open redirect).
 *  - logging is fire-and-forget so the redirect is never delayed.
 *
 * Query: ?e=<b64url email>&c=<campaign key>&u=<b64url destination url>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dec, SITE_URL } from '../email/_lib/lifecycle.js';
import { logEvent } from '../email/_lib/airtable.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = dec(String(req.query.e || '')).toLowerCase();
  const campaign = String(req.query.c || '');
  const destination = dec(String(req.query.u || ''));

  if (destination) {
    try {
      const destOrigin = new URL(destination).origin;
      const allowed = new URL(SITE_URL).origin;
      if (destOrigin === allowed) {
        // AWAITED (not fire-and-forget): the Airtable write must land before
        // the function returns or the redirect tears the promise down.
        try {
          await logEvent({ email, campaign, type: 'click', url: destination.slice(0, 500) });
        } catch (err) {
          console.error('[Click] event failed:', err);
        }
        res.setHeader('Cache-Control', 'no-store');
        return res.redirect(302, destination);
      }
    } catch {
      /* fall through to 400 */
    }
    return res.status(400).send('Invalid link destination.');
  }

  return res.status(400).send('Missing link parameters.');
}
