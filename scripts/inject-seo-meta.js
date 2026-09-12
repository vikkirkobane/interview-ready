#!/usr/bin/env node
/**
 * Site-wide SEO injector for the exported web build.
 *
 * Context: the app is an Expo/React SPA whose server-rendered output is empty
 * (the root layout returns null during static export because auth state is only
 * available on the client). That means Googlebot gets ~63 characters of text on
 * the marketing pages: /, /ats-score, /pricing, /blog.
 *
 * This script injects, into every exported top-level HTML file:
 *   1. a self-referencing <link rel="canonical">
 *   2. a robots directive
 *   3. Organization + WebSite JSON-LD (entity signals for the Knowledge Graph
 *      and sitelinks search box)
 * and, for the two key landing routes, a <noscript> block containing the real
 * marketing copy, a single <h1>, and FAQPage JSON-LD.
 *
 * <noscript> is used deliberately: search engines index its text, but browsers
 * with JS enabled never render it, so the running SPA is completely unaffected
 * (no hydration conflicts, no layout clipping from body{overflow:hidden}).
 *
 * Full server-side rendering of the app routes is the proper long-term fix and
 * requires making the root layout render without client auth state.
 *
 * Runs AFTER `expo export --platform web`. Must run BEFORE prerender-blog.js so
 * that blog HTML (which sets its own canonical/JSON-LD) is not clobbered.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const MD_DIR_PUBLIC = path.join(ROOT, 'public', 'blog');
const SITE = 'https://appinterviewready.top';
const BRAND = 'Interview Ready';

const LINKEDIN_CO = 'https://www.linkedin.com/company/interview-ready-app/';
const LINKEDIN_PERSONAL = 'https://www.linkedin.com/in/victor-chogo/';

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ */
/* Copy used in the noscript blocks (mirrors the real on-page content) */
/* ------------------------------------------------------------------ */
const HOME = {
  h1: 'ATS-Optimised Resumes, Cover Letters and Interview Prep',
  intro:
    'Interview Ready writes, formats and exports professional resumes and cover letters in seconds. ATS-optimised, recruiter-tested and tailored to any job description you target — built for ambitious professionals in Africa and across the global job market.',
  sections: [
    {
      h2: 'Job applications are broken — we fix the part you cannot see',
      body: 'Applicant Tracking Systems filter out up to 75% of submissions before a human recruiter ever sees them. If your resume lacks the exact keywords from the job description, it is rejected instantly. Interview Ready reads the job description you paste, then rewrites your achievements around the keywords that matter while keeping the language natural and human.',
    },
    {
      h2: 'AI resume tailoring in 30 seconds',
      body: 'Paste your existing work history alongside your target job description. The engine immediately drafts a professional resume structured with correct keywords, strong metric-driven verbs and a clean summary — tailored resume drafts in 30 seconds instead of hours, meeting international ATS standards.',
    },
    {
      h2: 'Recruiter-tested cover letters',
      body: 'Generate high-conversion cover letters calibrated to 280–380 words. The structure produces a specific, metric-backed professional voice written in your own human voice, not a repetitive corporate bot template.',
    },
    {
      h2: 'ATS keyword integration',
      body: 'Up to 15 role-critical keywords are integrated naturally into your work achievements, clearing applicant screening filters so your submission lands directly on human recruiter desks.',
    },
    {
      h2: 'Universal careers and Word export',
      body: 'Whether you are an engineer in Nairobi, a registered nurse in Lagos, an analyst in Accra or applying for remote roles in London, Toronto or New York, Interview Ready covers every profession. Download fully formatted, Microsoft Word-compatible DOCX and print-ready PDF files. You keep 100% control with no hidden file locks or fees.',
    },
    {
      h2: 'Three steps to your next callback',
      body: 'Step 1: input your work history, or paste a draft of your current CV. Step 2: paste the target job description from LinkedIn, BrighterMonday or any application portal. Step 3: export ATS-optimised achievements and a custom cover letter, formatted for instant submission. Prepare polished, targeted applications in under three minutes.',
    },
    {
      h2: 'Free to start',
      body: 'Core formatting templates and general drafting are free of charge. No credit card is required to join or create an account.',
    },
  ],
  faq: [
    {
      q: 'Is Interview Ready free to use?',
      a: 'Yes. Core formatting templates and general drafting are free of charge. No credit card is required to join or create an account.',
    },
    {
      q: 'What makes Interview Ready different from general AI writing bots?',
      a: 'Interview Ready is built specifically for job applications. It reads the actual job description, injects the role-critical keywords that applicant tracking systems scan for, and exports print-ready PDF and editable DOCX files rather than leaving you with unstructured text.',
    },
    {
      q: 'Which industries or professions does it support?',
      a: 'All of them. Software engineering, healthcare, finance, education, logistics, sales, law, design and public sector roles are all supported. Users apply from across Africa and to remote and international roles worldwide.',
    },
    {
      q: 'Can I export directly to Microsoft Word format?',
      a: 'Yes. Every document downloads as an editable DOCX file and a print-ready PDF, with no hidden file locks or fees.',
    },
    {
      q: 'Is my work history data secure?',
      a: 'Yes. Your data is stored securely and standard privacy policies apply. See the privacy policy for full details.',
    },
  ],
};

