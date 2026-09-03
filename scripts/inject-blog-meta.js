/**
 * Post-build script: injects Open Graph + Twitter Card meta tags into
 * pre-rendered blog HTML files so WhatsApp/Twitter/Facebook crawlers
 * see the correct title, description, and image.
 *
 * Run after `expo export --platform web`:
 *   node scripts/inject-blog-meta.js
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'blog');
const SITE_NAME = 'Interview Ready';

// Blog post metadata (must stay in sync with src/data/blog-posts.ts)
const POSTS = [
  {
    slug: 'resume-building-year1-interview-success',
    title: 'Why Building Your Resume in Year 1 of College Sets You Up for Interview Success',
    description:
      'Many African students wait until their second or third year to start thinking about their resumes. Starting in year one is a strategic move that directly improves interview performance and job-search confidence.',
    image: '/blog/images/resume-building-year1.jpg',
    date: '2025-09-02',
    tags: ['resume', 'career advice', 'interview preparation', 'African students'],
  },
  {
    slug: 'informational-interviews-open-doors',
    title: 'Why Informational Interviews Open Doors a Job Application Never Will',
    description:
      'Informational interviews can open doors a job application never will. A single short chat can bring clarity about a role, forge a genuine connection, and surface opportunities you never knew existed.',
    image: '/blog/images/informational-interviews.jpg',
    date: '2025-09-02',
    tags: ['informational interview', 'career advice', 'networking', 'African professionals'],
  },
  {
    slug: 'get-uncomfortable-career-growth',
    title: 'Why Getting a Little Uncomfortable Is the Next Right Career Move (Even When It Feels Risky)',
    description:
      'Career risk doesn\'t have to mean blowing everything up. It can be one conversation, one application, one small experiment. Sometimes the next right move simply asks us to get a little uncomfortable.',
    image: '/blog/images/get-uncomfortable-career-growth.jpg',
    date: '2025-09-02',
    tags: ['career growth', 'comfort zone', 'growth mindset', 'career advice', 'African professionals'],
  },
];

for (const post of POSTS) {
  const htmlPath = path.join(DIST_DIR, `${post.slug}.html`);
  if (!fs.existsSync(htmlPath)) {
    console.warn(`⚠️  ${post.slug}.html not found, skipping`);
    continue;
  }

  let html = fs.readFileSync(htmlPath, 'utf-8');

  const metaTags = [
    `<title>${post.title} | ${SITE_NAME}</title>`,
    `<meta name="description" content="${post.description}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${post.title}" />`,
    `<meta property="og:description" content="${post.description}" />`,
    `<meta property="og:image" content="${post.image}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${post.title}" />`,
    `<meta name="twitter:description" content="${post.description}" />`,
    `<meta name="twitter:image" content="${post.image}" />`,
    `<meta property="article:published_time" content="${post.date}" />`,
    ...post.tags.map((t) => `<meta property="article:tag" content="${t}" />`),
  ].join('\n    ');

  // Replace the generic <title> with the blog-specific one
  html = html.replace(
    /<title[^>]*>Interview Ready - AI-Powered Interview Coach[^<]*<\/title>/,
    metaTags
  );

  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`✅ Injected OG tags into ${post.slug}.html`);
}

console.log('\nDone. Blog pages now have proper social sharing meta tags.');
