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
    slug: 'questions-job-seekers-ask-before-interview',
    title: 'The Questions Job Seekers Ask Most Before an Interview and How to Answer Them',
    description:
      'The questions job seekers ask most before an interview, from "Tell me about yourself" to salary expectations, and how to answer each one with confidence.',
    image: '/blog/images/questions-job-seekers-ask-before-interview.jpg',
    date: '2026-09-04',
    tags: ['interview preparation', 'career advice', 'common questions', 'African professionals'],
  },
  {
    slug: 'resume-building-year1-interview-success',
    title: 'Why Building Your Resume in Year 1 of College Sets You Up for Interview Success',
    description:
      'Many African students wait until their second or third year to start thinking about their resumes. Starting in year one is a strategic move that directly improves interview performance and job-search confidence.',
    image: '/blog/images/resume-building-year1.jpg',
    date: '2025-08-15',
    tags: ['resume', 'career advice', 'interview preparation', 'African students'],
  },
  {
    slug: 'informational-interviews-open-doors',
    title: 'Why Informational Interviews Open Doors a Job Application Never Will',
    description:
      'Informational interviews can open doors a job application never will. A single short chat can bring clarity about a role, forge a genuine connection, and surface opportunities you never knew existed.',
    image: '/blog/images/informational-interviews.jpg',
    date: '2025-08-22',
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
  {
    slug: 'choose-your-lane-specialization-growth',
    title: "Why Narrow Isn't Limited: The Career Growth Power of Choosing a Lane",
    description:
      'Being everything to everyone can quietly dilute the expertise you worked so hard to build. There is real power in choosing a lane, going deeper, and becoming known for something specific, narrow doesn\'t mean limited.',
    image: '/blog/images/choose-your-lane-specialization-growth.jpg',
    date: '2026-09-04',
    tags: ['career growth', 'specialization', 'personal branding', 'African professionals'],
  },
  {
    slug: 'ai-mock-interview-practice-guide',
    title: 'AI Mock Interview: How to Practice Common Questions and Get Feedback That Actually Improves Your Answers',
    description:
      'Candidates who complete five or more realistic mock interviews convert offers at roughly 2.4x the rate of those who skip them. Here is how to use an AI mock interview the right way.',
    image: '/blog/images/ai-mock-interview-practice-guide.jpg',
    date: '2026-09-04',
    tags: ['AI mock interview', 'interview practice', 'interview preparation app', 'freshers'],
  },
  {
    slug: 'free-ats-resume-checker-guide',
    title: 'Free ATS Resume Checker: Does Your Fresher Resume Pass the 6-Second Test?',
    description:
      'ATS software filters out roughly 75% of resumes before a human sees them. Learn how a free ATS resume checker can show you exactly what is wrong, and how to fix it.',
    image: '/blog/images/free-ats-resume-checker-guide.jpg',
    date: '2026-09-04',
    tags: ['ATS resume checker', 'fresher resume', 'applicant tracking system', 'resume keywords'],
  },
  {
    slug: 'tell-me-about-yourself-freshers',
    title: "'Tell Me About Yourself' Answer Examples for Freshers: 3 Scripts That Actually Work",
    description:
      'The first question in almost every interview, and for freshers with no work history it can feel like a trap. Here is how to answer it with confidence, plus three scripts you can adapt.',
    image: '/blog/images/tell-me-about-yourself-freshers.jpg',
    date: '2026-09-04',
    tags: ['tell me about yourself', 'interview answers', 'freshers', 'self introduction'],
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
