# Interview Ready — Build Now Programme Coaching Session 1 Dossier

**Programme:** Tech Wings Africa — Build Now Programme (Cohort 1)  
**Venture:** Interview Ready (`com.interviewready.app`)  
**Session Title:** Session 1: Alignment, Current State Assessment & 6-Month Strategic Roadmap  
**Target Duration:** ~2 Hours  
**Document Purpose:** Comprehensive preparation deck & strategic documentation answering all core focus areas for the first coaching engagement.

---

## Executive Summary & Session Agenda

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        BUILD NOW COACHING SESSION 1 ROADMAP                            │
├──────────────────┬─────────────────────────────────────────────────────────────────────┤
│ 1. Introductions │ Founder journey, venture vision & coaching alignment                │
│ 2. Current State │ Technical architecture, core features, auth, payments, traction     │
│ 3. 6-Month Goals │ Milestones: Mobile launch → 25k users → $10k MRR → Pre-Seed ready   │
│ 4. Market & Unit │ TAM/SAM/SOM, African pricing parity (M-Pesa/KES vs USD), 90%+ margin│
│ 5. Priorities    │ App Store release, B2B bootcamps, conversion funnel, voice AI       │
│ 6. Action Items  │ 14-day execution checklist & Next coaching review date agreement    │
└──────────────────┴─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Introductions & Alignment on the Coaching Engagement

### 1.1 Venture Vision & Mission
* **Vision:** To become Africa’s premier AI-powered career enablement and interview preparation ecosystem, democratizing access to global-standard career tools.
* **Mission:** Eliminate the structural friction African and emerging-market job seekers face when applying to local, regional, and global remote opportunities by providing accessible, hyper-tailored ATS optimization, AI mock interviews, and career roadmap intelligence.

### 1.2 Coaching Expectations & Working Cadence
* **Desired Coach Support:**
  * **Go-To-Market & Distribution:** Refining B2B partnerships with African tech accelerators (ALX, Moringa, Decagon, Andela Learning Community) and university placement centers.
  * **Monetization & Conversion Optimization:** Optimizing M-Pesa / Mobile Money checkout conversion rates and testing localized micro-pricing.
  * **Fundraising Readiness:** Structuring unit economics, traction metrics, and data rooms for Pre-Seed angel and early-stage VC syndicates.
* **Working Rhythm:** Bi-weekly 60-minute strategy check-ins, asynchronous Slack/WhatsApp updates on key metric tracking, and milestone-based reviews.

---

## 2. Current State of Interview Ready

### 2.1 The Problem We Are Solving
1. **High ATS Rejection Rates:** Over 75% of African candidates fail automated Applicant Tracking Systems because standard CV formats lack role-specific keyword alignment and quantifiable metrics.
2. **Interview Anxiety & Lack of Practice:** Candidates rarely have access to realistic technical, behavioral, and situational mock interviews with actionable feedback.
3. **Foreign Currency & Affordability Barriers:** Western career tools (Teal, Resume.io, Interviewing.io) cost $15–$50/month in USD, requiring international credit cards unavailable to many young African graduates.