const ATS = {
  h1: 'Free ATS Resume Score — Check Your Resume in 60 Seconds',
  intro:
    'Paste your resume against any job description and get an instant ATS score, keyword gaps and a rewrite plan. Free, with no credit card required.',
  sections: [
    {
      h2: 'What your ATS score tells you',
      body: 'Applicant tracking systems rank resumes against a job description before a recruiter ever reads them. The free check shows how well your resume matches the role you are targeting, which keywords are missing, and what to change so your application survives the filter.',
    },
    {
      h2: 'Who it is for',
      body: 'Graduates, career changers and experienced professionals applying to local roles in Kenya, Nigeria, Ghana, South Africa and beyond, or to remote and international positions in the United Kingdom, United States, Canada, Australia and the Gulf.',
    },
  ],
  faq: [
    {
      q: 'How much does the ATS resume check cost?',
      a: 'Your first resume score is free. No credit card is required to start.',
    },
    {
      q: 'What do I need to run the check?',
      a: 'Your current resume or CV and the job description for the role you are targeting. Paste both and you get the score, keyword gaps and a rewrite plan.',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* JSON-LD                                                            */
/* ------------------------------------------------------------------ */
function orgSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    alternateName: 'Interview Ready App',
    url: `${SITE}/`,
    description:
      'AI career copilot that writes, formats and exports ATS-optimised resumes and cover letters, and prepares candidates for interviews.',
    logo: {
      '@type': 'ImageObject',
      url: `${SITE}/icon_padded.png`,
      width: 512,
      height: 512,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'info@appinterviewready.top',
        availableLanguage: ['en'],
      },
    ],
    sameAs: [LINKEDIN_CO, LINKEDIN_PERSONAL],
  };
}

function siteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND,
    url: `${SITE}/`,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: BRAND, url: `${SITE}/` },
  };
}

function faqSchema(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */
const ldScript = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

function noscriptBlock(cfg) {
  const body = cfg.sections
    .map((s) => `<h2>${esc(s.h2)}</h2>\n<p>${esc(s.body)}</p>`)
    .join('\n');
  const faq = (cfg.faq || [])
    .map((f) => `<h3>${esc(f.q)}</h3>\n<p>${esc(f.a)}</p>`)
    .join('\n');
  const faqBlock = faq ? `\n<h2>Frequently Asked Questions</h2>\n${faq}` : '';
  return `<noscript id="seo-static"><main><h1>${esc(cfg.h1)}</h1>\n<p>${esc(
    cfg.intro
  )}</p>\n${body}${faqBlock}\n<p><a href="/ats-score">Get your free resume score</a> · <a href="/blog">Career guides</a></p>\n</main></noscript>`;
}

/** Inject markup just before </head> and before </body>. Idempotent. */
function inject(html, headExtra, bodyExtra) {
  let out = html;
  // strip any previous run so re-running never duplicates
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/gi, '');
  out = out.replace(/<meta name="robots" content="[^"]*"\s*\/?>/gi, '');
  out = out.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org"[\s\S]*?<\/script>/g, '');
  out = out.replace(/<noscript id="seo-static">[\s\S]*?<\/noscript>/g, '');

  if (headExtra) out = out.replace(/<\/head>/i, `${headExtra}\n</head>`);
  if (bodyExtra) out = out.replace(/<\/body>/i, `${bodyExtra}\n</body>`);
  return out;
}

