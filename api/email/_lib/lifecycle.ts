/**
 * Lifecycle policy: promo code, scheduling, UTM scheme and tracked-URL
 * builders for the InterviewReady email program.
 *
 * UTM scheme (master plan §5.2): every marketing CTA carries exactly ONE
 * tracked link to appinterviewready.top with
 *   utm_source=email&utm_medium=email&utm_campaign=<welcome|drip-N>
 */

import { baseUrl } from './airtable.js';

export const PROMO_CODE = 'LINKEDIN20';
export const PROMO_CREDITS = 20; // Tier-1 code; 20 free AI credits at signup
export const SITE_URL = process.env.APP_URL?.replace(/\/+$/, '') || 'https://appinterviewready.top';

/**
 * Drip cadence: welcome is immediate on capture (day 0); drips follow at 1-2
 * per week → +4, +7, +11, +14, +18 days (5 emails across ~2.5 weeks).
 */
export const DRIP_DAY_OFFSETS: Record<string, number> = {
  welcome: 0,
  'drip-1': 4,
  'drip-2': 7,
  'drip-3': 11,
  'drip-4': 14,
  'drip-5': 18,
};

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** base64url-encode a value so plain emails aren't readable in query strings. */
function enc(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

export function dec(value: string): string {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

export function utmParams(campaignKey: string, content?: string): string {
  const params = [
    'utm_source=email',
    'utm_medium=email',
    `utm_campaign=${encodeURIComponent(campaignKey)}`,
  ];
  if (content) params.push(`utm_content=${encodeURIComponent(content)}`);
  return params.join('&');
}

/**
 * The FINAL destination a click should land on (single UTM-tagged link per
 * email, per master plan §4 CTA rules). `path` defaults to the site root so
 * coder-bot can later point a campaign at a dedicated signup/score route
 * without touching copy.
 */
export function destinationUrl(campaignKey: string, path: string, content?: string): string {
  const promo =
    campaignKey === 'welcome'
      ? `${path.includes('?') ? '&' : '?'}promo=${PROMO_CODE}`
      : '';
  return `${SITE_URL}${path}${promo}${path.includes('?') ? '&' : '?'}${utmParams(campaignKey, content)}`;
}

/** Click-through link: logs the click, then 302s to the UTM destination. */
export function clickUrl(email: string, campaignKey: string, destination: string): string {
  const q = new URLSearchParams({
    e: enc(email.toLowerCase()),
    c: campaignKey,
    u: enc(destination),
  });
  return `${SITE_URL}/api/t/click?${q.toString()}`;
}

/** Open-tracking pixel (1x1 gif). s = send id for de-duping at reporting. */
export function pixelUrl(email: string, campaignKey: string, sendId: string): string {
  const q = new URLSearchParams({ e: enc(email.toLowerCase()), c: campaignKey, s: sendId });
  return `${SITE_URL}/api/t/pixel?${q.toString()}`;
}

/** One-click unsubscribe link (footer only, never the marketing CTA). */
export function unsubscribeUrl(email: string): string {
  const q = new URLSearchParams({ e: enc(email.toLowerCase()) });
  return `${SITE_URL}/api/t/unsub?${q.toString()}`;
}

/** Airtable base id (exposed for the table-creation script/docs). */
export { baseUrl };
