# Development Planning Document

**Project:** Interview Ready (Free-Tier MVP Edition)  
**Version:** 2.0.0  
**Date:** June 20, 2026  
**Purpose:** Sprint planning, architectural decisions, and milestone tracking.

---

## 1. Project Phases

### Phase 0: Foundation (Week 1)
**Goal:** Working backend with auth, database, and core AI pipeline.
**Deliverable:** API endpoints functional via curl/Postman.

### Phase 1: Core Features (Week 2)
**Goal:** All Careerflow parity features working end-to-end.
**Deliverable:** Mobile app with job analysis, resume generation, cover letters, tracker.

### Phase 2: Polish & Launch (Week 3)
**Goal:** App store ready, billing integrated, onboarding smooth.
**Deliverable:** Submitted to App Store and Play Store.

### Phase 3: Growth (Post-Launch)
**Goal:** Iterate based on user feedback, add B2B features.
**Deliverable:** Premium subscriptions active, coach mode beta.

---

## 2. Sprint Breakdown

### Sprint 0: Infrastructure (Days 1-3)

**Day 1: Supabase Setup**
- [ ] Create Supabase project (free tier)
- [ ] Configure auth providers (Google, LinkedIn OAuth)
- [ ] Set up database schema (run migration 001)
- [ ] Enable RLS on all tables
- [ ] Create auth trigger (sync auth.users → public.users)
- [ ] Test auth flow end-to-end
- [ ] Set up environment variables

**Day 2: Edge Functions Foundation**
- [ ] Initialize Supabase CLI locally
- [ ] Create `_shared` utilities (supabase-client, groq-client, errors, credits)
- [ ] Build auth endpoints (sync, me, delete-account)
- [ ] Build profile CRUD endpoints (get, update, completeness)
- [ ] Test all endpoints with curl

**Day 3: AI Pipeline Core**
- [ ] Groq client integration with JSON mode
- [ ] JD Analyzer agent with Zod validation
- [ ] Job scraper (cheerio) with cache
- [ ] Resume Tailor agent
- [ ] ATS Scorer agent
- [ ] Test full pipeline: paste JD → analysis → resume generation

### Sprint 1: Documents & Features (Days 4-7)

**Day 4: Resume & Cover Letter**
- [ ] Document generation (.docx with docx lib)
- [ ] PDF generation (pdf-lib, no Puppeteer)
- [ ] Supabase Storage upload/download
- [ ] Deno KV queue for background exports
- [ ] Cover Letter agent (all 5 tones)
- [ ] Template system (6 templates seeded)

**Day 5: Tracker & Interviews**
- [ ] Application Tracker CRUD
- [ ] Kanban status transitions
- [ ] Mock Interview agent
- [ ] Supabase Realtime streaming for interviews
- [ ] Interview scoring rubric
- [ ] LinkedIn Optimizer agents

**Day 6: Networking & Utilities**
- [ ] Networking tracker CRUD
- [ ] Follow-up reminder system (pg_cron)
- [ ] Elevator pitch generator
- [ ] JD summarizer
- [ ] Autofill profile engine
- [ ] Multi-language support (en, fr, sw, am)

**Day 7: Integration & Testing**
- [ ] Stripe billing integration (test mode)
- [ ] Credit system end-to-end test
- [ ] Plan gating middleware
- [ ] Email notifications (Mailgun)
- [ ] Analytics events (PostHog)
- [ ] Error tracking (Sentry)
- [ ] Full API test suite

### Sprint 2: Mobile App (Days 8-12)

**Day 8: Mobile Foundation**
- [ ] Expo project initialization
- [ ] NativeWind setup
- [ ] Zustand store structure
- [ ] TanStack Query setup
- [ ] Supabase client configuration
- [ ] Auth flows (login, signup, OAuth)
- [ ] Bottom tab navigation

**Day 9: Core Screens**
- [ ] Profile onboarding screen
- [ ] Job Fit Analyzer screen
- [ ] Resume builder with template picker
- [ ] Realtime streaming UI (generation progress)
- [ ] Cover Letter screen

