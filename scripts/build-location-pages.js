#!/usr/bin/env node
/**
 * Generates real static HTML landing pages for local job markets.
 *
 * Why static files and not app routes: the app is an Expo SPA whose static
 * export renders an empty shell, so app routes carry no server-rendered text.
 * Files written to public/ are copied verbatim into dist/ by `expo export` and
 * served by Vercel ahead of the catch-all rewrite — the same mechanism that
 * already serves public/ats-checklist.html. That gives these pages 100% real
 * server-rendered HTML: no noscript, no hydration concerns, fully crawlable.
 *
 * Adding a city = adding one entry to LOCATIONS. Deliberately NOT generating
 * thin variants for every city up front: one genuinely useful page first, prove
 * it ranks, then clone the model.
 *
 * Run before `expo export` (wired into build:web) or standalone.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'careers');
const SITE = 'https://appinterviewready.top';
const BRAND = 'Interview Ready';
const ADSENSE_ID = 'ca-pub-3023396295642660';

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* Shared visual language with the prerendered blog pages. */
const CSS = `
:root{--ink:#0f172a;--muted:#475569;--line:#e2e8f0;--brand:#0055ff;--bg:#fff;--soft:#f8fafc}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--brand)}
header.site{border-bottom:1px solid var(--line);background:#fff;position:sticky;top:0;z-index:5}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px}
.brand{font-weight:800;font-size:17px;letter-spacing:-.2px;color:var(--ink);text-decoration:none}
.brand span{color:var(--brand)}
.cta{background:var(--brand);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:999px;white-space:nowrap;display:inline-block}
main{padding:40px 0 24px}
h1{font-size:34px;line-height:1.22;letter-spacing:-.5px;margin:8px 0 14px}
h2{font-size:25px;line-height:1.3;margin:38px 0 10px}
h3{font-size:19px;margin:28px 0 8px}
p,li{color:#1e293b}
ul,ol{padding-left:22px}
blockquote{margin:22px 0;padding:2px 18px;border-left:4px solid var(--brand);background:var(--soft);color:var(--muted)}
code{background:var(--soft);padding:2px 5px;border-radius:5px;font-size:.92em}
table{width:100%;border-collapse:collapse;margin:20px 0;font-size:15px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left}
th{background:var(--soft)}
.lede{font-size:18px;color:var(--muted)}
.stat{margin:26px 0;padding:22px 24px;border:1px solid var(--line);border-left:4px solid var(--brand);background:var(--soft);border-radius:12px}
.stat b{font-size:28px;display:block;line-height:1.2}
.stat span{color:var(--muted);font-size:15px}
.promo{margin:44px 0;padding:26px;border:1px solid var(--line);border-radius:16px;background:var(--soft)}
.promo h3{margin:0 0 8px;font-size:19px}
.promo p{margin:0 0 16px;color:var(--muted);font-size:15px}
.src{font-size:13px;color:var(--muted)}
footer.site{border-top:1px solid var(--line);margin-top:56px;padding:30px 0 46px;color:var(--muted);font-size:14px}
footer.site nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin-bottom:14px}
footer.site a{color:var(--muted);text-decoration:none}
footer.site a:hover{color:var(--brand);text-decoration:underline}
@media(max-width:600px){h1{font-size:27px}h2{font-size:21px}main{padding-top:26px}}
`;

