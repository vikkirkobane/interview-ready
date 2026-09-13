# SEO Integration Guide: Adding New Pages

> **Purpose:** Follow this document whenever you add a new page (blog post, marketing page, or location guide) so SEO integration stays consistent. Every rule here exists because something broke without it, and the "why" notes are there so you don't re-learn the lessons.

**Site:** `https://appinterviewready.top` (apex domain, never `www.`; the infra redirects www → apex)
**Brand:** Interview Ready
**Build gate:** `npm run build:web` runs `verify-seo.js` as its final step. If SEO is broken, the deploy fails. Treat a red build as an SEO regression.

---

## 1. How SEO works on this site (2-minute mental model)

The app is an **Expo static export SPA**. JavaScript renders the pages, which search engines handle poorly by default. SEO therefore works through three cooperating layers, all rebuilt on every `npm run build:web`:

```
1. expo export --platform web          → dist/ (SPA shell per route)
2. scripts/build-location-pages.js     → dist/careers/*.html (fully static pages)
3. scripts/inject-seo-meta.js          → adds title/description/canonical/robots/
                                         OG tags/JSON-LD/noscript content to SPA pages
4. scripts/inject-blog-meta.js         → OG/Twitter tags for the SPA blog shell
5. scripts/prerender-blog.js           → dist/blog/<slug>.html (fully static posts)
                                         + blog/index.html + sitemap.xml + feed.xml
6. scripts/indexnow.js                 → pings Bing/DuckDuckGo about changed URLs
7. scripts/verify-seo.js               → asserts everything above actually worked
```

Key consequence: **a route that only exists in `app/` is invisible to crawlers** until it gets static content through one of these layers. Nothing is crawled from the running React app.

---

## 2. The Golden Rules (non-negotiable)

1. **Exactly one `<title>` per page.** No exceptions. The injector strips all pre-existing titles before adding its own. If you add a title anywhere else (component, layout, `+html.tsx` edit), you create a duplicate and Google picks arbitrarily.
2. **Title sits at the top of `<head>`.** The injector places it right after the charset meta (~byte 62). Do not append head tags at the bottom "because it works". Google showed "Untitled" for months because the title sat 30KB deep. Crawlers with byte budgets or timeouts never reached it.
3. **Never use em dashes (`—`) in page copy, titles, or descriptions.** The owner considers them AI slop. Use commas, colons, or restructure the sentence. Same for shadow boxes in UI. This is a hard content rule.
4. **Absolute URLs for all SEO tags.** `og:image`, `twitter:image`, canonical: always `https://appinterviewready.top/...`. Social crawlers (LinkedIn, WhatsApp, Facebook) do not resolve relative paths. Blog OG images also carry a `?v=` cache-buster tied to the post date.
5. **New routes must be reachable by crawling.** Every indexable page must be linked from another indexable page (homepage, `/blog`, or a careers page) or listed in the sitemap. Orphan pages don't get indexed.
6. **`verify-seo.js` is the contract.** If you change how pages are built, update the verifier too, then make sure `npm run build:web` passes.

---

## 3. Checklist: adding a new BLOG POST

The blog has **two sources of truth** that must be updated in lockstep, plus the markdown file itself:

### Step 1: Write the markdown file

Create `public/blog/<slug>.md`:

```markdown
---
title: "Exact post title"
date: YYYY-MM-DD
tags: [tag one, tag two, Interview Ready]
---

![Alt text describing the image](/blog/images/<slug>.jpg)

# Exact post title

Body content...
```

