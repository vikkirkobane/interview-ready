/**
 * InterviewReady LinkedIn-funnel email content: welcome + 5-email value drip.
 *
 * Lane: email-bot (§6 of InterviewReady_Master_Plan.md). KPIs: >40% open,
 * >5% click on drips, 150 subscribers / 90 days.
 *
 * Rules enforced here:
 *  - ONE tracked marketing CTA per email (master plan §4), always to
 *    appinterviewready.top with utm_source=email&utm_medium=email&utm_campaign=<key>.
 *  - Value-first copy; every product claim is traceable to a shipped feature:
 *    paste-JD AI analysis → tailored ATS resume, 280-380 word cover letter,
 *    job-fit/match score; AI mock interviews score structure/clarity/delivery;
 *    promo LINKEDIN20 = Tier-1 code granting 20 free AI credits at onboarding.
 *  - No fabricated social proof (no invented quotes/stats).
 */

import { ctaBlock, buildEmailShell } from './mail.js';
import {
  clickUrl,
  pixelUrl,
  unsubscribeUrl,
  PROMO_CODE,
  SITE_URL,
} from './lifecycle.js';

export interface CampaignVars {
  first: string; // first name or 'there'
  email: string;
  promo: string;
  credits: number;
}

export interface Campaign {
  key: string;
  label: string; // human name (weekly report labels)
  dayOffset: number;
  path: string; // CTA destination on appinterviewready.top (default '/')
  subject: string;
  preheader: string;
  headline: string; // email header
  subhead: string;
  text: (v: CampaignVars, ctaUrl: string) => string;
  body: (v: CampaignVars, ctaUrl: string) => string;
}

const SITE = SITE_URL;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function greet(v: CampaignVars): string {
  return `<p style="margin:0 0 14px;font-size:15px;color:#0D1117;font-weight:700;">Hi ${esc(v.first)},</p>`;
}

function tip(html: string): string {
  return `<div class="tip">${html}</div>`;
}

function ps(html: string): string {
  return `<p class="lead">${html}</p>`;
}

function bulletList(items: string[]): string {
  return `<ul style="margin:0 0 18px;padding-left:20px;"><li style="margin-bottom:7px;font-size:14px;color:#4B5563;line-height:1.55;">${items
    .map(esc)
    .join('</li><li style="margin-bottom:7px;font-size:14px;color:#4B5563;line-height:1.55;">')}</li></ul>`;
}

