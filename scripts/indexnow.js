#!/usr/bin/env node
/**
 * Notifies IndexNow (Bing, Yandex, Seznam, Naver) that URLs have changed.
 *
 * Google does not participate in IndexNow, but Bing does, and Bing is what
 * powers DuckDuckGo and ChatGPT search. Submitting here shortens the time to
 * first indexation, which matters most right after a batch of new pages ships.
 *
 * Runs after the sitemap is written, so it always advertises the current URL
 * set. Failures are non-fatal: the build must not break because a search engine
 * API is down or rate-limiting.
 *
 * Usage:
 *   node scripts/indexnow.js            # submit everything in sitemap.xml
 *   node scripts/indexnow.js --dry-run  # print the payload only
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://appinterviewready.top';
const HOST = 'appinterviewready.top';
const KEY = 'a3f8c21d9e4b47a6b5c0d8e2f1a93b7c';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const DRY = process.argv.includes('--dry-run');

function readUrls() {
  const sitemap = path.join(ROOT, 'public', 'sitemap.xml');
  if (!fs.existsSync(sitemap)) return [];
  const xml = fs.readFileSync(sitemap, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function submit(urlList) {
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  if (DRY) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  // IndexNow returns 200 (accepted) or 202 (accepted, pending key validation)
  const ok = res.status === 200 || res.status === 202;
  console.log(
    `[indexnow] submitted ${urlList.length} URLs -> HTTP ${res.status} ${ok ? '(accepted)' : '(check key file)'}`
  );
  if (!ok) {
    const text = await res.text().catch(() => '');
    if (text) console.log(`[indexnow] response: ${text.slice(0, 300)}`);
  }
}

(async () => {
  const urls = readUrls();
  if (!urls.length) {
    console.log('[indexnow] no URLs found in sitemap.xml, skipping');
    return;
  }
  try {
    await submit(urls);
  } catch (err) {
    // Never fail the build over search-engine notification
    console.log(`[indexnow] skipped (${err.message})`);
  }
})();