/* ------------------------------------------------------------------ */
/* Route policy                                                       */
/* ------------------------------------------------------------------ */
// Routes worth indexing: they answer a search query and get server-rendered
// content below. Everything not listed here is an app-internal screen
// (login, settings, a tool view) and is marked noindex — otherwise Google
// indexes 30+ empty near-duplicate pages, which is worse than indexing none.
const INDEXABLE = new Set([
  'index',
  'ats-score',
  'ats-checklist',
  'pricing',
  'blog',
  'about',
  'contact',
  'privacy',
  'terms',
]);

const BLOG_LIST = {
  h1: 'Career Guides for Job Seekers',
  intro:
    'Practical, no-fluff guides on resumes, applications, interviews and career growth — written for professionals applying in Africa and to remote and international roles worldwide.',
};

const PRICING = {
  h1: 'Interview Ready Pricing — Free to Start',
  intro:
    'Core resume and cover letter formatting is free. Paid plans add more AI credits for resume tailoring, cover letter generation, mock interviews and job-fit analysis.',
  sections: [
    {
      h2: 'Free',
      body: 'Build and format ATS-friendly resumes and cover letters, export to DOCX and PDF, and use the core templates at no cost. No credit card required to create an account.',
    },
    {
      h2: 'Pro',
      body: 'Adds a monthly allowance of AI credits for tailored resume drafts, cover letter generation, mock interview sessions with feedback, job-fit scoring and the career AI assistant. Cancel any time.',
    },
    {
      h2: 'Promo codes',
      body: 'Signup credits and discount codes are available to new users — the LINKEDIN20 code adds bonus credits at checkout.',
    },
  ],
  faq: [
    {
      q: 'Do I need a credit card to start?',
      a: 'No. You can create an account and use the core formatting tools for free without entering payment details.',
    },
    {
      q: 'How do payments work?',
      a: 'Payments are processed securely by Paystack, with currency-aware pricing for local and international cards.',
    },
  ],
};