Rules:
- **Slug** = kebab-case, permanent once published (URLs are identity; don't rename later).
- **Title:** ≤ 60 chars ideally (Google truncates ~60). No em dashes.
- **Date:** the **actual publish date**, never copy another post's date. Feeds the sitemap `lastmod`, feed `pubDate`, and OG image cache-buster.
- **Cover image:** 1200×630 JPG at `public/blog/images/<slug>.jpg`. Nothing else in the pipeline works without it.
- **No em dashes in the body.** No "Image Generation Prompt" sections (user-facing pages strip them, but don't rely on that).

### Step 2: Register it in `src/data/blog-posts.ts`

Append an entry to `blogPosts`:

```ts
{
  slug: '<slug>',
  title: 'Exact post title',
  date: 'YYYY-MM-DD',
  description: '150-160 char summary, no em dashes. This is the SERP snippet.',
  coverImage: '/blog/images/<slug>.jpg',
  tags: ['tag one', 'tag two'],
}
```

This drives the SPA blog index and the RSS feed content.

### Step 3: Register it in `scripts/inject-blog-meta.js`

Append the **same fields** to the `POSTS` array (the file header says "must stay in sync with src/data/blog-posts.ts"). This is what puts correct OG/Twitter tags on the SPA blog shell for social crawlers.

### Step 4: Build and verify

```bash
npm run build:web
```

The prerenderer automatically:
- generates `dist/blog/<slug>.html` (full static page: Article + Breadcrumb JSON-LD, OG/Twitter tags, CTA to `/welcome`)
- adds the post to `dist/blog/index.html` and the RSS feed
- adds the sitemap URL with an image-sitemap entry for the cover

Then confirm:
- `ALL CHECKS PASSED` from verify-seo (build fails otherwise)
- `dist/blog/<slug>.html` exists, title at byte ~120, exactly one per file
- Post appears in `dist/sitemap.xml` and `dist/blog/feed.xml`

### Common mistakes
- Adding the post to only one of the two registries → index/feed/OG drift. Update both.
- Copying another post's date → wrong `lastmod`, feed order, and cache-buster.
- Forgetting the cover image → no image-sitemap entry, blank social card.
- Em dashes in title/description → guaranteed owner rejection.

---

## 4. Checklist: adding a new MARKETING/SPA page

Example: a new landing page like `/ats-score` or `/about`.

### Step 1: Create the route
Create `app/<route>.tsx` (or inside a route group; note `(tabs)` group members have segment `['(tabs)', '<route>']`).

### Step 2: Register the route in `scripts/inject-seo-meta.js`

**a) `INDEXABLE` set** (~line 356): add the slug if the page should rank. All app-internal screens (dashboards, editors) stay out and get `noindex` automatically.

**b) `META` object** (~line 290): add title + description:

```js
'<route>': {
  title: 'Unique Title Under 60 Chars',          // no em dashes
  description: '150-160 char SERP snippet, no em dashes.',
},
```

If it's an app-internal (non-indexable) screen, you can skip `META`; `fallbackTitle()` generates a sane tab title.

**c) Static content** (the critical part). SPA routes have **zero crawlable text** without this. In `main()`, add a branch:

```js
} else if (slug === '<route>') {
  headParts.push(ldScript(faqSchema(MYFAQ.faq)));   // if the page answers questions
  bodyExtra = noscriptBlock(MYCONTENT);             // crawlable static content
}
```

Define the content object (h1, intro, sections with h2/body, faq) near the top of the file, following the `ATS` / `CHECKLIST` / `INFO_PAGES` pattern. No em dashes. **Exception:** if the screen natively renders real text into the static export (like `/ats-checklist` does), skip the noscript block and add only structured data. Check with `python -c` text-extraction before adding a duplicate.

**d) Sitemap**: `scripts/prerender-blog.js`, `staticRoutes` array (~line 622): add the URL with priority (1.0 homepage, 0.9 primary tool, 0.7 secondary, 0.5 informational, 0.3 legal) and changefreq.

**e) Internal link**: link the new page from at least one existing indexable page (homepage noscript links block, `/blog` intro, or a careers page).

### Step 3: Build and verify
`npm run build:web`, then check `dist/<route>.html`: title at byte ~62, exactly one title, canonical present, noscript content present, URL in sitemap.