**Day 10: Tracker & Interviews**
- [ ] Application Tracker kanban board
- [ ] Drag-and-drop implementation
- [ ] Mock Interview chat interface
- [ ] Interview feedback report screen
- [ ] LinkedIn Optimizer screen

**Day 11: Utilities & Settings**
- [ ] Networking tracker screen
- [ ] Elevator pitch screen
- [ ] Settings (plan, credits, export)
- [ ] Autofill profile card
- [ ] Multi-language selector

**Day 12: Polish**
- [ ] Loading states & skeletons
- [ ] Error boundaries
- [ ] Empty states
- [ ] Pull-to-refresh
- [ ] Offline mode basics
- [ ] Push notification setup

### Sprint 3: Launch Prep (Days 13-14)

**Day 13: Testing**
- [ ] End-to-end testing (iOS + Android)
- [ ] Performance testing (cold start, navigation)
- [ ] AI output quality review
- [ ] Document export verification
- [ ] Credit system stress test
- [ ] RLS policy audit

**Day 14: Store Submission**
- [ ] App Store screenshots
- [ ] Play Store screenshots
- [ ] App Store description
- [ ] Play Store description
- [ ] Privacy policy
- [ ] Terms of service
- [ ] EAS Build
- [ ] Submit to App Store
- [ ] Submit to Play Store

---

## 3. Architectural Decisions Log

### Decision 1: Supabase over Railway
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** Need zero-cost infrastructure for MVP.  
**Decision:** Use Supabase free tier for database, auth, storage, edge functions, and realtime.  
**Consequences:** 500MB DB limit, 2GB storage, 500K function calls/month. Upgrade to Pro ($25) when any limit hits.  
**Reversible:** Yes — can migrate to self-hosted PostgreSQL later.

### Decision 2: Groq over Anthropic
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** Anthropic API costs $50-300/month at scale. Groq offers 1M tokens/day free.  
**Decision:** Use Groq Llama 3.3 70B as primary AI. OpenRouter as fallback.  
**Consequences:** Slightly lower output quality than Claude, but sufficient for resume/cover letter generation. Faster inference.  
**Reversible:** Yes — can add Anthropic as premium tier option later.

### Decision 3: Edge Functions over Express
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** Need serverless, zero-management backend.  
**Decision:** Use Supabase Edge Functions (Deno runtime) with Hono framework.  
**Consequences:** Cold start latency (~100ms), limited execution time, Deno ecosystem. No npm install — use esm.sh.  
**Reversible:** Yes — can extract to standalone Deno Deploy or Node.js later.

### Decision 4: pdf-lib over Puppeteer
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** Puppeteer requires Chromium (100MB+), incompatible with Edge Functions.  
**Decision:** Use pdf-lib for lightweight PDF generation. Complex layouts deferred.  
**Consequences:** Simpler PDFs, no CSS rendering. Acceptable for MVP.  
**Reversible:** Yes — can add Browserless or Puppeteer as paid feature later.

### Decision 5: Deno KV over Redis/BullMQ
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** Need queue system without external service.  
**Decision:** Use Deno KV (built into Deno runtime) for job queues.  
**Consequences:** 10GB storage limit, simpler API than BullMQ, no scheduling features.  
**Reversible:** Yes — can migrate to Upstash Redis or BullMQ when needed.

### Decision 6: Realtime over SSE
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** SSE requires persistent connections, complex in serverless.  
**Decision:** Use Supabase Realtime (WebSocket) for streaming AI responses.  
**Consequences:** 200 concurrent connection limit, WebSocket-based instead of HTTP.  
**Reversible:** Yes — can implement SSE as alternative later.

### Decision 7: JSONB over Normalized Tables
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** User profiles have variable structure (work history, education, projects).  
**Decision:** Store flexible data (work_history, education, projects) as JSONB arrays.  
**Consequences:** Less queryable than normalized tables, but zero schema migrations for profile changes.  
**Reversible:** Yes — can normalize specific fields if query performance degrades.

