#!/usr/bin/env node
/**
 * Post-build prerender for the Interview Ready blog.
 *
 * Problem it solves:
 *   The site is an Expo/React SPA. Every route (including /blog/<slug>) ships the
 *   same ~31KB JavaScript shell with no server-rendered text, so Googlebot sees
 *   ~97 characters per post instead of the real article. Search engines cannot
 *   reliably index the content, so the blog earns no organic traffic.
 *
 * What it does (runs AFTER `expo export --platform web`):
 *   1. Reads each markdown post from public/blog/*.md
 *   2. Renders it to semantic HTML with markdown-it
 *   3. Overwrites dist/blog/<slug>.html with a real static page containing the
 *      full article text, an <h1>, canonical tag, Open Graph tags, and
 *      BlogPosting + BreadcrumbList JSON-LD
 *   4. Regenerates dist/sitemap.xml from the actual post list
 *
 * No new dependencies: markdown-it is already installed (transitive dep of
 * react-native-markdown-display) and pinned in package-lock.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://appinterviewready.top';
const BRAND = 'Interview Ready';
const MD_DIR = path.join(ROOT, 'public', 'blog');
const DIST_BLOG = path.join(ROOT, 'dist', 'blog');
const DIST_ROOT = path.join(ROOT, 'dist');
const POSTS_TS = path.join(ROOT, 'src', 'data', 'blog-posts.ts');
const ADSENSE_ID = 'ca-pub-3023396295642660';

/* ------------------------------------------------------------------ */
/* markdown-it (with a small fallback so the build never hard-fails)  */
/* ------------------------------------------------------------------ */
let md;
try {
  const MarkdownIt = require('markdown-it');
  md = new MarkdownIt({ html: true, linkify: true, typographer: false, breaks: false });
} catch (err) {
  console.warn('[prerender] markdown-it unavailable, using minimal fallback renderer');
  md = {
    render(src) {
      const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return src
        .split(/\n{2,}/)
        .map((block) => {
          const t = block.trim();
          if (!t) return '';
          const h = t.match(/^(#{1,6})\s+(.*)$/);
          if (h) return `<h${h[1].length}>${esc(h[2])}</h${h[1].length}>`;
          const li = t.match(/^[-*]\s+/m);
          if (li) {
            const items = t
              .split('\n')
              .filter((l) => /^[-*]\s+/.test(l))
              .map((l) => `<li>${esc(l.replace(/^[-*]\s+/, ''))}</li>`)
              .join('');
            return `<ul>${items}</ul>`;
          }
          return `<p>${esc(t)}</p>`;
        })
        .join('\n');
    },
  };
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Inside <title>, &amp; and angle brackets must be escaped but apostrophes do
 * not — escaping them to &#39; inflates the character count and eats into
 * Google's ~60-char display budget.
 */
const titleEsc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Strip YAML frontmatter, return { data, body }. */
function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
    if (/^\[.*\]$/.test(val)) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
    data[kv[1]] = val;
  }
  return { data, body: raw.slice(m[0].length) };
}

/**
 * Parse metadata out of src/data/blog-posts.ts (source of truth for
 * human-written descriptions + cover images, which the markdown frontmatter
 * does not always carry).
 */
function parsePostsTs(ts) {
  const bySlug = {};
  const str = (name) =>
    new RegExp(
      `${name}:\\s*(?:\\n\\s*)?(?:"((?:[^"\\\\]|\\\\.)*)"|'((?:[^'\\\\]|\\\\.)*)')`
    );

  const slugRe = /slug:\s*'([^']+)'/g;
  const marks = [];
  let sm;
  while ((sm = slugRe.exec(ts)) !== null) {
    marks.push({ slug: sm[1], start: sm.index });
  }

  for (let i = 0; i < marks.length; i++) {
    const { slug, start } = marks[i];
    // Bound the slice to this entry so a missing field cannot reach into the next
    const stop = i + 1 < marks.length ? marks[i + 1].start : ts.length;
    const chunk = ts.slice(start, stop);

    const pick = (name) => {
      const m = chunk.match(str(name));
      if (!m) return null;
      const raw = m[1] !== undefined ? m[1] : m[2];
      return raw
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    };

    bySlug[slug] = {
      slug,
      title: pick('title'),
      date: pick('date'),
      description: pick('description'),
      coverImage: pick('coverImage'),
    };
  }

  const incomplete = Object.values(bySlug).filter((x) => !x.title);
  if (incomplete.length) {
    console.warn(
      `[prerender] WARNING: no title parsed for: ${incomplete.map((x) => x.slug).join(', ')}`
    );
  }
  return bySlug;
}

