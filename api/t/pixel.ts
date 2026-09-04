/**
 * GET /api/t/pixel — open-tracking pixel (1x1 transparent GIF).
 *
 * Embedded in every lifecycle email. Logs an 'open' event to the Email
 * Events Airtable table. The Airtable write is AWAITED before responding:
 * fire-and-forget promises are torn down when a Vercel serverless function
 * returns, which silently dropped open events.
 *
 * Query: ?e=<b64url email>&c=<campaign key>&s=<send id>
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dec } from '../email/_lib/lifecycle.js';
import { logEvent } from '../email/_lib/airtable.js';

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = dec(String(req.query.e || '')).toLowerCase();
  const campaign = String(req.query.c || '');
  const sendId = String(req.query.s || '');

  if (email.includes('@') && campaign) {
    try {
      await logEvent({ email, campaign, type: 'open', sendId });
    } catch (err) {
      console.error('[Pixel] open event failed:', err);
    }
  }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).send(PIXEL);
}