### Decision 8: Onboarding as Value-First Funnel
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** Traditional onboarding asks for profile data upfront with no immediate reward. Users drop off.  
**Decision:** Structure onboarding as a 5-step value funnel where the user gets their first AI analysis and resume by Step 4 (~3 minutes).  
**Consequences:** Higher initial development complexity (state machine, deep linking, recovery emails). Higher conversion rates.  
**Reversible:** Yes — can simplify to traditional form-based onboarding if metrics don't improve.

### Decision 9: Mailgun over Resend (Primary)
**Date:** June 20, 2026  
**Status:** Approved  
**Context:** Need transactional email with generous free tier.  
**Decision:** Use Mailgun (5K free/month) as primary. Resend (3K free/month) as backup.  
**Consequences:** Mailgun has better deliverability but more complex setup.  
**Reversible:** Yes — can switch primary provider anytime.

---

## 4. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Groq rate limits hit | Medium | High | Implement OpenRouter fallback; cache aggressively |
| Supabase free tier exceeded | Medium | High | Monitor usage; upgrade to Pro ($25) proactively |
| AI output quality insufficient | Medium | Medium | A/B test prompts; add Anthropic as premium option |
| App Store rejection | Medium | High | Follow guidelines; provide clear app purpose; test thoroughly |
| Database size exceeds 500MB | Low | High | Archive old data; compress JSONB; upgrade to Pro |
| Edge Function cold starts | Medium | Low | Keep functions small; use connection pooling; acceptable for MVP |
| PDF generation too limited | Low | Medium | Document limitation; offer .docx as primary format |
| OAuth provider changes | Low | High | Abstract auth layer; support multiple providers |
| Stripe integration complexity | Low | Medium | Start with test mode; use Stripe Checkout (hosted) |
| Competitor launches similar | Low | High | Focus on African market differentiation; ship fast |

---

## 5. Milestone Definitions

### Milestone 0: "Hello World" (Day 1)
**Criteria:**
- Supabase project created
- Database schema deployed
- Auth signup working
- First Edge Function responds to HTTP request

### Milestone 1: "AI Pipeline" (Day 3)
**Criteria:**
- Paste JD → AI analysis → structured JSON output
- Resume generation from profile
- ATS scoring working
- All validated with Zod schemas

### Milestone 2: "Document Factory" (Day 5)
**Criteria:**
- .docx generation working
- PDF generation working
- File upload to Supabase Storage
- Download working on mobile

### Milestone 3: "Feature Complete" (Day 7)
**Criteria:**
- All API endpoints functional
- All agents working
- Credit system operational
- Billing integration ready

### Milestone 4: "Mobile Ready" (Day 10)
**Criteria:**
- All core screens built
- Navigation working
- Realtime streaming functional
- Offline mode basics
- **Onboarding flow complete with analytics tracking**
- **A/B test framework configured for onboarding variants**
**Criteria:**
- All core screens built
- Navigation working
- Realtime streaming functional
- Offline mode basics

### Milestone 5: "Store Ready" (Day 14)
**Criteria:**
- App builds successfully via EAS
- No critical bugs
- App Store and Play Store submissions sent
- Marketing materials ready
- **Onboarding completion rate >70% in beta testing**
- **Time to first value <3 minutes verified**
**Criteria:**
- App builds successfully via EAS
- No critical bugs
- App Store and Play Store submissions sent
- Marketing materials ready

### Milestone 6: "First User" (Day 21)
**Criteria:**
- App approved on both stores
- First organic user signup
- First resume generated
- Monitoring and analytics confirm functionality

---

## 6. Dependency Graph