/** Turn 【https://…】 source markers into tidy superscript citations. */
function cleanCitations(src) {
  return src.replace(/【\s*(https?:\/\/[^\s】]+)\s*】/g, (_, url) => {
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      /* keep raw url as label */
    }
    return ` <sup class="src"><a href="${url}" target="_blank" rel="noopener nofollow">${host}</a></sup>`;
  });
}

function humanDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/* ------------------------------------------------------------------ */
/* page template                                                      */
/* ------------------------------------------------------------------ */

/** Footer links to every generated location page, read from public/careers/. */
function careersFooterLinks() {
  const dir = path.join(ROOT, 'public', 'careers');
  if (!fs.existsSync(dir)) return '';
  const labels = {
    kenya: 'Jobs in Kenya',
    nigeria: 'Jobs in Nigeria',
    ghana: 'Jobs in Ghana',
    'south-africa': 'Jobs in South Africa',
    'remote-work-africa': 'Remote Jobs from Africa',
  };
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => {
      const slug = f.replace(/\.html$/, '');
      const label =
        labels[slug] ||
        `Jobs in ${slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;
      return `<a href="/careers/${slug}">${label}</a>`;
    })
    .join('\n');
}

/**
 * Build a <title> that fits Google's ~60-char display limit. Appending the brand
 * to a full article headline routinely overshoots it, and a truncated title
 * loses the words that actually match the query, so the brand suffix is dropped
 * when it would not fit.
 */
function pageTitle(title) {
  const withBrand = `${title} | ${BRAND}`;
  if (withBrand.length <= 60) return withBrand;
  if (title.length <= 60) return title;
  // Trim on a word boundary and mark the cut
  const cut = title.slice(0, 57);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

const CSS = `
:root{--ink:#0f172a;--muted:#475569;--line:#e2e8f0;--brand:#0055ff;--bg:#ffffff;--soft:#f8fafc}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--brand)}
header.site{border-bottom:1px solid var(--line);background:#fff;position:sticky;top:0;z-index:5}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px}
.brand{font-weight:800;font-size:17px;letter-spacing:-.2px;color:var(--ink);text-decoration:none}
.brand span{color:var(--brand)}
.cta{background:var(--brand);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:999px;white-space:nowrap}
main{padding:40px 0 24px}
article h1{font-size:34px;line-height:1.22;letter-spacing:-.5px;margin:8px 0 12px}
article h2{font-size:25px;line-height:1.3;margin:38px 0 10px}
article h3{font-size:19px;margin:28px 0 8px}
article p,article li{color:#1e293b}
article img{max-width:100%;height:auto;border-radius:12px;margin:18px 0}
article blockquote{margin:22px 0;padding:2px 18px;border-left:4px solid var(--brand);background:var(--soft);color:var(--muted)}
article ul,article ol{padding-left:22px}
article hr{border:0;border-top:1px solid var(--line);margin:32px 0}
article code{background:var(--soft);padding:2px 5px;border-radius:5px;font-size:.92em}
article table{width:100%;border-collapse:collapse;margin:20px 0;font-size:15px}
article th,article td{border:1px solid var(--line);padding:8px 10px;text-align:left}
.meta{color:var(--muted);font-size:14px;margin:0 0 4px}
.tags{margin:22px 0 0;display:flex;flex-wrap:wrap;gap:8px}
.tags span{background:var(--soft);border:1px solid var(--line);border-radius:999px;font-size:12px;color:var(--muted);padding:4px 11px}
sup.src{font-size:.72em;vertical-align:super;line-height:0}
sup.src a{color:var(--muted);text-decoration:none;border-bottom:1px dotted var(--line)}
.promo{margin:44px 0;padding:26px;border:1px solid var(--line);border-radius:16px;background:var(--soft)}
.promo h3{margin:0 0 8px;font-size:19px}
.promo p{margin:0 0 16px;color:var(--muted);font-size:15px}
.more{margin:44px 0 0;border-top:1px solid var(--line);padding-top:26px}
.more h3{font-size:17px;margin:0 0 12px}
.more ul{list-style:none;padding:0;margin:0}
.more li{padding:11px 0;border-bottom:1px solid var(--line)}
.more a{text-decoration:none;font-weight:600}
footer.site{border-top:1px solid var(--line);margin-top:56px;padding:30px 0 46px;color:var(--muted);font-size:14px}
footer.site nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin-bottom:14px}
footer.site a{color:var(--muted);text-decoration:none}
footer.site a:hover{color:var(--brand);text-decoration:underline}
@media(max-width:600px){article h1{font-size:27px}article h2{font-size:21px}main{padding-top:26px}}
`;

function page({ title, description, canonical, image, date, tags, bodyHtml, moreLinks }) {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      image: image ? [image] : undefined,
      datePublished: date || undefined,
      dateModified: date || undefined,
      inLanguage: 'en',
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      author: { '@type': 'Organization', name: BRAND, url: SITE },
      publisher: {
        '@type': 'Organization',
        name: BRAND,
        url: SITE,
        logo: { '@type': 'ImageObject', url: `${SITE}/icon_padded.png` },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: title, item: canonical },
      ],
    },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${titleEsc(pageTitle(title))}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="canonical" href="${esc(canonical)}"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:site_name" content="${BRAND}"/>
${image ? `<meta property="og:image" content="${esc(image)}"/>` : ''}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
${image ? `<meta name="twitter:image" content="${esc(image)}"/>` : ''}
${date ? `<meta property="article:published_time" content="${esc(date)}"/>` : ''}
${(tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}"/>`).join('\n')}
<meta name="google-adsense-account" content="${ADSENSE_ID}"/>
<meta name="theme-color" content="#1a3a5c"/>
<link rel="icon" type="image/png" href="/favicon.png"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="manifest" href="/manifest.json"/>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
<a class="brand" href="/">Interview<span>Ready</span></a>
<a class="cta" href="/ats-score">Get Started Free</a>
</div></header>
<main><div class="wrap">
<article>
<p class="meta">${date ? `Published ${esc(humanDate(date))} · ` : ''}${BRAND}</p>
${bodyHtml}
${(tags || []).length ? `<div class="tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
</article>
<div class="promo">
<h3>Land more interviews, faster</h3>
<p>Interview Ready writes, formats and exports ATS-optimised resumes and cover letters in seconds — tailored to the exact job description you are targeting.</p>
<a class="cta" href="/ats-score">Check your resume free</a>
</div>
${
  (moreLinks || []).length
    ? `<div class="more"><h3>More career guides</h3><ul>${moreLinks
        .map((l) => `<li><a href="/blog/${esc(l.slug)}">${esc(l.title)}</a></li>`)
        .join('')}</ul></div>`
    : ''
}
</div></main>
<footer class="site"><div class="wrap">
<nav>
<a href="/">Home</a>
<a href="/blog">Blog</a>
<a href="/ats-score">Free ATS Score</a>
${careersFooterLinks()}
<a href="/privacy">Privacy</a>
<a href="/terms">Terms</a>
<a href="https://www.linkedin.com/company/interview-ready-app/">LinkedIn</a>
</nav>
<p>© ${new Date().getFullYear()} ${BRAND}. Built for ambitious professionals worldwide.</p>
</div></footer>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* main                                                               */
/* ------------------------------------------------------------------ */
function main() {
  if (!fs.existsSync(MD_DIR)) {
    console.error(`[prerender] markdown dir not found: ${MD_DIR}`);
    process.exit(1);
  }
  fs.mkdirSync(DIST_BLOG, { recursive: true });

  let metaBySlug = {};
  if (fs.existsSync(POSTS_TS)) {
    metaBySlug = parsePostsTs(fs.readFileSync(POSTS_TS, 'utf8'));
  } else {
    console.warn('[prerender] src/data/blog-posts.ts not found, falling back to frontmatter only');
  }

  const files = fs.readdirSync(MD_DIR).filter((f) => f.endsWith('.md'));
  const posts = [];

  for (const file of files) {
    const slug = path.parse(file).name;
    const raw = fs.readFileSync(path.join(MD_DIR, file), 'utf8');
    const { data, body } = splitFrontmatter(raw);
    const meta = metaBySlug[slug] || {};

    const title = meta.title || data.title || slug.replace(/-/g, ' ');
    const date = meta.date || (typeof data.date === 'string' ? data.date : '');
    const description = meta.description || (typeof data.description === 'string' ? data.description : data.title || title);
    const cover = meta.coverImage || `/blog/images/${slug}.jpg`;
    const tags = Array.isArray(data.tags) ? data.tags : [];

    posts.push({ slug, title, date, description, cover, tags, body });
  }

  // Newest first
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  let written = 0;
  for (const post of posts) {
    const bodyHtml = md.render(cleanCitations(post.body)).trim();
    const canonical = `${SITE}/blog/${post.slug}`;
    const more = posts.filter((p) => p.slug !== post.slug).slice(0, 5);

    // Absolute og:image so social crawlers resolve it reliably
    const image = post.cover.startsWith('http') ? post.cover : `${SITE}${post.cover}`;

    const html = page({
      title: post.title,
      description: post.description,
      canonical,
      image,
      date: post.date,
      tags: post.tags,
      bodyHtml,
      moreLinks: more,
    });

    fs.writeFileSync(path.join(DIST_BLOG, `${post.slug}.html`), html, 'utf8');
    written++;
  }

  // Keep the SPA's dynamic route shell out of the way: any request to a slug we
  // did not prerender should still resolve to a static shell. [slug].html stays
  // untouched for that purpose.

  /* --- sitemap --- */
  const staticRoutes = [
    { loc: `${SITE}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${SITE}/ats-score`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${SITE}/ats-checklist`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${SITE}/blog`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${SITE}/about`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${SITE}/contact`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${SITE}/privacy`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${SITE}/terms`, priority: '0.3', changefreq: 'yearly' },
  ];

  // Location landing pages (generated by build-location-pages.js into public/careers/)
  const careersDir = path.join(ROOT, 'public', 'careers');
  const locationRoutes = fs.existsSync(careersDir)
    ? fs
        .readdirSync(careersDir)
        .filter((f) => f.endsWith('.html'))
        .map((f) => ({
          loc: `${SITE}/careers/${f.replace(/\.html$/, '')}`,
          priority: '0.8',
          changefreq: 'monthly',
        }))
    : [];

  const urls = [
    ...staticRoutes.map(
      (r) =>
        `  <url>\n    <loc>${r.loc}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    ),
    ...locationRoutes.map(
      (r) =>
        `  <url>\n    <loc>${r.loc}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    ),
    ...posts.map(
      (p) =>
        `  <url>\n    <loc>${SITE}/blog/${p.slug}</loc>${
          p.date ? `\n    <lastmod>${p.date}</lastmod>` : ''
        }\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ),
  ].join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  if (fs.existsSync(DIST_ROOT)) {
    fs.writeFileSync(path.join(DIST_ROOT, 'sitemap.xml'), sitemap, 'utf8');
  }
  // Also keep the source copy current so a plain `public/` deploy stays correct.
  const publicSitemap = path.join(ROOT, 'public', 'sitemap.xml');
  fs.writeFileSync(publicSitemap, sitemap, 'utf8');

  console.log(`[prerender] ${written} blog posts -> static HTML with full content`);
  console.log(
    `[prerender] sitemap.xml written with ${
      staticRoutes.length + locationRoutes.length + posts.length
    } URLs`
  );
}

main();
