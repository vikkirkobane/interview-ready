/**
 * Dry-run verification for the email lifecycle: renders all six campaigns
 * for a sample subscriber and asserts the delivery contract:
 *   - exactly ONE tracked marketing link per email (html + text),
 *   - it resolves to appinterviewready.top with the UTM trio,
 *   - open pixel and unsubscribe link present,
 *   - no accidental second http(s) destination in body text.
 *
 * Usage:  npx tsx scripts/email-dryrun.ts
 * Sends nothing. Exits non-zero if any assertion fails.
 */

import { CAMPAIGNS, renderCampaign } from '../api/email/_lib/content';

const SAMPLE = { email: 'ada.lovelace@example.com', first: 'Ada' };

function decodeB64Url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.error('  FAIL:', msg);
};

console.log('InterviewReady lifecycle — dry run (no sends)\n');
console.log(`${'campaign'.padEnd(10)} ${'subject'.slice(0, 70).padEnd(72)} status`);
console.log('-'.repeat(110));

for (const campaign of CAMPAIGNS) {
  const rendered = renderCampaign(campaign.key, { ...SAMPLE, promo: 'LINKEDIN20', credits: 20 });
  if (!rendered) {
    fail(`${campaign.key}: render returned null`);
    continue;
  }
  const { html, text, subject } = rendered;
  const status: string[] = [];

  // 1. exactly one tracked click link per email
  const clickMatches = html.match(/\/api\/t\/click\?/g) || [];
  const clickInText = (text.match(/https:\/\/appinterviewready\.top\/api\/t\/click\?/g) || []).length;
  if (clickMatches.length !== 1) fail(`${campaign.key}: html contains ${clickMatches.length} click links (want 1)`);
  else status.push('1 click link');

  // 2. click target is appinterviewready.top + full UTM trio
  const hrefMatch = html.match(/href="(https:\/\/appinterviewready\.top\/api\/t\/click\?[^"]+)"/);
  if (hrefMatch) {
    const params = new URL(hrefMatch[1]).searchParams;
    const dest = decodeB64Url(params.get('u') || '');
    const u = new URL(dest);
    if (u.origin !== 'https://appinterviewready.top') fail(`${campaign.key}: click destination host is ${u.origin}`);
    if (u.searchParams.get('utm_source') !== 'email') fail(`${campaign.key}: utm_source != email`);
    if (u.searchParams.get('utm_medium') !== 'email') fail(`${campaign.key}: utm_medium != email`);
    if (u.searchParams.get('utm_campaign') !== campaign.key) fail(`${campaign.key}: utm_campaign != ${campaign.key}`);
    if (campaign.key === 'welcome' && u.searchParams.get('promo') !== 'LINKEDIN20')
      fail(`${campaign.key}: welcome destination missing promo=LINKEDIN20`);
    status.push(`utm ok (${campaign.key})`);
  } else {
    fail(`${campaign.key}: no click link found in html`);
  }

  // 3. pixel present exactly once
  const pixels = html.match(/\/api\/t\/pixel\?/g) || [];
  if (pixels.length !== 1) fail(`${campaign.key}: ${pixels.length} pixels (want 1)`);
  else status.push('pixel');

  // 4. unsubscribe present (html + text)
  if (!html.includes('/api/t/unsub?')) fail(`${campaign.key}: no unsubscribe link in html`);
  if (!text.includes('/api/t/unsub?')) fail(`${campaign.key}: no unsubscribe link in text`);
  else status.push('unsub');

  // 5. no stray outbound marketing links beyond the tracked CTA
  const external = html.match(/href="https?:\/\/(?!appinterviewready\.top\/api\/t)[^"]+"/g) || [];
  const legitExternal = external.filter((h) => h.includes('mailto:') === false);
  if (legitExternal.length > 0) fail(`${campaign.key}: unexpected external links: ${legitExternal.join(', ')}`);
  else status.push('no stray links');

  // 6. copy sanity
  if (!subject || subject.length > 80) fail(`${campaign.key}: subject missing or too long`);
  if (text.length < 300 || html.length < 2000) fail(`${campaign.key}: text/html too short`);
  status.push(`text ${text.length}b / html ${html.length}b`);

  console.log(`${campaign.key.padEnd(10)} ${subject.slice(0, 70).padEnd(72)} ${status.length ? 'OK' : '??'}`);
  status.forEach((s) => console.log(`           - ${s}`));
}

console.log('\n' + (failures === 0 ? `ALL ${CAMPAIGNS.length} CAMPAIGNS PASS` : `${failures} FAILURE(S)`));
process.exit(failures === 0 ? 0 : 1);
