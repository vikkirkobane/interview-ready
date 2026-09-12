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

const locationNav = () =>
  LOCATIONS.map(
    (l) => `<a href="/careers/${l.slug}">Jobs in ${esc(l.country)}</a>`
  ).join('\n');

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
  {
    slug: 'nigeria',
    country: 'Nigeria',
    h1: 'CV Help for Jobs in Nigeria: Beat the ATS and Get Shortlisted',
    title: 'CV Help for Jobs in Nigeria — Graduate Trainee CVs That Pass the ATS',
    description:
      'How to write an ATS-friendly CV for jobs in Nigeria: what Lagos and Abuja recruiters screen for, how NYSC service reads to employers, where entry-level roles are actually filled, and how to tailor your CV to each advert for free.',
    intro:
      'Nigeria produces far more graduates each year than the formal economy absorbs, so most applications are filtered by software before a recruiter reads them. This guide covers what Nigerian employers and applicant tracking systems actually look at, how to present NYSC service, and where entry-level roles are genuinely filled.',
    stats: [
      {
        value: '1.7 million',
        label:
          'graduates leave Nigerian universities and polytechnics every year, into an economy that cannot absorb them.',
        source:
          'National Bureau of Statistics figures reported by <a href="https://insights.techcabal.com/nysc-reform-nigerias-graduate-unemployment-and-the-jobs-gap" target="_blank" rel="noopener nofollow">TechCabal Insights</a>, 2026',
      },
      {
        value: '~35%',
        label:
          'of Nigerian university graduates remain unemployed for five years or more after completing NYSC.',
        source:
          'African Development Bank estimate, reported 2026',
      },
    ],
    sections: [
      {
        h2: 'Why strong candidates still get filtered out',
        paras: [
          'A graduate trainee advert at a Lagos bank or an FMCG can draw thousands of applications. Employers cannot read them by hand, so they use applicant tracking systems \u2014 software that parses each CV, scores it against the job description, and filters or ranks candidates by keyword match before anyone shortlists.',
          'That means rejection usually has nothing to do with your ability. If your CV cannot be parsed cleanly, or does not use the same vocabulary as the advert, it is discarded at the first stage. The good news is that these are mechanical problems with mechanical fixes.',
        ],
      },
      {
        h2: 'What Nigerian recruiters and screening software look for',
        list: [
          '<strong>Parseable formatting.</strong> Tables, columns, text boxes and graphics break CV parsing. Skill bars, icons and progress bars are invisible to the software. A single-column layout with standard headings \u2014 Work Experience, Education, Skills, Certifications \u2014 is read reliably.',
          '<strong>A DOCX when the portal accepts it.</strong> If a PDF is required, export a text-based PDF, not a scanned or image-heavy one the parser may read as blank.',
          '<strong>Exact keyword matches.</strong> If the advert asks for "customer relationship management" and your CV says "CRM tools", a keyword filter may not connect the two. Mirror the employer\u2019s own wording wherever it is honestly accurate.',
          '<strong>Class of degree and institution.</strong> Many Nigerian graduate schemes still screen on grade heavily, so state your degree classification and institution plainly and early. Do not make a recruiter hunt for it.',
          '<strong>Quantified achievements.</strong> "Handled sales" says nothing. "Grew monthly sales in my territory from \u20a62.1m to \u20a63.4m over two quarters" gives the software keywords and gives the human a reason to call you.',
        ],
      },
      {
        h2: 'How NYSC service reads to employers',
        paras: [
          'NYSC places a large cohort of graduates each year, and employers read it one of two ways depending on how you present it. Written as "NYSC \u2014 served", it looks like a gap. Written properly, it is real work experience.',
          'Name the state, the organisation, your actual role and what you delivered. If you taught, ran a budget, managed records, or built anything, describe the outcome. Those are the keywords that match entry-level job descriptions.',
          'If you are still serving, list it as current experience rather than waiting until it ends. Employers hire continuously and many graduate schemes open well before service finishes.',
        ],
      },
      {
        h2: 'Where entry-level jobs in Nigeria are actually filled',
        paras: [
          'A large share of entry-level roles are never publicly advertised for long, and many are filled through referrals or direct approaches before a posting goes live. Applying only to job boards means competing in the most crowded channel.',
        ],
        list: [
          '<strong>Graduate trainee schemes.</strong> Banks, FMCG companies and the professional services firms run structured annual intakes. These are the most competitive, and the ones where formatting and keyword discipline matter most because the volume is enormous.',
          '<strong>Funded startups and mid-sized companies.</strong> A fifty-person fintech does not run a graduate scheme. It needs a junior associate right now and hires in weeks, often through LinkedIn or a referral. A large share of first jobs come from this segment, and most graduates under-apply there.',
          '<strong>Public sector and agencies.</strong> The civil service, parastatals and agencies such as CBN, FIRS, NCC, SEC, NPA and NIMASA hire graduates at competitive salaries. Postings appear on official channels, so check them directly rather than relying on aggregators.',
          '<strong>LinkedIn and professional communities.</strong> Recruiters search for candidates by keyword. A profile that mirrors the roles you want makes you findable \u2014 the same keyword logic as your CV, applied to search.',
        ],
      },
      {
        h2: 'Remote and international roles from Nigeria',
        paras: [
          'Remote work gives Nigerian professionals direct access to employers in the United Kingdom, United States, Canada, Australia and the Gulf, competing on skill rather than location. Nigeria\u2019s digital economy is among the largest in Africa, and hundreds of millions of roles across Sub-Saharan Africa are projected to require digital skills by 2030.',
          'Two practical notes. First, international applicant pools are larger and their screening software is stricter about format, so tailoring matters more, not less. Second, list the digital tools you genuinely use \u2014 Excel, SQL, Figma, HubSpot, Python, whatever is true \u2014 because digital-skill keywords are among the most common filters on international adverts.',
        ],
      },
      {
        h2: 'How Interview Ready helps',
        paras: [
          'Interview Ready reads the job advert you paste, works out which terms the screening software is most likely to match on, and rewrites your achievements around them while keeping your own voice. It exports a clean, parseable DOCX and a print-ready PDF.',
          'Check where you stand before you apply: paste your current CV against the advert and get a free ATS score with the keyword gaps it finds. No credit card needed to start.',
        ],
      },
    ],
    faq: [
      {
        q: 'What is an ATS-friendly CV in Nigeria?',
        a: 'An ATS-friendly CV is built so applicant tracking software can read it accurately: a single-column layout with standard headings, no tables, columns or text boxes, a text-based file rather than a scanned image, and the keywords from the job advert used naturally inside your achievements.',
      },
      {
        q: 'How should I put NYSC on my CV?',
        a: 'Treat it as work experience rather than a gap. Include the state, the organisation, your role, and what you actually delivered, with numbers where you have them. Listing only "NYSC" wastes a section that can otherwise carry real entry-level keywords.',
      },
      {
        q: 'Should I include my class of degree on my CV?',
        a: 'Yes, if you are applying to graduate schemes or early-career roles. Many Nigerian employers screen heavily on degree classification, so state it plainly and early rather than leaving a recruiter to search for it.',
      },
      {
        q: 'How long should a CV be in Nigeria?',
        a: 'One to three pages for most roles, and one page if you have under about five years of experience. Recruiters screening at volume spend very little time per document, so relevance beats length.',
      },
      {
        q: 'Do Nigerian employers really use ATS software?',
        a: 'Large employers, multinationals, banks and most funded startups do. Smaller firms may review manually, but they still read on screens and rank by relevance, so the same principles apply either way.',
      },
      {
        q: 'Is Interview Ready free to use?',
        a: 'Your first ATS resume score is free and no credit card is required to create an account. Core resume and cover letter formatting is also free, with DOCX and PDF export.',
      },
    ],
    related: [
      { slug: 'free-ats-resume-checker-guide', title: 'Free ATS Resume Checker: Does Your Fresher Resume Pass the 6-Second Test?' },
      { slug: 'resume-building-year1-interview-success', title: 'Why Building Your Resume in Year 1 of College Sets You Up for Interview Success' },
      { slug: 'tell-me-about-yourself-freshers', title: 'Tell Me About Yourself: A Fresher\u2019s Script That Actually Works' },
    ],
  },
  {
    slug: 'remote-work-africa',
    country: 'Africa',
    h1: 'Remote Jobs from Africa: How to Compete for Global Roles',
    title: 'Remote Jobs from Africa \u2014 How to Land Global Roles from Anywhere',
    description:
      'How to get a remote job from Africa with UK, US, Canadian and Australian employers: where global roles are actually posted, how to present African experience to overseas recruiters, how payment and time zones work, and how to spot scams.',
    intro:
      'Remote work lets professionals across Africa apply directly to employers in London, Toronto, New York, Berlin and Sydney, competing on skill rather than location. This guide covers where those roles are genuinely advertised, how to present your experience to employers who may not know your market, and the practical questions about payment, time zones and legitimacy.',
    sections: [
      {
        h2: 'Where global remote roles are actually advertised',
        paras: [
          'Most international remote hiring happens on the employer\u2019s own careers page and on a small number of specialised boards, rather than on the big local job sites. If you are only searching local boards, you are seeing a fraction of what is available.',
        ],
        list: [
          '<strong>The employer\u2019s careers page, directly.</strong> This is the highest-signal channel. Roles appear here first and are often advertised nowhere else. If you have a target list of companies, check their pages on a schedule.',
          '<strong>LinkedIn, used as a search tool.</strong> Recruiters search by keyword and filter by region. A profile that mirrors the roles you want makes you findable, and stating your location honestly while saying you are open to remote work in your headline avoids wasted conversations.',
          '<strong>Remote-specific boards.</strong> Dedicated remote job boards aggregate distributed roles across function and seniority. Worth checking, but treat them as a supplement to direct applications rather than a substitute.',
          '<strong>Communities and referrals.</strong> Professional Slack and Discord communities for your discipline frequently carry roles that never get posted publicly. Referrals convert far better than cold applications in every market.',
        ],
      },
      {
        h2: 'Presenting African experience to an overseas recruiter',
        paras: [
          'The most common avoidable mistake is assuming the reader knows your context. A recruiter in Manchester may not know what a given local bank, university or professional body is, and should not be expected to research it.',
        ],
        list: [
          '<strong>Give context inside the achievement.</strong> "Managed operations at a mid-sized logistics firm serving 40 clients across two states" tells an overseas reader far more than a company name they have never heard.',
          '<strong>State scale, currency and outcome.</strong> Team size, budget, user counts, revenue, percentages. Numbers translate across markets and are the signal a foreign reader can evaluate fastest.',
          '<strong>Keep formatting conservative.</strong> International screening software is stricter than most local processes. Single column, standard headings, and no photograph, date of birth, marital status or ID number \u2014 many overseas employers screen those out entirely.',
          '<strong>Name your tools plainly.</strong> Software and platform names are the most portable vocabulary you have. If you use Excel, Python, Figma, Salesforce, Jira or QuickBooks, list them \u2014 that is often how you match.',
        ],
      },
      {
        h2: 'Time zones are an advantage more often than a problem',
        paras: [
          'Most of Africa sits between UTC and UTC+3, which overlaps comfortably with European working hours and gives employers a useful head start over North American teams. Distributed teams routinely describe the extended shared window as a benefit rather than friction.',
          'For United States employers the overlap is partial depending on where you are. Be explicit and confident about the hours you can genuinely cover, and consistent about it once hired. Vagueness about availability is one of the most common reasons remote offers fall through late in the process.',
        ],
      },
      {
        h2: 'Payment and getting paid',
        paras: [
          'Payment is a practical question employers will ask, so have a clear answer ready. Options vary by employer and country: some use international payroll and compliance platforms that employ you locally on the client\u2019s behalf, some pay through international transfer services, and some engage you as a contractor.',
          'As a contractor you are usually responsible for your own tax and for invoicing. Confirm this explicitly before accepting, and ask how and when you will be paid, in which currency, and who bears transfer fees. Candidates who raise these questions professionally are treated as more credible, not less.',
        ],
      },
      {
        h2: 'How to tell a genuine remote role from a scam',
        paras: ['Remote hiring attracts fraud, and the patterns are consistent enough to spot.'],
        list: [
          'You are asked to pay for training, equipment, software or a "registration fee" before starting. Genuine employers never charge you to work for them.',
          'You are hired without any interview, or after nothing more than a chat-only exchange.',
          'You are asked to receive money, buy gift cards, or move funds on the employer\u2019s behalf. That is money laundering, and you would be the one exposed.',
          'The offer arrives from a free webmail address, or the domain does not match the company\u2019s real website.',
          'The pay is far above market for the stated experience, and the process is rushed hard.',
        ],
      },
      {
        h2: 'How Interview Ready helps',
        paras: [
          'The same CV is rarely right for both a local advert and an overseas one, so Interview Ready lets you tailor for each: paste the job description, see the keywords the screening software is matching on, and rewrite your achievements around them while keeping your voice intact. Export DOCX for portals and PDF for direct email.',
          'Start by checking where you stand. Your first ATS resume score is free, with no credit card required.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can you get a remote job from Africa without experience?',
        a: 'It is harder but achievable. Remote entry-level hiring rewards demonstrable proof over credentials, so build evidence first through projects, freelance work, volunteering or internships, then apply. Documenting that work with numbers is what moves you out of the pile of generic applications.',
      },
      {
        q: 'Do I need to hide my location when applying for remote roles?',
        a: 'No. Stating your location honestly while making clear in your headline that you are available for remote work avoids wasted interview cycles. Some roles are genuinely location-restricted; most distributed companies hire by skill and time-zone overlap.',
      },
      {
        q: 'Will employers pay less because I am based in Africa?',
        a: 'Pay practices vary widely. Some employers use location-based bands, others pay a single global rate for a role. Research the range before you interview, anchor on the value you deliver, and ask about the band explicitly rather than assuming.',
      },
      {
        q: 'Should I remove personal details from my CV for international roles?',
        a: 'Yes. Remove photographs, date of birth, marital status, religion and national identity numbers. Many overseas employers screen these out to comply with anti-discrimination practice, and their screening software does not need them.',
      },
      {
        q: 'Is Interview Ready free to use?',
        a: 'Your first ATS resume score is free with no credit card required. Core resume and cover letter formatting is free, and you can export DOCX and PDF files.',
      },
    ],
    related: [
      { slug: 'ai-mock-interview-practice-guide', title: 'AI Mock Interview: How to Practice Common Questions and Get Feedback That Actually Improves Your Answers' },
      { slug: 'choose-your-lane-specialization-growth', title: 'Choose Your Lane: Why Specialization Accelerates Career Growth' },
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
${locationNav()}
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