### 2.2 Product Capabilities (Current Live Feature Suite)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PRODUCT ARCHITECTURE                                     │
├──────────────────────────┬─────────────────────────────────────────────────────────────┤
│ 1. AI Resume Builder     │ Tailored ATS resume generation, 6 modern templates,         │
│                          │ multi-format parsing (PDF/DOCX), and PDF/DOCX export.       │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 2. Job Analyzer & Fit    │ Extracts JD requirements, performs semantic keyword gap     │
│                          │ analysis, and calculates an ATS compatibility score.        │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 3. 14-Day Prep Roadmap   │ Generates a day-by-day structured curriculum based on the   │
│                          │ target role, company, and seniority level.                  │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 4. AI Mock Interviews    │ Interactive, multi-turn technical/behavioral interview      │
│                          │ simulations with real-time scoring and performance feedback.│
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 5. AI Cover Letter Tool  │ Custom company-aligned cover letters with tone selection.   │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 6. LinkedIn Optimizer    │ Headline, About section rewrite & 30-day networking plan.   │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 7. Company Research      │ AI dossiers on culture, tech stack, and strategic insights. │
├──────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 8. Ask AI Career Coach   │ Context-aware career assistant with document context.       │
└──────────────────────────┴─────────────────────────────────────────────────────────────┘
```

### 2.3 Technical Architecture & Stack
* **Frontend:** React Native 0.85.3 / Expo SDK 56 (cross-platform iOS, Android, and Web) with TypeScript.
* **Backend:** Supabase (Managed PostgreSQL, Row-Level Security, Realtime WebSockets, Storage).
* **Serverless Compute:** 44 Supabase Deno Edge Functions handling auth, AI orchestration, credit metering, and payments.
* **AI Pipeline:** Multi-model router with high-throughput primary models (DashScope / Qwen-Flash) and automatic fallback to OpenRouter (Llama 3.3 70B, Nemotron 120B, Gemini 2.0 Pro) with strict Zod JSON schema validation.
* **Payments:** Paystack integration supporting **M-Pesa (Kenya)** and **Credit/Debit Cards (Global/USD)** with automated server-side webhook verification.
* **Monetization Engine:** Hybrid model combining 10 free monthly AI credits, rewarded/interstitial AdMob monetization, and Pro subscription tiers.
* **Quality Assurance:** Comprehensive automated test suite comprising 39 test suites and ~240 test cases covering authentication flows, payment webhooks, export engines, and UI workflows.

---

## 3. Customer Discovery, Target Users & Personas

### 3.1 Target Customer Personas

| Persona | Profile & Demographics | Primary Pain Point | Core Value Proposition |
| :--- | :--- | :--- | :--- |
| **Persona A: The Emerging Tech Graduate** | 21–26 yrs old; University / Coding Bootcamp graduate in Nairobi, Lagos, or Accra | Rejected by ATS without feedback; cannot afford $20/mo tools | Free tier (10 credits) + KES 500 ($3.85/mo) via M-Pesa to generate ATS-optimized resumes |
| **Persona B: The Mid-Level Remote Seeker** | 26–34 yrs old; 3–7 yrs experience; Software / Product / Data professional | Needs high-caliber resumes and rigorous mock interview prep for US/EU remote jobs | Full access to tailored cover letters, LinkedIn optimization, and technical mock interviews |
| **Persona C: Diaspora & Relocation Candidate** | 24–38 yrs old; African professionals relocating to UK/Canada/Europe | Unfamiliar with country-specific hiring nuances and competency-based interview formats | 14-day structured roadmaps and company-specific research intelligence |

### 3.2 Key Customer Discovery Learnings
1. **Mobile-First Reality:** Over 80% of African job seekers draft applications and practice interviews on mobile devices or tablets rather than laptops.
2. **Friction in Document Uploads:** Users frequently store resumes in WhatsApp, Google Drive, or device downloads; robust native Android content URI caching and multi-format support (PDF/DOCX) was essential.
3. **Local Payment Channel Necessity:** In Kenya and Nigeria, credit card rejection rates on international gateways exceed 60%; integrating local payment rails (M-Pesa, Paystack) is a prerequisite for conversion.

---

## 4. Market Sizing, Pricing & Unit Economics

### 4.1 Market Sizing (TAM / SAM / SOM)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  TAM: Global Career Tech & AI Recruitment Market ($12.5B+)                       │
│  ├── 250M+ annual global job changers and graduates                              │
│                                                                                  │
│  SAM: African & Emerging Market Digital Job Seekers ($450M)                      │
│  ├── 50M+ university graduates, bootcamp grads, and white-collar workers in SSA  │
│                                                                                  │
│  SOM: Key African Tech Hubs Targetable by Interview Ready ($15M)                 │
│  └── 2.5M digital/tech job seekers in Kenya, Nigeria, Ghana, Rwanda & SA         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Pricing Architecture

| Tier | Pricing (Kenya / Local) | Pricing (Global / USD) | Key Features |
| :--- | :--- | :--- | :--- |
| **Free Tier** | Free (with AdMob ads) | Free (with AdMob ads) | 10 AI Credits / month, 2 Basic templates, JD analysis, Community support |
| **Premium Monthly** | **KES 500 / month** | **$5.00 / month** | Unlimited AI credits, all 6 templates, ATS scoring, Mock interviews, PDF/DOCX exports |
| **Premium Yearly** | **KES 5,000 / year** (Save 2 mos) | **$50.00 / year** (Save 2 mos) | Full Premium capabilities + priority support and yearly cost savings |
| **Premium Plus** | **KES 1,000 / mo** (KES 10k/yr) | **$10.00 / mo** ($100/yr) | Priority AI compute queue, deep career analytics, future API access |

### 4.3 Unit Economics & Gross Margins

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         UNIT ECONOMICS BREAKDOWN (PER USER)                      │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│ Average Monthly Subscription Revenue   │ $3.85 (KES 500) to $5.00 (USD)          │
│ Blended AI Inference Cost / Active User│ ~$0.15 – $0.35 / month                  │
│ Paystack Payment Processing Fee (2.9%) │ ~$0.11 – $0.15                          │
│ Supabase & Cloud Infrastructure / User │ ~$0.05                                  │
├────────────────────────────────────────┼─────────────────────────────────────────┤
│ Total Cost of Goods Sold (COGS)        │ ~$0.31 – $0.55 / user / month           │
│ Gross Profit per Paying User           │ $3.54 – $4.45 / month                   │
│ Gross Margin Percentage                │ 88% – 92%                               │
│ Target CAC (Organic + Campus Loops)    │ < $1.20                                 │
│ LTV (6-Month Average Retention)        │ $23.10 – $30.00                         │
│ LTV : CAC Ratio                        │ > 19 : 1 (Exceptional Capital Efficiency)│
└────────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 5. Six-Month Goals & Strategic Milestone Roadmap

```
  MONTH 1            MONTH 2            MONTH 3            MONTH 4            MONTH 5            MONTH 6
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Mobile App  │───>│ Distribution│───>│ Monetization│───>│ Audio/Voice │───>│ B2B Bootcamp│───>│ Scale & Pre-│
│ Store Launch│    │ & Viral Loops│   │ & Conversion│    │ Mock AI     │    │ Partnerships│    │ Seed Ready  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
  • Google Play      • 5,000 MAU        • $2,500 MRR       • Voice-based      • 3 Bootcamp pilots • 25,000 Users
  • Apple Store      • Campus Ambs      • 500 Paid Subs    • WebRTC/STT       • Cohort Dashboard • $10,000 MRR
  • Android APK      • Referral Loops   • M-Pesa Funnel    • Audio Feedback   • B2B Subscriptions • Pitch Deck