/** Inline 10-point ATS checklist - the lead magnet, delivered in-email. */
function atsChecklistHtml(): string {
  const rows: Array<[string, string]> = [
    ['One page. Two max.', 'Freshers and early-career: one page. Recruiters scan, parsers truncate.'],
    ['Plain structure, no graphics.', 'No photos, tables, columns or icons - a parser reads top-to-bottom, left-to-right.'],
    ['Your target role in the header.', 'Write the exact role you are applying for under your name; screens match against it.'],
    ['Mirror the JD\u2019s keywords - verbatim.', 'If the ad says "REST APIs", your resume should say "REST APIs", not "web services".'],
    ['Bullets, not duties.', 'Action verb + what you did + the result you can measure: "Cut report turnaround 40% with a Python script the team still uses."'],
    ['Put your numbers on it.', 'Calls, users, marks, code coverage, time saved. 8.2 CGPA, 120 LeetCode, 3 internships - all fair game.'],
    ['Plain dates and degrees.', 'No images of certificates, no abbreviations only you know.'],
    ['Standard file name + format.', 'FirstName_LastName_Resume.pdf, exported as real text (not a scanned image).'],
    ['Cut the filler lines.', '"References available on request", "hardworking", "team player" - every ATS-aware writer deletes these.'],
    ['Tailor per application.', 'A generic resume loses to a tailored one almost every time. This is the highest-ROI 15 minutes in your search.'],
  ];
  const lis = rows
    .map(
      ([h, d], i) =>
        `<tr><td style="vertical-align:top;padding:8px 0;border-bottom:1px solid #EEF2F7;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:30px;vertical-align:top;font-weight:800;font-size:13px;color:#0369A1;">${i + 1}.</td><td style="font-size:13.5px;color:#334155;line-height:1.5;"><strong style="color:#0F172A;">${esc(h)}</strong> ${esc(d)}</td></tr></table></td></tr>`
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin:6px 0 8px;background:#FCFDFF;"><tr><td style="padding:14px 18px 4px;background:#F8FAFC;border-bottom:1px solid #E5E7EB;"><span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#0D1117;">Your free ATS checklist</span></td></tr>${lis}</table>`;
}

/* ------------------------------------------------------------------ */
/* WELCOME  (immediate on capture)                                     */
/* ------------------------------------------------------------------ */

export const welcomeCampaign: Campaign = {
  key: 'welcome',
  label: 'Welcome (immediate)',
  dayOffset: 0,
  path: '/ats-score',
  subject: 'Your free ATS resume score + 20 free credits',
  preheader: 'Your ATS checklist is inside, and your free AI resume score is one tap away.',
  headline: 'Your resume score is ready',
  subhead: 'Free AI ATS score, plus the 10-point checklist and 20 free credits.',
  text: (v, ctaUrl) =>
    [
      `Hi ${v.first},`,
      '',
      'Welcome aboard - you found us from LinkedIn. Your free ATS checklist is right below. Keep it open while you edit your resume this week:',
      '',
      '1. One page. Two max (freshers: one).',
      '2. No photos, tables, columns or icons - parsers read top-to-bottom.',
      '3. Your target role written under your name.',
      '4. Mirror the JD keywords verbatim.',
      '5. Bullets, not duties: action verb + what you did + the result.',
      '6. Numbers on everything: 8.2 CGPA, 120 problems, 3 internships.',
      '7. Plain dates and degrees. No certificate images.',
      '8. Standard file name: FirstName_LastName_Resume.pdf.',
      '9. Delete "References available on request" and "hardworking".',
      '10. Tailor every application - 15 minutes of the highest-ROI work in your search.',
      '',
      'What is Interview Ready? Paste any job description (or a LinkedIn job URL) and it analyzes the posting, then drafts a tailored ATS resume and cover letter and gives you a job-fit score - in minutes, not evenings.',
      '',
      `And because you came from LinkedIn: enter ${v.promo} when you sign up and ${v.credits} free AI credits land in your account immediately.`,
      '',
      `\u2192 Get my free AI ATS resume score: ${ctaUrl}`,
      '',
      `Code: ${v.promo}  \u00b7  ${v.credits} free AI credits (one per account)`,
      '',
      '- The Interview Ready Team',
    ].join('\n'),
  body: (v, ctaUrl) =>
    [
      greet(v),
      ps('Welcome aboard - you found us from LinkedIn. Your free <strong>ATS checklist</strong> is below; keep it open while you edit your resume this week.'),
      atsChecklistHtml(),
      ps('<strong>So, what is Interview Ready?</strong> Paste any job description (or a LinkedIn job URL) and it analyzes the posting, then drafts a tailored ATS resume and cover letter and gives you a job-fit score. Minutes, not evenings.'),
      ps('<strong>Your free AI ATS resume score is one tap away:</strong> Interview Ready reads your resume against the role you want and scores it - then shows you exactly which gaps to close.'),
      tip(`Because you came from LinkedIn: enter <strong style="letter-spacing:1px;">${v.promo}</strong> when you sign up and <strong>${v.credits} free AI credits</strong> are credited to your account immediately. One per account, no strings.`),
      ctaBlock(ctaUrl, 'Get my free ATS resume score'),
    ].join(''),
};

/* ------------------------------------------------------------------ */
/* DRIP-1  (+4d) - resume deep value + ATS builder push                */
/* ------------------------------------------------------------------ */

export const drip1: Campaign = {
  key: 'drip-1',
  label: 'Drip 1 (resume myth-bust)',
  dayOffset: 4,
  path: '/',
  subject: 'The mistake that gets resumes filtered before a human sees them',
  preheader: "It's not your experience. It's how the parser reads you.",
  headline: 'Your resume is read by a machine first',
  subhead: 'Here is how to pass it, and the human after it.',
  text: (v, ctaUrl) =>
    [
      `Hi ${v.first},`,
      '',
      'Most resumes are rejected before a person reads them. The first reader is a parser that scores your document against the job description - keywords, structure, format.',
      '',
      'Three fixes that move the score most:',
      '',
      '1. Copy the exact wording from the JD. If it says "REST APIs", write "REST APIs", not "web services".',
      '2. Lead bullets with measurable results ("cut report time 40%"), not duties.',
      '3. Kill the tables, photos and columns - parsers flatten them and the human gets a mess.',
      '',
      'That is the mechanical half. The human half: tailoring your story to one role beats a perfect generic resume every time.',
      '',
      `Interview Ready does step 1 and 2 for you: paste a job description and it rewrites your bullets to match that exact posting. Worth trying on the one role you actually want this week.`,
      '',
      `\u2192 Tailor one resume this week: ${ctaUrl}`,
      '',
      '- The Interview Ready Team',
    ].join('\n'),
  body: (v, ctaUrl) =>
    [
      greet(v),
      ps('Most resumes die before a person reads them. The first reader is a <strong>parser</strong> that scores your document against the job description (keywords, structure, format), and only then does a human look.'),
      ps('Three fixes move that score more than anything else:'),
      bulletList([
        'Copy the JD\u2019s exact wording. It says "REST APIs"? Write "REST APIs", not "web services".',
        'Lead bullets with measurable results ("cut report turnaround 40%"), not duties.',
        'Kill tables, photos and columns. Parsers flatten them and hand the human a mess.',
      ]),
      ps('The mechanical half is only half. The human half is tailoring your story to <strong>one</strong> role: a tailored resume beats a perfect generic one almost every time.'),
      tip('Interview Ready does the mechanical half for you: paste a job description and it rewrites your bullets to match that exact posting. Try it on the one role you actually want this week.'),
      ctaBlock(ctaUrl, 'Tailor one resume this week'),
    ].join(''),
};

/* ------------------------------------------------------------------ */
/* DRIP-2  (+7d) - job-match analysis feature push                     */
/* ------------------------------------------------------------------ */

export const drip2: Campaign = {
  key: 'drip-2',
  label: 'Drip 2 (job-match analysis)',
  dayOffset: 7,
  path: '/',
  subject: 'Stop applying to roles you will not get: check fit first',
  preheader: 'A 2-minute fit check before you spend an hour applying.',
  headline: 'Apply to jobs you can actually win',
  subhead: 'Check your fit before you invest an evening in an application.',
  text: (v, ctaUrl) =>
    [
      `Hi ${v.first},`,
      '',
      'The cheapest mistake in a job search is applying to roles that were never a fit - then wondering why nothing comes back.',
      '',
      'Before you write a single tailored bullet, run the posting through a fit check:',
      '',
      '\u2022 Does the JD ask for 2 of your 3 strongest skills? (Most "requirements" are wishlists - you need the core ones.)',
      '\u2022 Are your keywords in their language? Match theirs, not your old resume\u2019s.',
      '\u2022 What is the one gap they will probe in the interview? Have a story ready for it.',
      '',
      'Interview Ready\u2019s job-match analysis does exactly this: paste any job URL or description and get a match score plus the specific skills to close the gap.',
      '',
      `\u2192 Check my fit on a real posting: ${ctaUrl}`,
      '',
      '- The Interview Ready Team',
    ].join('\n'),
  body: (v, ctaUrl) =>
    [
      greet(v),
      ps('The cheapest mistake in a job search is applying to roles that were never a fit - then wondering why nothing comes back.'),
      ps('Run the posting through a quick fit check <strong>before</strong> you write a single bullet:'),
      bulletList([
        'Does the JD lean on 2 of your 3 strongest skills? Most requirement lists are wishlists - you only need the core ones.',
        'Is your vocabulary theirs? ATS scoring rewards their keywords, not your old resume\u2019s.',
        'What one gap will they probe in the interview? Have a closing story ready before you apply.',
      ]),
      ps('That is exactly what <strong>job-match analysis</strong> does: paste any job URL or description and get a match score plus the specific skills to close the gap - before you spend the evening applying.'),
      ctaBlock(ctaUrl, 'Check my fit on a real posting'),
    ].join(''),
};

/* ------------------------------------------------------------------ */
/* DRIP-3  (+11d) - mock interviews feature push                       */
/* ------------------------------------------------------------------ */

export const drip3: Campaign = {
  key: 'drip-3',
  label: 'Drip 3 (mock interviews)',
  dayOffset: 11,
  path: '/',
  subject: 'Practice the question every fresher fumbles',
  preheader: '"Tell me about yourself": 60 seconds, no rambling.',
  headline: 'Interviews are a skill. Practice it out loud.',
  subhead: 'One question, 60 seconds, honest feedback.',
  text: (v, ctaUrl) =>
    [
      `Hi ${v.first},`,
      '',
      'Every fresher interview starts the same way: "Tell me about yourself." And most answers die in the first 20 seconds - either a recitation of the CV (which the interviewer already has) or an unfocused ramble.',
      '',
      'The 60-second answer that works:',
      '',
      '1. 10 seconds: who you are now (final-year CS student / junior engineer / career switcher).',
      '2. 30 seconds: the one or two things you have actually built or done, with a number attached.',
      '3. 20 seconds: why this role, in their words, from their JD.',
      '',
      'Say it out loud three times. Your mouth will trip where your brain did not - that is the point of practicing.',
      '',
      'Interview Ready\u2019s AI mock interviews score your structure, clarity and delivery on questions like this one, so the first time you answer it for real is not your first time.',
      '',
      `\u2192 Run a practice interview: ${ctaUrl}`,
      '',
      '- The Interview Ready Team',
    ].join('\n'),
  body: (v, ctaUrl) =>
    [
      greet(v),
      ps('Every fresher interview starts the same way: <em>"Tell me about yourself."</em> And most answers die in the first 20 seconds - reciting the CV the interviewer already has, or rambling without a spine.'),
      ps('The 60-second answer that works:'),
      bulletList([
        '<strong>10 seconds:</strong> who you are now: final-year student, junior engineer, career switcher.',
        '<strong>30 seconds:</strong> the one or two things you have actually built, with a number attached.',
        '<strong>20 seconds:</strong> why this role, in their words, borrowed from their JD.',
      ]),
      tip('Say it out loud three times. Your mouth will trip where your brain did not - that is exactly why you practice.'),
      ps('Interview Ready\u2019s <strong>AI mock interviews</strong> score your structure, clarity and delivery on real questions, so the first time you answer in a real room is not your first time.'),
      ctaBlock(ctaUrl, 'Run a practice interview'),
    ].join(''),
};

/* ------------------------------------------------------------------ */
/* DRIP-4  (+14d) - momentum + credits nudge (social proof, honest)    */
/* ------------------------------------------------------------------ */

export const drip4: Campaign = {
  key: 'drip-4',
  label: 'Drip 4 (credits nudge / momentum)',
  dayOffset: 14,
  path: '/',
  subject: 'LINKEDIN20 is still waiting on your account',
  preheader: '20 free AI credits, plus the routine that actually moves a search.',
  headline: 'The people who land jobs do one thing differently',
  subhead: 'Small weekly loops beat heroic weekends.',
  text: (v, ctaUrl) =>
    [
      `Hi ${v.first},`,
      '',
      'A quick honest observation from watching job searches play out: the people who land roles rarely make one giant push. They run a small weekly loop:',
      '',
      '1. Pick ONE role that is a genuine fit.',
      '2. Tailor your resume to its exact keywords.',
      '3. Practice the two questions you expect.',
      '4. Apply, then move on without re-reading the application 14 times.',
      '',
      'Four hours a week, done consistently, beats a 40-hour panic every month.',
      '',
      'Your LINKEDIN20 code is still unclaimed on this account: enter it at signup and 20 free AI credits appear instantly - enough to analyze several job postings and tailor resumes for each.',
      '',
      `\u2192 Claim LINKEDIN20 and start this week\u2019s loop: ${ctaUrl}`,
      '',
      `Code: ${v.promo} \u00b7 ${v.credits} free AI credits`,
      '',
      '- The Interview Ready Team',
    ].join('\n'),
  body: (v, ctaUrl) =>
    [
      greet(v),
      ps('A quick, honest observation from watching searches play out: people who land roles rarely make one giant push. They run a <strong>small weekly loop</strong>:'),
      bulletList([
        'Pick <strong>one</strong> role that is a genuine fit.',
        'Tailor your resume to its exact keywords.',
        'Practice the two questions you expect.',
        'Apply - then move on without re-reading the application 14 times.',
      ]),
      ps('Four focused hours a week beats a 40-hour panic every month.'),
      tip(`Your <strong>${v.promo}</strong> code is still unclaimed on this account. Enter it at signup and <strong>${v.credits} free AI credits</strong> appear instantly - enough to analyze several postings and tailor a resume for each.`),
      ctaBlock(ctaUrl, 'Claim LINKEDIN20 & start the loop'),
    ].join(''),
};

/* ------------------------------------------------------------------ */
/* DRIP-5  (+18d) - closing value + last CTA                           */
/* ------------------------------------------------------------------ */

export const drip5: Campaign = {
  key: 'drip-5',
  label: 'Drip 5 (closing value)',
  dayOffset: 18,
  path: '/',
  subject: 'One 5-minute habit before every interview',
  preheader: 'This is the last scheduled email: here is the habit that sticks.',
  headline: 'The 5-minute rule before any interview',
  subhead: 'Our last scheduled email. Make it count.',
  text: (v, ctaUrl) =>
    [
      `Hi ${v.first},`,
      '',
      'Before any interview, take 5 minutes and write down:',
      '',
      '1. The three skills the JD repeats most - and one proof story for each.',
      '2. One question they will almost certainly ask - and your 60-second answer.',
      '3. Two questions to ask THEM. ("What does the first 90 days look like?" never fails.)',
      '',
      'That is it. Five minutes, on paper, before the call. It turns a nervous candidate into someone who sounds prepared - because they are.',
      '',
      'This is the last scheduled email from us, so here is the honest summary: the tooling side is built (ATS resume tailoring, job-match analysis, mock interviews), and your LINKEDIN20 credits are still there for the taking at signup. The rest is the weekly loop from the last email.',
      '',
      `\u2192 See what you are missing: ${ctaUrl}`,
      '',
      'Reply to this email anytime - a real person reads it. Go land it.',
      '',
      '- The Interview Ready Team',
    ].join('\n'),
  body: (v, ctaUrl) =>
    [
      greet(v),
      ps('Before any interview, take five minutes and write down:'),
      bulletList([
        'The three skills the JD repeats most - plus one proof story for each.',
        'One question they will almost certainly ask - and your 60-second answer.',
        'Two questions to ask <strong>them</strong>. ("What does the first 90 days look like?" never fails.)',
      ]),
      ps('Five minutes, on paper, before the call. It turns a nervous candidate into someone who sounds prepared - because they are.'),
      ps('This is our last scheduled email. The honest summary: the tooling is built (<strong>ATS resume tailoring, job-match analysis, AI mock interviews</strong>), and your <strong>' +
        v.promo +
        '</strong> credits (20 free) are still waiting at signup. The rest is the weekly loop.'),
      ctaBlock(ctaUrl, 'See what you are missing'),
      ps('Reply to this email anytime - a real person reads it. Go land it.'),
    ].join(''),
};

/* ------------------------------------------------------------------ */
/* Registry                                                           */
/* ------------------------------------------------------------------ */

export const CAMPAIGNS: Campaign[] = [welcomeCampaign, drip1, drip2, drip3, drip4, drip5];

export function campaignByKey(key: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.key === key);
}

