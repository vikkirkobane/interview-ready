#!/usr/bin/env node
/* Temporary SEO verifier: asserts the exported build actually satisfies the
 * indexing invariants we care about. Run: node scripts/verify-seo.js */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://appinterviewready.top';
const INDEXABLE = ['index', 'ats-score', 'ats-checklist', 'pricing', 'blog', 'about', 'contact', 'privacy', 'terms'];

// Fail fast with a readable message when an expected page is missing so the
// build does not silently succeed against a partial export.
function bail(msg) {
  console.error(`\nSEO CHECK FAILED: ${msg}\n`);
  process.exit(1);
}

// Expected sizes are derived from the source of truth so this stays useful as
// content is added.
const POSTS = fs
  .readdirSync(path.join(ROOT, 'public', 'blog'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));
const CAREERS = fs
  .readdirSync(path.join(ROOT, 'public', 'careers'))
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.replace(/\.html$/, ''));

let fails = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  PASS  ${msg}`);
  else {
    fails++;
    console.log(`  FAIL  ${msg}`);
  }
};

const read = (f) => fs.readFileSync(path.join(DIST, f), 'utf8');
const locToFile = (loc) => {
  const p = loc.replace(SITE, '').replace(/^\//, '').replace(/\/$/, '');
  return p === '' ? 'index.html' : `${p}.html`;
};

console.log('\n== Per-route head invariants ==');
const titles = new Map();
for (const slug of INDEXABLE) {
  const file = `${slug}.html`;
  if (!fs.existsSync(path.join(DIST, file))) {
    ok(false, `${file} exists`);
    continue;
  }
  const html = read(file);
  const head = html.slice(0, html.indexOf('</head>'));
  const titleCount = (head.match(/<title[^>]*>/gi) || []).length;
  const canonical = head.match(/<link rel="canonical" href="([^"]+)"/);
  const robots = head.match(/<meta name="robots" content="([^"]+)"/);
  const ogImage = head.match(/<meta property="og:image" content="([^"]+)"/);
  const twImage = head.match(/<meta name="twitter:image" content="([^"]+)"/);
  const desc = head.match(/<meta name="description" content="([^"]+)"/);

  ok(titleCount === 1, `${slug}: exactly one <title> (${titleCount})`);
  ok(!!canonical && canonical[1].startsWith('https://'), `${slug}: absolute canonical`);
  ok(!!robots && /index, follow/.test(robots[1]), `${slug}: indexable robots`);
  ok(!!desc, `${slug}: has meta description`);
  ok(!!ogImage && ogImage[1].startsWith('https://'), `${slug}: absolute og:image`);
  ok(!!twImage, `${slug}: has twitter:image`);

  // every og:image must point at a file we actually ship
  if (ogImage) {
    const local = ogImage[1].replace(SITE, '').replace(/^\//, '');
    ok(fs.existsSync(path.join(DIST, local)), `${slug}: og:image file exists (${local})`);
  }

  // every JSON-LD block must be valid JSON
  for (const m of head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let parsed = null;
    try {
      parsed = JSON.parse(m[1]);
    } catch (e) {
      ok(false, `${slug}: JSON-LD parses (${e.message.slice(0, 60)})`);
    }
    if (parsed) ok(true, `${slug}: JSON-LD parses (${[].concat(parsed).map((o) => o['@type']).join(', ')})`);
  }

  const t = (titleCount === 1 ? head.match(/<title[^>]*>([\s\S]*?)<\/title>/)[1] : '') || '';
  if (titles.has(t)) ok(false, `${slug}: title unique (duplicate of ${titles.get(t)})`);
  else {
    titles.set(t, slug);
    ok(true, `${slug}: title unique`);
  }
}

console.log('\n== Blog index structured data ==');
{
  const head = read('blog.html');
  ok(/"@type":"Blog"/.test(head), 'blog: Blog schema');
  ok(/"@type":"ItemList"/.test(head), 'blog: ItemList schema');
  ok(/"@type":"BreadcrumbList"/.test(head), 'blog: BreadcrumbList schema');
  ok(/rel="alternate"[^>]+application\/rss\+xml/.test(head), 'blog: RSS alternate link');
  const links = [...head.matchAll(/<a href="\/careers\/([^"]+)"/g)].map((m) => m[1]);
  ok(
    links.length === CAREERS.length,
    `blog: links all ${CAREERS.length} location pages (${links.length})`
  );
}

console.log('\n== Homepage internal linking ==');
{
  const html = read('index.html');
  const links = [...html.matchAll(/<a href="\/careers\/([^"]+)"/g)].map((m) => m[1]);
  ok(
    links.length === CAREERS.length,
    `index: exposes all ${CAREERS.length} location pages (${links.length})`
  );
}

console.log('\n== Blog post invariants ==');
{
  const posts = fs.readdirSync(path.join(DIST, 'blog')).filter((f) => f.endsWith('.html') && !f.includes('['));
  if (posts.length !== POSTS.length) {
    bail(`Expected ${POSTS.length} prerendered blog posts but found ${posts.length} in dist/blog`);
  }
  ok(posts.length === POSTS.length, `${POSTS.length} prerendered posts (${posts.length})`);
  let withSchema = 0;
  let withContent = 0;
  for (const f of posts) {
    const html = read(`blog/${f}`);
    if (/"@type":"BlogPosting"/.test(html) && /"@type":"BreadcrumbList"/.test(html)) withSchema++;
    if (html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length > 2000) withContent++;
  }
  ok(withSchema === posts.length, `all posts have BlogPosting + BreadcrumbList (${withSchema}/${posts.length})`);
  ok(withContent === posts.length, `all posts ship real server-rendered text (${withContent}/${posts.length})`);
}

console.log('\n== Sitemap <-> filesystem consistency ==');
{
  const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expected =
    INDEXABLE.length + CAREERS.length + POSTS.length;
  ok(locs.length === expected, `${expected} URLs in sitemap (${locs.length})`);
  ok(new Set(locs).size === locs.length, 'no duplicate URLs in sitemap');
  const missing = locs.filter((l) => !fs.existsSync(path.join(DIST, locToFile(l))));
  ok(missing.length === 0, `every sitemap URL exists as a static file${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
  const notListed = [
    ...INDEXABLE.filter((s) => !locs.includes(s === 'index' ? `${SITE}/` : `${SITE}/${s}`)),
    ...POSTS.map((s) => `${SITE}/blog/${s}`).filter((u) => !locs.includes(u)),
    ...CAREERS.map((s) => `${SITE}/careers/${s}`).filter((u) => !locs.includes(u)),
  ];
  ok(notListed.length === 0, `every indexable page is listed${notListed.length ? ` (missing: ${notListed.join(', ')})` : ''}`);
  const imgs = [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
  ok(imgs.length === POSTS.length, `${POSTS.length} image sitemap entries (${imgs.length})`);
  const imgMissing = imgs.filter((u) => !fs.existsSync(path.join(DIST, u.replace(SITE, '').replace(/^\//, ''))));
  ok(imgMissing.length === 0, `every sitemap image exists${imgMissing.length ? ` (missing: ${imgMissing.join(', ')})` : ''}`);
}

console.log('\n== RSS feed ==');
{
  const feedPath = path.join(DIST, 'blog', 'feed.xml');
  ok(fs.existsSync(feedPath), 'feed.xml written');
  if (fs.existsSync(feedPath)) {
    const feed = fs.readFileSync(feedPath, 'utf8');
    const items = (feed.match(/<item>/g) || []).length;
    ok(items === POSTS.length, `${POSTS.length} feed items (${items})`);
    const fsUpdated = new Date(fs.statSync(feedPath).mtime).getTime();
    ok(Date.now() - fsUpdated < 3600e3, 'feed was regenerated by this build');
    const links = [...feed.matchAll(/<link>(https:\/\/[^<]+)<\/link>/g)].map((m) => m[1]);
    const bad = links.filter((l) => !fs.existsSync(path.join(DIST, locToFile(l))));
    ok(bad.length === 0, `every feed link resolves to a static file${bad.length ? ` (bad: ${bad.join(', ')})` : ''}`);
    ok(/<atom:link/.test(feed), 'feed declares its own atom:self link');
  }
}

console.log('\n== robots.txt ==');
{
  const rb = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
  ok(/Sitemap:\s*https:\/\/appinterviewready\.top\/sitemap\.xml/.test(rb), 'robots.txt advertises the sitemap');
}

console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : `${fails} CHECK(S) FAILED`}\n`);
process.exit(fails === 0 ? 0 : 1);
