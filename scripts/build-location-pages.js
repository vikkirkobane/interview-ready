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
  {
    slug: 'ghana',
    country: 'Ghana',
    h1: 'CV Help for Jobs in Ghana: Get Past the ATS and Shortlisted',
    title: 'CV Help for Jobs in Ghana \u2014 Beat the ATS and Get Shortlisted',
    description:
      'How to write an ATS-friendly CV for jobs in Ghana: what Accra recruiters screen for, how to turn National Service into real experience, why private-sector NSS placements convert into jobs, and how to tailor your CV to each advert for free.',
    intro:
      'Ghana produces far more graduates each year than the formal economy absorbs, and competition concentrates heavily on Accra. Most applications are filtered by software before a recruiter reads them. This guide covers what Ghanaian employers and applicant tracking systems actually look at, how to present National Service as evidence rather than filler, and where graduate roles are genuinely filled.',
    stats: [
      {
        value: '~300,000',
        label:
          'graduates enter Ghana\u2019s labour market each year, and close to 60% fail to secure stable employment.',
        source:
          'Ghana Statistical Service figures cited by the Ministry of Employment and Labour Relations, reported by <a href="https://www.ecofinagency.com/news-services/0501-51764-ghana-faces-graduate-employment-crisis-as-60-remain-jobless" target="_blank" rel="noopener nofollow">Ecofin Agency</a>, 2025',
      },
      {
        value: '32%',
        label:
          'youth unemployment among Ghanaians aged 15\u201324 in 2025, against a 13% national rate \u2014 and 49.3% in Greater Accra for the same age band.',
        source:
          'Ghana Statistical Service Quarterly Labour Statistics, 2025',
      },
    ],
    sections: [
      {
        h2: 'Why good graduates still get filtered out',
        paras: [
          'Ghana\u2019s graduate market is defined by a mismatch: employers report a shortage of industry-ready talent while large numbers of qualified graduates struggle to find work. Both things are true at once, and they shape how hiring actually happens.',
          'Because volume is high, employers and recruiters use applicant tracking systems \u2014 software that parses each CV, compares it to the job description, and filters or ranks candidates by keyword match before anyone shortlists. If your CV cannot be parsed cleanly, or does not use the employer\u2019s own vocabulary, it is discarded before a human ever sees it. That is a mechanical problem with a mechanical fix.',
        ],
      },
      {
        h2: 'What Ghanaian recruiters and screening software look for',
        list: [
          '<strong>Parseable formatting.</strong> Tables, columns, text boxes and graphics break CV parsing. Skill bars and icons are invisible to the software. A single-column layout with standard headings \u2014 Work Experience, Education, Skills, National Service \u2014 is read reliably.',
          '<strong>A DOCX where the portal accepts it.</strong> If a PDF is required, export a text-based PDF rather than a scanned or image-heavy one the parser may read as blank.',
          '<strong>Exact keyword matches.</strong> If the advert asks for "financial reporting" and your CV says "accounting duties", a keyword filter may not connect them. Mirror the employer\u2019s wording wherever it is honestly accurate.',
          '<strong>Digital and technical keywords.</strong> Ghanaian employers and government assessments consistently flag gaps in practical, technical and digital skills. Naming the specific tools you genuinely use \u2014 Excel, SQL, Power BI, QuickBooks, Python, Canva \u2014 matches the filters employers are actually running.',
          '<strong>Quantified achievements.</strong> "Helped with sales" says nothing. "Grew monthly sales for the Accra territory from GH\u20b518,000 to GH\u20b531,000 in two quarters" gives the software keywords and gives the human a reason to call.',
        ],
      },
      {
        h2: 'How to turn National Service into real experience',
        paras: [
          'Ghana\u2019s National Service Scheme places tens of thousands of tertiary graduates each year into twelve-month postings. Many graduates list it as one line \u2014 "National Service, 2024" \u2014 which reads as a gap rather than a job.',
          'Written properly it is a year of documented work. Name the organisation, your actual role, and what you delivered, with numbers. If you managed records, ran a budget, taught, built a database, or coordinated a project, describe the outcome. Those are the keywords that match entry-level job descriptions.',
          'National Service has quietly become an informal recruitment pipeline in Ghana: private-sector placements are heavily oversubscribed precisely because the chance of conversion to a full-time role is higher than in public postings. If you are still serving, list it as current experience and treat the posting as a twelve-month interview.',
        ],
      },
      {
        h2: 'Where graduate jobs in Ghana are actually filled',
        paras: [
          'Competition concentrates in Accra, where youth unemployment in the 15\u201324 band reached 49.3% \u2014 the highest recorded for that age group. That means the capital is where the roles are, and also where the queue is longest. Widening your search matters as much as perfecting your CV.',
        ],
        list: [
          '<strong>Private-sector National Service placements.</strong> The most direct route. Competition is intense, but conversion into permanent employment is markedly more likely than from a public-sector posting.',
          '<strong>Graduate and management trainee schemes.</strong> Banks, telecoms, insurance, FMCG and professional services firms run structured intakes. These are the most competitive and the ones where formatting and keyword discipline matter most.',
          '<strong>MSMEs and funded startups.</strong> Small and medium enterprises make up the bulk of Ghanaian private-sector employment. They rarely advertise widely and often hire through referral or LinkedIn, which is where a keyword-rich profile earns its keep.',
          '<strong>Public sector and agencies.</strong> Formal postings appear on official channels rather than aggregators, so check them directly. Public roles are heavily preferred in Ghana, which is precisely why the queue is longest there.',
          '<strong>Regional markets.</strong> Kumasi, Takoradi and Tamale carry far less competition per vacancy than Accra. If you are mobile, the same CV converts better outside the capital.',
        ],
      },
      {
        h2: 'Remote and international roles from Ghana',
        paras: [
          'Remote work gives Ghanaian professionals direct access to employers in the United Kingdom, United States, Canada and across Africa, competing on skill rather than location. Ghana sits between UTC and UTC+1, which overlaps fully with European working hours and gives a genuine advantage over other regions.',
          'International applicant pools are larger and their screening software is stricter about format, so tailoring matters more, not less. State your location honestly, say you are available for remote work, and list your tools \u2014 software names travel better than local job titles.',
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
        q: 'What is an ATS-friendly CV in Ghana?',
        a: 'An ATS-friendly CV is built so applicant tracking software can read it accurately: a single-column layout with standard headings, no tables, columns or text boxes, a text-based file rather than a scanned image, and the keywords from the job advert used naturally inside your achievements.',
      },
      {
        q: 'How should I list National Service on my CV?',
        a: 'Treat it as work experience, not a gap. Include the organisation, your role, and what you delivered, with numbers where you have them. Listing only "National Service" wastes a section that can otherwise carry real entry-level keywords and demonstrate a year of professional output.',
      },
      {
        q: 'Why is it so hard to get a job in Ghana after graduating?',
        a: 'Roughly 300,000 graduates enter the market each year and close to 60% do not secure stable employment, while employers simultaneously report a shortage of industry-ready talent. Competition concentrates in Accra, where youth unemployment for ages 15\u201324 reached 49.3%. Widening your search beyond the capital and matching employer keywords precisely both improve your odds.',
      },
      {
        q: 'Should I include a photograph or personal details on my CV?',
        a: 'Only if the employer specifically asks. Modern recruitment practice generally ignores this information, and it takes space that could carry achievements that actually match the job advert.',
      },
      {
        q: 'Should I send my CV as PDF or Word?',
        a: 'Use whichever format the employer requests. Where you have a choice, DOCX parses most reliably. If a PDF is required, export a text-based PDF rather than a scanned image, which screening software may read as blank.',
      },
      {
        q: 'Is Interview Ready free to use?',
        a: 'Your first ATS resume score is free and no credit card is required to create an account. Core resume and cover letter formatting is also free, with DOCX and PDF export.',
      },
    ],
    related: [
      { slug: 'free-ats-resume-checker-guide', title: 'Free ATS Resume Checker: Does Your Fresher Resume Pass the 6-Second Test?' },
      { slug: 'resume-building-year1-interview-success', title: 'Why Building Your Resume in Year 1 of College Sets You Up for Interview Success' },
      { slug: 'questions-job-seekers-ask-before-interview', title: 'The Questions Job Seekers Ask Most Before an Interview and How to Answer Them' },
    ],
  },
  {
    slug: 'south-africa',
    country: 'South Africa',
    h1: 'CV Help for Jobs in South Africa: Beat the ATS and Get Shortlisted',
    title: 'CV Help for Jobs in South Africa \u2014 Beat the ATS and Get Shortlisted',
    description:
      'How to write an ATS-friendly CV for jobs in South Africa: what Johannesburg and Cape Town recruiters screen for, how to handle qualifications and employment-equity information, and how to tailor your CV to each advert for free.',
    intro:
      'South Africa has one of the highest youth unemployment rates in the world, and graduate applicants face the toughest competition of all. Most applications are filtered by software before a recruiter reads them. This guide covers what South African employers and applicant tracking systems actually look at, how qualifications and equity information should be handled, and how to make your CV survive the first pass.',
    stats: [
      {
        value: '47.4%',
        label:
          'youth unemployment among South Africans aged 15\u201334, against a 33.6% national rate.',
        source:
          'Statistics South Africa Quarterly Labour Force Survey, Q2 2026',
      },
      {
        value: '~1 in 2',
        label:
          'graduates are unemployed or underemployed within the first year of graduating.',
        source:
          'Reported by <a href="https://www.businessday.co.za/economy/2026-05-12-young-people-hit-hardest-as-unemployment-rises-to-327/" target="_blank" rel="noopener nofollow">Business Day</a>, citing Statistics South Africa, 2026',
      },
    ],
    sections: [
      {
        h2: 'Why qualified graduates still get filtered out',
        paras: [
          'South Africa\u2019s youth unemployment is structural rather than a reflection of individual effort. Growth has been too slow to absorb new entrants, and for people aged 15\u201324 the absorption rate was just 10.1% \u2014 the lowest of any age group, meaning very few young people who want work are actually in it.',
          'In a market that tight, a single advertised graduate role can attract hundreds or thousands of applications. Employers use applicant tracking systems to cope: software that parses each CV, scores it against the job description, and filters or ranks candidates by keyword match before a human shortlists. If your CV cannot be parsed, or does not mirror the advert\u2019s language, it is discarded at the first stage regardless of your ability.',
        ],
      },
      {
        h2: 'What South African recruiters and screening software look for',
        list: [
          '<strong>Parseable formatting.</strong> Multi-column designs, tables, text boxes and graphics break CV parsing. Skill bars, icons and infographics are invisible to the software. A single-column layout with standard headings \u2014 Work Experience, Education, Skills, Certifications \u2014 is read reliably.',
          '<strong>Quantified achievements.</strong> "Responsible for the sales team" says nothing. "Led a five-person sales team that grew regional revenue 18% year on year" gives the software keywords and gives the human a reason to call.',
          '<strong>Qualifications stated clearly and early.</strong> South Africa uses the National Qualifications Framework, and many employers and automated screens look for the qualification level and institution. State your qualification, level and institution plainly rather than burying it.',
          '<strong>Specific hard skills and tools.</strong> Employers increasingly screen on digital skills. Name the tools you genuinely use \u2014 Excel, SQL, Power BI, Pastel, SAP, Python, Jira \u2014 because that is often how candidates are filtered.',
          '<strong>Driver\u2019s licence, where relevant.</strong> For roles involving travel, client visits or field work, a valid code 8 or 10 licence is a common screening requirement. If you hold one, put it on the CV rather than in a covering paragraph.',
        ],
      },
      {
        h2: 'Employment equity information: what actually goes on your CV',
        paras: [
          'South Africa\u2019s Employment Equity Act requires designated employers to report on the demographic composition of their workforce and to work toward equitable representation. That is a real part of how hiring works here, and applicants often ask whether they should disclose demographic information.',
          'The practical distinction: equity reporting is an employer obligation, and where an application form asks for demographic details for that purpose, disclosure is typically voluntary \u2014 you may answer "prefer not to say". But your CV itself does not need a race, gender or disability section. It should carry your qualifications, experience and skills, and your achievements should do the talking.',
          'What matters far more is that the substance of your CV matches the advert. Equity considerations sit alongside the shortlist; they do not rescue a document the screening software cannot read.',
        ],
      },
      {
        h2: 'Where graduate jobs in South Africa are actually filled',
        paras: [
          'Publicly advertised roles are the most competitive channel of all. A large share of hiring happens before or alongside a formal posting.',
        ],
        list: [
          '<strong>Graduate and internship programmes.</strong> Banks, insurers, mining houses, telecoms, retailers and professional services firms run structured annual intakes, often with an internship that converts to a permanent role. These are the most competitive and where keyword discipline matters most.',
          '<strong>Smaller and mid-sized firms.</strong> These hire continuously and rarely advertise widely, often through LinkedIn or referral. Competition per vacancy is far lower than for graduate schemes.',
          '<strong>Public sector and municipal roles.</strong> Posted on official channels rather than aggregators, so check them directly. These are a large source of formal employment and often overlooked by graduates.',
          '<strong>LinkedIn as a search tool.</strong> Recruiters search by keyword and filter by location. A profile mirroring your target roles makes you findable, which is the same keyword logic as your CV applied to search.',
        ],
      },
      {
        h2: 'Remote and international roles from South Africa',
        paras: [
          'South Africa has an established remote-work market, and professionals compete directly for roles with employers in the United Kingdom, United States, Canada and Europe. The time zone works in your favour: South African Standard Time is only one hour ahead of Central European Time, giving a full overlap with European working hours and a useful early start over North American teams.',
          'Two practical notes. International applicant pools are larger and their screening software is stricter about format, so tailoring matters more, not less. And because South African recruiters legitimately need qualification levels while international employers often do not, keep two tailored versions of the same underlying CV rather than sending one document to both.',
        ],
      },
      {
        h2: 'How Interview Ready helps',
        paras: [
          'Interview Ready reads the job description you paste, works out which terms the screening software is most likely to match on, and rewrites your achievements around them while keeping your own voice. It exports a clean, parseable DOCX and a print-ready PDF.',
          'Check where you stand before you apply: paste your current CV against the advert and get a free ATS score with the keyword gaps it finds. No credit card needed to start.',
        ],
      },
    ],
    faq: [
      {
        q: 'What is an ATS-friendly CV in South Africa?',
        a: 'An ATS-friendly CV is formatted so applicant tracking software can read it accurately: a single-column layout with standard headings, no tables, columns or text boxes, a text-based file rather than a scanned image, and the keywords from the job advert used naturally within your achievements.',
      },
      {
        q: 'Should I put my race, gender or disability status on my CV?',
        a: 'No. Your CV should carry your qualifications, experience, skills and achievements. Where an application form asks for demographic information for employment-equity reporting, that disclosure is typically voluntary and you may decline to answer.',
      },
      {
        q: 'How long should a CV be in South Africa?',
        a: 'One to two pages for most roles, and one page if you have under about five years of experience. Recruiters screening at high volume spend very little time per document, so relevance beats length.',
      },
      {
        q: 'Why can I not get a job even with a degree?',
        a: 'The problem is structural. Unemployment stands at 33.6% overall and 47.4% for ages 15\u201334, and the absorption rate for ages 15\u201324 was only 10.1%, meaning very few young people who want work are in it. With that much competition per vacancy, accurate keyword matching and applying beyond one channel are what move your application out of the pile.',
      },
      {
        q: 'Should I send my CV as PDF or Word?',
        a: 'Use whichever format the employer requests. Where you have a choice, DOCX parses most reliably. If a PDF is required, export a text-based PDF rather than a scanned image, which screening software may read as blank.',
      },
      {
        q: 'Is Interview Ready free to use?',
        a: 'Your first ATS resume score is free and no credit card is required to create an account. Core resume and cover letter formatting is also free, with DOCX and PDF export.',
      },
    ],
    related: [
      { slug: 'free-ats-resume-checker-guide', title: 'Free ATS Resume Checker: Does Your Fresher Resume Pass the 6-Second Test?' },
      { slug: 'ai-mock-interview-practice-guide', title: 'AI Mock Interview: How to Practice Common Questions and Get Feedback That Actually Improves Your Answers' },
      { slug: 'interview-silence-guide', title: 'What to Do When an Interviewer Goes Quiet' },
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