/** Render every transport piece for one campaign + one subscriber. */
export function renderCampaign(
  key: string,
  vars: CampaignVars
): { campaign: Campaign; subject: string; text: string; html: string } | null {
  const campaign = campaignByKey(key);
  if (!campaign) return null;

  // Final destination: ONE UTM-tagged link per email (master plan §4/§5.2).
  const dest = new URL(campaign.path, SITE_URL);
  dest.searchParams.set('utm_source', 'email');
  dest.searchParams.set('utm_medium', 'email');
  dest.searchParams.set('utm_campaign', campaign.key);
  if (key === 'welcome') dest.searchParams.set('promo', PROMO_CODE);
  const destStr = dest.toString();

  // The CTA href is our click-tracker, which 302s to the UTM destination.
  const ctaUrl = clickUrl(vars.email, campaign.key, destStr);
  const sendId = `send-${vars.email}-${campaign.key}-${Date.now()}`;
  const pixel = pixelUrl(vars.email, campaign.key, sendId);

  const text =
    campaign.text(vars, ctaUrl) +
    '\n\n' +
    'You are receiving this because you joined the Interview Ready list from LinkedIn.\n' +
    `Unsubscribe: ${unsubscribeUrl(vars.email)}`;

  const html = buildEmailShell({
    preheader: campaign.preheader,
    headline: campaign.headline,
    subhead: campaign.subhead,
    bodyHtml:
      campaign.body(vars, ctaUrl) +
      `<img src="${pixel}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />`,
    unsubscribeUrl: unsubscribeUrl(vars.email),
  });

  return { campaign, subject: campaign.subject, text, html };
}