const INFO_PAGES = {
  about: {
    h1: 'About Interview Ready',
    intro:
      'Interview Ready builds automated career utilities for ambitious professionals across Africa and beyond, helping candidates compete on a global scale.',
    sections: [
      {
        h2: 'What we build',
        body: 'An AI career copilot that writes, formats and exports ATS-optimised resumes and cover letters, scores your fit against a specific job description, and prepares you for interviews with tailored questions and feedback.',
      },
      {
        h2: 'Who we serve',
        body: 'Graduates, career changers and experienced professionals applying to local roles in Kenya, Nigeria, Ghana, South Africa and across Africa, as well as to remote and international positions in the United Kingdom, United States, Canada, Australia and the Gulf.',
      },
      {
        h2: 'Our approach',
        body: 'Free-tier-first engineering: core resume and cover letter formatting is free, documents export to editable DOCX and print-ready PDF, and your data stays yours with no hidden file locks.',
      },
    ],
  },
  contact: {
    h1: 'Contact Interview Ready',
    intro: 'Questions, feedback or support requests are welcome — we read everything.',
    sections: [
      {
        h2: 'Email',
        body: 'Reach the team at info@appinterviewready.top. Include your account email and a short description of the issue for the fastest response.',
      },
      {
        h2: 'Support topics',
        body: 'Billing and credits, resume or cover letter export problems, account access, mock interview feedback, and feature requests.',
      },
      {
        h2: 'Follow along',
        body: 'Product updates and career guides are posted on our LinkedIn company page and on the Interview Ready blog.',
      },
    ],
  },
  privacy: {
    h1: 'Privacy Policy',
    intro:
      'This policy explains what Interview Ready collects, why it is collected, and the choices you have over your information.',
    sections: [
      {
        h2: 'Information we collect',
        body: 'Account details (name, email, authentication identifiers), the career content you provide such as work history and job descriptions, generated documents, and usage data such as credits consumed and feature activity.',
      },
      {
        h2: 'How it is used',
        body: 'Your content is used to generate the resumes, cover letters and interview preparation you request. Aggregated usage data is used to operate, secure and improve the service.',
      },
      {
        h2: 'Storage and security',
        body: 'Data is stored in access-controlled cloud infrastructure with row-level security so that one account cannot read another account\u2019s records. Documents are served over HTTPS.',
      },
      {
        h2: 'Your choices',
        body: 'You may request access to, correction of, or deletion of your personal data by emailing info@appinterviewready.top.',
      },
    ],
  },
  terms: {
    h1: 'Terms of Service',
    intro:
      'By creating an account or using Interview Ready you agree to these terms.',
    sections: [
      {
        h2: 'Use of the service',
        body: 'Interview Ready provides resume, cover letter, job-fit and interview preparation tools. You are responsible for the accuracy of the information you submit and for reviewing generated documents before sending them to an employer.',
      },
      {
        h2: 'Accounts and credits',
        body: 'Some features consume AI credits. Free allowances and promotional credits may change over time. Paid credits and subscriptions are handled through our payment provider, and pricing is shown before you pay.',
      },
      {
        h2: 'Acceptable use',
        body: 'Do not use the service to submit false credentials on the user\u2019s behalf, to generate unlawful content, or to attempt to disrupt or reverse-engineer the platform.',
      },
      {
        h2: 'Changes',
        body: 'These terms may be updated as the product evolves. Continued use after an update constitutes acceptance of the revised terms.',
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* main                                                               */
/* ------------------------------------------------------------------ */
function main() {
  if (!fs.existsSync(DIST)) {
    console.error(`[seo] dist not found: ${DIST}`);
    process.exit(1);
  }

  const postCount = fs.existsSync(path.join(DIST, 'blog'))
    ? fs.readdirSync(path.join(DIST, 'blog')).filter((f) => f.endsWith('.md')).length
    : 0;

  const files = fs.readdirSync(DIST).filter((f) => f.endsWith('.html'));
  let touched = 0;

  for (const file of files) {
    const full = path.join(DIST, file);
    const slug = file.replace(/\.html$/, '');
    const canonical = slug === 'index' ? `${SITE}/` : `${SITE}/${slug}`;
    const indexable = INDEXABLE.has(slug);

    let html = fs.readFileSync(full, 'utf8');

    const headParts = [
      `<link rel="canonical" href="${canonical}"/>`,
      indexable
        ? '<meta name="robots" content="index, follow, max-image-preview:large"/>'
        : '<meta name="robots" content="noindex, follow"/>',
    ];

    let bodyExtra = '';
    if (slug === 'index') {
      headParts.push(ldScript(orgSchema()), ldScript(siteSchema()), ldScript(faqSchema(HOME.faq)));
      bodyExtra = noscriptBlock(HOME);
    } else if (slug === 'ats-score') {
      headParts.push(ldScript(faqSchema(ATS.faq)));
      bodyExtra = noscriptBlock(ATS);
    } else if (slug === 'pricing') {
      headParts.push(ldScript(faqSchema(PRICING.faq)));
      bodyExtra = noscriptBlock(PRICING);
    } else if (slug === 'blog') {
      const links = blogIndexLinks();
      bodyExtra = `<noscript id="seo-static"><main><h1>${esc(
        BLOG_LIST.h1
      )}</h1>\n<p>${esc(BLOG_LIST.intro)}</p>\n<h2>All guides</h2>\n<ul>${links
        .map((p) => `<li><a href="/blog/${esc(p.slug)}">${esc(p.title)}</a></li>`)
        .join('')}</ul>\n<p><a href="/ats-score">Get your free resume score</a></p>\n</main></noscript>`;
    } else if (INFO_PAGES[slug]) {
      bodyExtra = noscriptBlock(INFO_PAGES[slug]);
      headParts.push(ldScript(orgSchema()));
    } else if (indexable) {
      headParts.push(ldScript(orgSchema()));
    }

    html = inject(html, headParts.join('\n'), bodyExtra);
    fs.writeFileSync(full, html, 'utf8');
    touched++;

    if (indexable && slug !== 'index') {
      console.log(`[seo] ${file}: indexed${bodyExtra ? ' + static content' : ''}`);
    }
  }

  console.log(`[seo] ${touched} HTML files processed; ${INDEXABLE.size} indexable routes, blog posts included via prerender-blog.js (${postCount} md files)`);
}

/** Read the post list straight from the exported markdown filenames. */
function blogIndexLinks() {
  const dir = path.join(MD_DIR_PUBLIC);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace(/\.md$/, '');
      let title = slug.replace(/-/g, ' ');
      try {
        const raw = fs.readFileSync(path.join(dir, f), 'utf8');
        const m = raw.match(/^---[\s\S]*?title:\s*["']?([^"'\n]+)["']?/m);
        if (m) title = m[1].trim();
      } catch (e) {
        /* keep slug-derived title */
      }
      return { slug, title };
    });
}

main();