```
Supabase Project
  ├── Database Schema
  │     ├── Auth Triggers
  │     ├── RLS Policies
  │     ├── Credit Functions
  │     └── Cron Jobs
  ├── Edge Functions
  │     ├── _shared (clients, schemas, errors)
  │     ├── auth/* (depends on: schema)
  │     ├── profile/* (depends on: auth, schema)
  │     ├── jobs/* (depends on: profile, groq)
  │     ├── resumes/* (depends on: jobs, documents)
  │     ├── cover-letters/* (depends on: jobs, documents)
  │     ├── applications/* (depends on: resumes, cover-letters)
  │     ├── interviews/* (depends on: applications, realtime)
  │     ├── linkedin/* (depends on: profile, groq)
  │     ├── networking/* (depends on: profile)
  │     ├── documents/* (depends on: storage)
  │     ├── billing/* (depends on: stripe)
  │     └── queue/* (depends on: deno-kv, documents)
  └── Storage Buckets
        └── documents/

Expo Mobile App
  ├── Auth Screens (depends on: supabase-auth)
  ├── Profile Screens (depends on: profile endpoints)
  ├── Job Fit Screen (depends on: jobs/analyze)
  ├── Resume Builder (depends on: resumes/*, realtime)
  ├── Cover Letter Screen (depends on: cover-letters/*)
  ├── Tracker Screen (depends on: applications/*)
  ├── Interview Screen (depends on: interviews/*, realtime)
  ├── LinkedIn Screen (depends on: linkedin/*)
  ├── Networking Screen (depends on: networking/*)
  └── Settings (depends on: billing/*)
```

---

## 7. Performance Budgets

| Metric | Target | Maximum | Measurement |
|---|---|---|---|
| App cold start | < 3s | 5s | Expo startup trace |
| Onboarding completion | > 70% | 50% | PostHog funnel |
| Time to first value | < 3min | 5min | PostHog timing |
| Day 1 retention | > 40% | 25% | PostHog cohort |
| Screen navigation | < 100ms | 200ms | React Navigation perf monitor |
| API response (non-AI) | < 200ms | 500ms | Edge Function logs |
| AI first token | < 1s | 3s | Groq response timing |
| Full JD analysis | < 5s | 8s | End-to-end timing |
| Resume generation | < 15s | 25s | End-to-end timing |
| Document export | < 10s | 20s | Queue processing time |
| Database query | < 50ms | 100ms | Supabase query logs |
| Image load | < 500ms | 1s | Network panel |

---

## 8. Monitoring & Alerting

### Metrics to Track (PostHog)
- `user_signed_up` — acquisition
- `onboarding_step_completed` — funnel tracking
- `onboarding_abandoned` — drop-off point
- `first_value_delivered` — resume generated in onboarding
- `jd_analyzed` — core feature usage
- `resume_generated` — conversion
- `cover_letter_generated` — conversion
- `interview_completed` — engagement
- `credit_exhausted` — upgrade opportunity
- `template_selected` — preference data
- `export_downloaded` — completion

### Errors to Track (Sentry)
- Edge Function crashes
- AI API failures (Groq/OpenRouter)
- Database constraint violations
- File upload failures
- Auth token expiration issues

### Health Checks
- Daily: Check Groq token usage vs. limit
- Daily: Check Supabase storage usage
- Weekly: Review AI output quality samples
- Weekly: Analyze user retention funnel
- Monthly: Review credit reset success

---

## 9. Documentation Standards

### Code Comments
```typescript
// Function-level: What and why
/**
 * Generates a tailored resume using Groq AI.
 * Deducts 3 credits before processing.
 * Falls back to OpenRouter if Groq rate limits.
 * @param profile - User profile data
 * @param jobAnalysis - Optional job analysis for tailoring
 * @returns Structured resume content validated by Zod
 */
```

### API Documentation
- Every endpoint has request/response examples
- Error codes documented
- Rate limits specified
- Auth requirements clear

### Database Documentation
- Every table has comment explaining purpose
- Every RLS policy has justification
- Every trigger has business logic explanation

---

## 10. Communication Plan

### Daily Standup (Solo Founder)
- What was accomplished yesterday?
- What is the goal for today?
- What blockers exist?
- What decisions need to be made?

### Weekly Review
- Review metrics dashboard
- Assess milestone progress
- Update risk register
- Plan next week's priorities

### Milestone Reviews
- Demo working features
- Document learnings
- Update architectural decisions
- Adjust timeline if needed

---

*Last updated: June 20, 2026*