### Also: if the page must be publicly reachable while logged out
Add the segment to the **AuthGuard public list** in `app/_layout.tsx` (`isPublicInfoRoute` / tabs-group handling). Marketing pages must not redirect logged-out visitors to `/welcome`, because Googlebot is always logged out. (This broke `/ats-score`, `/ats-checklist`, and `/pricing` before.)

---

## 5. Checklist: adding a new LOCATION page (careers)

1. Add one entry to `LOCATIONS` in `scripts/build-location-pages.js` (~line 116). Content, styling, and meta tags are fully generated from the template. Do not hand-edit the generated HTML in `public/careers/`.
2. Build: the generator runs first in `build:web` and writes `dist/careers/<slug>.html` with correct title/description/canonical/OG.
3. Sitemap: add the URL to the location routes in `scripts/prerender-blog.js` (same `locationRoutes` derivation that lists the existing five).
4. Cross-link: ensure at least one existing page links to it (homepage noscript block and `/blog` already link all location pages, so confirm the new slug shows up in the generated lists).

---

## 6. Design tokens for static pages (blog + careers)

The prerendered pages must visually match the app. When touching the templates in `scripts/prerender-blog.js` / `scripts/build-location-pages.js`:

| Token | Value |
|---|---|
| Primary (navy) | `#1A4F8A` |
| Accent (button/link) | `#0055FF` |
| Body bg | white `#FFFFFF` |
| Headings font | Sora (Google Fonts, weights 600-800) |
| Body font | Inter (weights 400-800) |
| CTA destination | `/welcome` (the auth/try-the-app screen), never `/ats-score` |
| Shadows | **None.** Flat surfaces only. |
| Nav | Real logo (`public/logo.png`) + "Interview Ready" + full menu (Features, How It Works, Recruiter Tested, FAQ, Blog, Sign In, Get Started) + working mobile hamburger |

The landing page nav links to landing sections via `/#features`, `/#how-it-works`, `/#faq` hash links; `LandingPage.tsx` handles deep-link scrolling with a measured-position poll. If you add a landing section, keep its `id` in sync.

---

## 7. When things break

| Symptom | Likely cause | Where to look |
|---|---|---|
| Build fails at verify-seo | Broken invariant (dup title, missing OG image, sitemap↔fs mismatch, feed issue) | Read the specific FAIL line; it names the file |
| Google shows "Untitled"/old snippet | Google hasn't recrawled, or title not at top of head | URL Inspection → Request Indexing; check title byte position |
| Social share shows old image | Platform caches aggressively (LinkedIn especially) | Bump the `?v=` cache-buster (tied to post date), then LinkedIn Post Inspector |
| Post missing from sitemap/feed | Registered in only one of the two registries | `src/data/blog-posts.ts` AND `scripts/inject-blog-meta.js` |
| Page redirected to /welcome for logged-out users | AuthGuard public list | `app/_layout.tsx` |
| New page invisible to crawlers | No static content / no internal link / not in sitemap | Sections 4-5 above |
| Whole site blank for users | Deploy race (HTML references a JS bundle that 404s mid-deploy) | Self-resolves; hard-refresh, wait for deploy to settle |

---

## 8. PR review checklist (for any page-adding PR)

- [ ] `npm run build:web` passes (verify-seo gate green)
- [ ] `npx tsc --noEmit` clean
- [ ] Exactly one `<title>` per new page, at top of head
- [ ] Titles/descriptions unique, ≤60/≤160 chars, **no em dashes**
- [ ] Canonical + OG tags absolute URLs
- [ ] New URL in `dist/sitemap.xml`
- [ ] New page linked from at least one existing indexable page
- [ ] Logged-out visitors can access it (AuthGuard)
- [ ] Blog: both registries updated, cover image 1200×630 at correct path, real date
- [ ] Static pages use app design tokens (navy, Sora/Inter, no shadows), CTA → `/welcome`
- [ ] Preview checked: page renders, no console errors