/* ------------------------------------------------------------------ */
/* LOCATIONS                                                          */
/* ------------------------------------------------------------------ */
const LOCATIONS = [
  {
    slug: 'kenya',
    country: 'Kenya',
    h1: 'CV Help for Jobs in Kenya: Get Past the ATS and Shortlisted',
    title: 'CV Help for Jobs in Kenya — Beat the ATS and Get Shortlisted',
    description:
      'How to write an ATS-friendly CV for jobs in Kenya: what local recruiters screen for, how applicant tracking systems filter applications, and how to tailor your CV to each job description for free.',
    intro:
      'Getting shortlisted in Kenya takes more than a good CV. With far more qualified applicants than advertised roles, most applications are filtered before a human ever reads them. This guide covers what Kenyan recruiters and screening software actually look at, and how to make sure your CV survives the first pass.',
    stats: [
      {
        value: '~1,000,000',
        label:
          'young Kenyans enter the job market each year, against roughly 200,000 formal jobs created.',
        source:
          'UN Resident Coordinator in Kenya, September 2026 — <a href="https://educationnews.co.ke/kenya-produces-one-million-job-seekers-yearly-but-creates-only-200000-jobs-un-warns" target="_blank" rel="noopener nofollow">Education News Kenya</a>',
      },
    ],
    sections: [
      {
        h2: 'Why so many applications never reach a recruiter',
        paras: [
          'That gap between a million job seekers and two hundred thousand jobs explains the volume every Kenyan recruiter faces. A single graduate or entry-level advert on a major local job board routinely attracts hundreds of applications.',
          'Faced with that volume, employers do not read every CV by hand. They use applicant tracking systems (ATS) — software that parses each CV, compares it to the job description, and ranks or filters candidates by keyword match before a human shortlists anyone. If your CV cannot be parsed, or does not contain the terms the employer searched for, it is rejected regardless of how strong your actual experience is.',
        ],
      },
      {
        h2: 'What Kenyan recruiters and screening software look for',
        paras: [
          'The mechanics are the same in Nairobi as in London or Toronto. Screening software reads plain text, so structure matters more than visual design.',
        ],
        list: [
          '<strong>Parseable formatting.</strong> Tables, multi-column layouts, text boxes and graphics commonly break CV parsing. Skill bars and icons are invisible to the software. Simple single-column layouts with standard headings such as Work Experience, Education and Skills are read reliably.',
          '<strong>File format.</strong> Submit a DOCX when the portal accepts it. If a PDF is required, export a text-based PDF rather than a scanned or image-heavy one, which the parser may read as blank.',
          '<strong>Exact keyword matches.</strong> If the advert says "customer relationship management" and your CV says "CRM tools", a keyword-based filter may not connect them. Mirror the employer\u2019s own wording where it is honestly accurate.',
          '<strong>Local context that translates.</strong> Kenyan experience is an asset, so name the employers and institutions plainly and describe what they do. Recruiters at multinationals and remote-first companies may not know a given local company, sector or qualification.',
          '<strong>Quantified achievements.</strong> "Managed the branch" tells a screener nothing. "Managed a five-person branch team and grew monthly deposit intake by 23%" gives the software keywords and gives the human a reason to call.',
        ],
      },
      {
        h2: 'CV or resume? What the convention is in Kenya',
        paras: [
          'In Kenyan usage, "CV" is the common term for the document you send with a job application, and it is typically one to three pages of experience, education and skills. Longer academic CVs listing publications and conference papers are for research and academic applications, not for the roles most job boards advertise.',
          'For private-sector applications, keep the recruiter-facing CV focused: a short summary, then achievements under each role, then education and skills. Leave off your primary school results, ID number, marital status, religion and a photograph unless an employer specifically asks for them. Modern screening practice either ignores these or treats them as a liability.',
        ],
      },
      {
        h2: 'Where the jobs actually are',
        paras: [
          'Kenyan openings cluster heavily in Nairobi, with smaller markets in Mombasa, Kisumu, Nakuru, Thika and the wider counties. Entry-level and graduate roles are the most competitive per vacancy, which is exactly where a keyword-optimised CV matters most.',
          'The main local job boards are BrighterMonday, which reports over three million candidate profiles, and Fuzu. Also watch company career pages directly: roles posted there are often advertised before or instead of being syndicated to a board.',
        ],
      },
      {
        h2: 'Remote and international roles from Kenya',
        paras: [
          'Remote work has opened a second market. Kenyan professionals now apply directly for roles based in the United Kingdom, United States, Canada, Australia, the Gulf and South Africa, and compete there on skill rather than location.',
          'International screening software is stricter about format and often about keyword density, because the applicant pool is global and larger. This is where a tailored document beats a generic one by the widest margin — and where the same CV that works for a local advert often needs a different framing for an overseas employer.',
        ],
      },
      {
        h2: 'How Interview Ready helps',
        paras: [
          'Interview Ready reads the job description you paste, works out which terms the screening software is most likely to match on, and rewrites your achievements around them while keeping your own voice intact. It exports a clean, parseable DOCX and a print-ready PDF.',
          'You can check where you stand before applying: paste your current CV against the ad and get a free ATS score with the keyword gaps it finds. No credit card is needed to start.',
        ],
      },
    ],
    faq: [
      {
        q: 'What is an ATS-friendly CV?',
        a: 'An ATS-friendly CV is written and formatted so applicant tracking software can read it accurately. That means a single-column layout with standard headings, no tables or text boxes, a text-based file rather than a scanned image, and the keywords from the job description used naturally within your achievements.',
      },
      {
        q: 'How long should a CV be in Kenya?',
        a: 'One to three pages for most private-sector roles. Graduates and candidates with under five years of experience should aim for a single page. Longer academic CVs listing publications are for research and academic applications.',
      },
      {
        q: 'Should I include a photograph, ID number or marital status on my CV?',
        a: 'No, unless the employer explicitly asks. Modern recruitment practice either ignores this information or treats it as a liability, and only relevant qualifications belong on a recruiter-facing CV.',
      },
      {
        q: 'Should I send my CV as a PDF or a Word document?',
        a: 'Use whichever format the employer requests. Where you have a choice, DOCX parses most reliably. If a PDF is required, export a text-based PDF rather than a scanned image, which screening software may read as blank.',
      },
      {
        q: 'Is Interview Ready free to use?',
        a: 'Your first ATS resume score is free and no credit card is required to create an account. Core resume and cover letter formatting is also free, and you can export both DOCX and PDF files.',
      },
      {
        q: 'Can Interview Ready help with remote and international job applications?',
        a: 'Yes. The same tailoring works for overseas employers. Because international applicant pools are larger and their screening software is stricter about format and keywords, a document tailored to each specific advert makes a bigger difference for these applications.',
      },
    ],
    related: [
      { slug: 'free-ats-resume-checker-guide', title: 'Free ATS Resume Checker: Does Your Fresher Resume Pass the 6-Second Test?' },
      { slug: 'resume-building-year1-interview-success', title: 'Why Building Your Resume in Year 1 of College Sets You Up for Interview Success' },
      { slug: 'questions-job-seekers-ask-before-interview', title: 'The Questions Job Seekers Ask Most Before an Interview and How to Answer Them' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* template                                                           */
/* ------------------------------------------------------------------ */
function jsonLd(loc) {
  const url = `${SITE}/careers/${loc.slug}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: loc.h1,
      description: loc.description,
      inLanguage: 'en',
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
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
        { '@type': 'ListItem', position: 2, name: `Jobs in ${loc.country}`, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: loc.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];
}

function render(loc) {
  const url = `${SITE}/careers/${loc.slug}`;

  const stats = (loc.stats || [])
    .map(
      (s) =>
        `<div class="stat"><b>${esc(s.value)}</b><span>${esc(
          s.label
        )}</span><p class="src">Source: ${s.source}</p></div>`
    )
    .join('\n');

  const body = loc.sections
    .map((sec) => {
      const paras = (sec.paras || []).map((p) => `<p>${esc(p)}</p>`).join('\n');
      const list = sec.list
        ? `<ul>${sec.list.map((li) => `<li>${li}</li>`).join('')}</ul>`
        : '';
      return `<h2>${esc(sec.h2)}</h2>\n${paras}${list}`;
    })
    .join('\n');

  const faq = loc.faq
    .map((f) => `<h3>${esc(f.q)}</h3>\n<p>${esc(f.a)}</p>`)
    .join('\n');

  const related = (loc.related || []).length
    ? `<h2>Related guides</h2>\n<ul>${loc.related
        .map((r) => `<li><a href="/blog/${esc(r.slug)}">${esc(r.title)}</a></li>`)
        .join('')}</ul>`
    : '';

  const scriptTags = jsonLd(loc)
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(loc.title)}</title>
<meta name="description" content="${esc(loc.description)}"/>
<link rel="canonical" href="${esc(url)}"/>
<meta name="robots" content="index, follow, max-image-preview:large"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(loc.title)}"/>
<meta property="og:description" content="${esc(loc.description)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:site_name" content="${BRAND}"/>
<meta property="og:image" content="${SITE}/icon_padded.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(loc.title)}"/>
<meta name="twitter:description" content="${esc(loc.description)}"/>
<meta name="twitter:image" content="${SITE}/icon_padded.png"/>
<meta name="google-adsense-account" content="${ADSENSE_ID}"/>
<meta name="theme-color" content="#1a3a5c"/>
<link rel="icon" type="image/png" href="/favicon.png"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="manifest" href="/manifest.json"/>
${scriptTags}
<style>${CSS}</style>
</head>
<body>
<header class="site"><div class="wrap">
<a class="brand" href="/">Interview<span>Ready</span></a>
<a class="cta" href="/ats-score">Get Started Free</a>
</div></header>
<main><div class="wrap">
<article>
<h1>${esc(loc.h1)}</h1>
<p class="lede">${esc(loc.intro)}</p>
${stats}
${body}
<div class="promo">
<h3>Check your CV against a real job advert — free</h3>
<p>Paste your CV and the job description to see your ATS match score, the keywords you are missing, and a rewrite plan. No credit card required.</p>
<a class="cta" href="/ats-score">Get my free CV score</a>
</div>
${related}
<h2>Frequently Asked Questions</h2>
${faq}
</article>
</div></main>
<footer class="site"><div class="wrap">
<nav>
<a href="/">Home</a>
<a href="/blog">Blog</a>
<a href="/ats-score">Free ATS Score</a>
<a href="/careers/kenya">Kenya</a>
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

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let n = 0;
  for (const loc of LOCATIONS) {
    const html = render(loc);
    const file = path.join(OUT_DIR, `${loc.slug}.html`);
    fs.writeFileSync(file, html, 'utf8');
    const words = html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
    console.log(`[locations] ${loc.slug}: ${words} words -> public/careers/${loc.slug}.html`);
    n++;
  }
  console.log(`[locations] ${n} page(s) generated`);
}

main();