```

### Detailed Milestone Breakdown:

* **Month 1 (Launch & Stability):**
  * Finalize Google Play Store & iOS App Store production releases via Expo Application Services (EAS).
  * Instrument post-launch telemetry, crash monitoring, and in-app rating prompts.
* **Month 2 (User Acquisition & Growth Loops):**
  * Activate 2-sided viral referral engine (5 bonus credits per successful invite).
  * Launch Campus Ambassador initiatives across 5 universities in Kenya and Nigeria.
  * Reach 5,000 Monthly Active Users (MAU).
* **Month 3 (Monetization Optimization):**
  * A/B test onboarding paywalls and credit expiry nudges.
  * Optimize M-Pesa one-click subscription renewals via Paystack recurring billing.
  * Target: 500 Paid Subscribers ($2,500 MRR).
* **Month 4 (Product Innovation — Audio/Voice AI):**
  * Integrate Realtime Speech-to-Text and Conversational Voice AI for conversational mock interviews.
  * Deliver accent-friendly voice models optimized for African English speakers.
* **Month 5 (B2B Institutional Expansion):**
  * Launch "Interview Ready for Bootcamps & Universities".
  * Provide student cohort dashboards, placement readiness tracking, and bulk licensing.
* **Month 6 (Scale & Investment Readiness):**
  * Reach 25,000 registered users, 1,800+ paying subscribers, and $10,000+ MRR.
  * Assemble Pre-Seed institutional funding deck and metrics data room.

---

## 6. Priorities for the Immediate Next Phase (Next 30 Days)

1. **Production App Store Deployment:** Submit final signed production builds (`.aab` and `.ipa`) to Google Play Console and Apple App Store.
2. **Initial Distribution Pilot:** Partner with 2 tech communities (e.g., GDG Nairobi, She Code Africa, Moringa School alumni) for structured cohort onboarding.
3. **Funnel Analytics Instrumentation:** Track end-to-end drop-off from Onboarding -> First AI Generation -> Credit Exhaustion -> Paywall View -> M-Pesa Checkout.
4. **Referral Program Amplification:** Promote the in-app referral program via automated milestone emails upon first successful resume download.

---

## 7. Action Points & Next Coaching Session Agreement

### 7.1 Immediate Action Items (Next 14 Days)
- [ ] Complete Google Play Store Closed Testing track and submit for production review.
- [ ] Deploy production Supabase database backup and telemetry dashboards.
- [ ] Finalize the one-page B2B partnership proposal for coding bootcamps.
- [ ] Prepare baseline funnel conversion data for review in Coaching Session 2.

### 7.2 Session 2 Scheduling & Alignment Template
* **Agreed Date for Session 2:** *[Insert Target Date — 2 Weeks from Session 1]*
* **Session 2 Focus Area:** Go-To-Market Execution, Early Cohort Analytics Review & Customer Acquisition Channels.
* **Assigned Mentor / Coach:** Build Now Programme Lead & Assigned Venture Coach.

---
*Document prepared for the Tech Wings Africa Build Now Programme — Interview Ready Core Team.*
