# Interview Ready — Product Requirements Document (Free-Tier MVP Edition)

**Version:** 2.0.0  
**Date:** June 20, 2026  
**Author:** Victor Chogo  
**Classification:** Internal — Engineering Reference  
**Stack:** Expo (React Native) · Supabase Edge Functions · PostgreSQL · Groq AI (Free Tier)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Design System](#2-design-system)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [API Design](#5-api-design)
6. [Core Backend Services](#6-core-backend-services)
7. [AI Agent Pipeline](#7-ai-agent-pipeline)
8. [Document Generation Engine](#8-document-generation-engine)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [File Storage & Export](#10-file-storage--export)
11. [Background Jobs](#11-background-jobs)
12. [Third-Party Integrations](#12-third-party-integrations)
13. [Feature Specifications](#13-feature-specifications)
14. [Additional Features Beyond Careerflow](#14-additional-features-beyond-careerflow)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Environment Configuration](#16-environment-configuration)
17. [Deployment Architecture](#17-deployment-architecture)
18. [Cost Breakdown](#18-cost-breakdown)
19. [Sprint Plan](#19-sprint-plan)

---

## 1. Product Overview

### 1.1 What Is Interview Ready

Interview Ready is a mobile-first AI career copilot built on Expo. It is primarily a feature-complete clone of Careerflow.ai adapted for mobile, with additional capabilities in mock interview simulation, real-time application form filling, prediction-market-style job scoring, and multi-language resume support for African job markets.

Users paste a job description or URL. The system analyzes it, generates an ATS-optimized resume tailored to that role, writes a personalized cover letter, scores their job fit, and coaches them through interview prep — all from one app, in under two minutes.

### 1.2 Target Users

- Recent graduates and mid-career professionals in Africa and globally
- Job seekers switching industries or roles
- Developers, engineers, and tech workers applying to competitive roles
- Career coaches managing client pipelines (B2B tier — Phase 2)

### 1.3 Core Value Proposition

> "Paste a job. Land the interview."

One input. One flow. Full application package output.

### 1.4 Careerflow Feature Parity Checklist

| Careerflow Feature | Interview Ready Status | Notes |
|---|---|---|
| AI Resume Builder | ✅ Include | Mobile-optimized, template-based |
| Resume ATS Optimizer | ✅ Include | Score + keyword injection |
| Resume Bullet & Summary Writer | ✅ Include | Per-section AI rewrite |
| AI Cover Letter Generator | ✅ Include | Tone selector, multi-version |
| Job Fit / Skill Match Analyzer | ✅ Include | URL + paste input |
| Job Tracker (Kanban) | ✅ Include | Drag-and-drop pipeline |
| Application Autofill | ✅ Include | Profile-to-form mapping |
| LinkedIn Optimizer | ✅ Include | Section-by-section scoring |
| Networking Tracker | ✅ Include | Contact + follow-up log |
| Elevator Pitch Writer | ✅ Include | Role-specific pitch gen |
| AI Mock Interview | ✅ Include (Enhanced) | Real-time scoring + rubric |
| Job Description Summarizer | ✅ Include | Quick JD digest card |
| Resume Templates | ✅ Include | 6 ATS-safe templates |
| Resume Review (human-assisted) | 🔜 Phase 2 | AI-first in MVP |
| LinkedIn Makeover Service | 🔜 Phase 2 | AI-first in MVP |

---

## 2. Design System

> Interview Ready follows Careerflow's visual language exactly. Deviating from this breaks the "familiar but better" positioning.

### 2.1 Careerflow Visual Language Reference

Careerflow uses a clean, professional SaaS aesthetic:

- **Light mode primary**: White canvas, soft gray surfaces, clean card grids
- **Accent color**: Deep violet/indigo (`#6B46FE` primary purple)
- **Success states**: Green (`#16A34A`)
- **Warning / pending**: Amber (`#D97706`)
- **Text hierarchy**: Near-black headings (`#111827`), medium gray body (`#374151`), muted labels (`#6B7280`)
- **Card style**: `border-radius: 12px`, subtle `box-shadow`, 1px light border (`#E5E7EB`)
- **Font**: Inter, weight 400/500/600/700
- **CTA buttons**: Solid violet, full-radius pill shape
- **Score indicators**: Circular ring meters (SVG) with percentage overlays
- **Tag/badge style**: Rounded pill with colored background + matching text
- **Layout**: Left sidebar nav (desktop), bottom tab bar (mobile)

### 2.2 Mobile (Expo) Design Tokens

```typescript
// theme/tokens.ts
export const Colors = {
  // Backgrounds
  bgPrimary:    '#FFFFFF',
  bgSecondary:  '#F9FAFB',
  bgCard:       '#FFFFFF',
  bgMuted:      '#F3F4F6',

  // Careerflow violet
  violet:       '#6B46FE',
  violetLight:  '#EDE9FE',
  violetDark:   '#4C2FD6',

  // Semantic
  success:      '#16A34A',
  successLight: '#DCFCE7',
  warning:      '#D97706',
  warningLight: '#FEF3C7',
  error:        '#DC2626',
  errorLight:   '#FEE2E2',

  // Text
  textPrimary:  '#111827',
  textBody:     '#374151',
  textMuted:    '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse:  '#FFFFFF',

  // Borders
  border:       '#E5E7EB',
  borderFocus:  '#6B46FE',

  // Score tiers
  scoreHigh:    '#16A34A',
  scoreMid:     '#D97706',
  scoreLow:     '#DC2626',
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
};

export const Radius = {
  sm: 6, md: 10, lg: 14, xl: 20, full: 9999
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  }
};

export const Typography = {
  displayLg:  { fontSize: 30, fontWeight: '800', lineHeight: 36 },
  displayMd:  { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  headingLg:  { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  headingMd:  { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  bodyLg:     { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyMd:     { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySm:     { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label:      { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.4 },
  caption:    { fontSize: 11, fontWeight: '400', lineHeight: 14 },
};
```

### 2.3 Component Library Mapping

| Component | Expo/RN Implementation |
|---|---|
| Score ring | Custom SVG via `react-native-svg` |
| Kanban board | `react-native-draggable-flatlist` |
| Bottom tabs | `expo-router` tab layout |
| Modals/sheets | `@gorhom/bottom-sheet` |
| Charts | `victory-native` |
| Toasts | `react-native-toast-message` |
| Skeleton loaders | `react-native-skeleton-placeholder` |
| Text editor | `react-native-rich-editor` |
| PDF viewer | `expo-file-system` + `react-native-pdf` |

---

## 3. Architecture Overview

### 3.1 Free-Tier-First Philosophy

This MVP edition is designed to run entirely on free-tier services. Every component has a zero-cost path, with clear upgrade triggers documented for when scale demands paid tiers.

**Key Changes from v1.0:**
- **Supabase replaces Railway + PostgreSQL + Upstash + Clerk + Storage**
- **Groq AI (free tier) replaces Anthropic API**
- **Supabase Edge Functions replace Node.js/Express API server**
- **Deno KV / Supabase Realtime replaces Redis/BullMQ**
- **Supabase Auth replaces Clerk**
- **Lightweight PDF generation replaces Puppeteer**

### 3.2 System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   EXPO MOBILE APP                        │
│  expo-router · React Native · TypeScript                 │
│  NativeWind (Tailwind for RN) · Zustand state           │
└──────────────┬──────────────────────────────────────────┘
               │ HTTPS REST + WebSocket (Realtime)
               ▼
┌─────────────────────────────────────────────────────────┐
│           SUPABASE EDGE FUNCTIONS (Deno)                │
│  • API Routes (Hono framework)                          │
│  • Auth Webhooks                                        │
│  • AI Proxy (Groq/OpenRouter)                           │
│  • Document Generation (docx + pdf-lib)                 │
│  • Job Scraping (cheerio)                               │
│  • Background Jobs (Deno KV queue)                      │
└──────────────┬──────────────────────────────────────────┘
               │
    ┌──────────┴──────────┬──────────────────┐
    ▼                     ▼                  ▼
┌──────────┐      ┌──────────────┐    ┌──────────────┐
│ Postgres │      │   Storage    │    │   Realtime   │
│  (500MB) │      │   (2GB)      │    │  (200 conn)  │
│  + RLS   │      │  (resumes)   │    │  (SSE/WS)    │
└──────────┘      └──────────────┘    └──────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  EXTERNAL FREE TIER SERVICES                            │
│  • Groq AI (1M tokens/day)                               │
│  • Mailgun/Resend (3K-5K emails/mo)                      │
│  • Cloudflare DNS (free plan)                            │
│  • Expo EAS (100GB bandwidth, 1K MAU)                    │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Tech Stack (Free Tier Edition)

| Layer | Technology | Cost | Purpose |
|---|---|---|---|
| Mobile | Expo + React Native | **Free** | Cross-platform iOS/Android |
| Routing | expo-router | **Free** | File-based navigation |
| State | Zustand | **Free** | Global client state |
| Server cache | TanStack Query | **Free** | API cache + optimistic UI |
| API | Supabase Edge Functions (Deno) | **Free** | Serverless API routes |
| Database | Supabase PostgreSQL | **Free** | Primary data store (500MB) |
| ORM | Supabase JS Client + Zod | **Free** | Type-safe DB access |
| Auth | Supabase Auth | **Free** | OAuth + JWT (50K users/mo) |
| File storage | Supabase Storage | **Free** | Resume/cover letter files (2GB) |
| Cache/Queue | Deno KV + Supabase Realtime | **Free** | Job queue + broadcast |
| AI | Groq API | **Free** | 1M tokens/day on Llama 3 |
| AI Fallback | OpenRouter | **Free** | Fallback for rate limits |
| Job scraping | Cheerio (Deno) + Axios | **Free** | URL-based JD extraction |
| Doc generation | `docx` npm (Deno port) | **Free** | .docx file generation |
| PDF | `pdf-lib` (Deno) | **Free** | Lightweight PDF generation |
| Email | Mailgun/Resend | **Free** | 3K-5K emails/month |
| Analytics | Supabase Logs + PostHog Free | **Free** | Event tracking |
| Monitoring | Supabase Logs + Sentry Free | **Free** | Error tracking (5K/mo) |
| Deployment | EAS (Expo) + Supabase CLI | **Free** | CI/CD |
| DNS | Cloudflare | **Free** | DNS + DDoS protection |

---

## 4. Database Schema

### 4.1 Supabase SQL Schema

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE plan_enum AS ENUM ('FREE', 'PREMIUM', 'PREMIUM_PLUS');
CREATE TYPE work_preference_enum AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');
CREATE TYPE resume_status_enum AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'ARCHIVED');
CREATE TYPE cover_letter_tone_enum AS ENUM ('PROFESSIONAL', 'ENTHUSIASTIC', 'CONCISE', 'STORYTELLING', 'FORMAL');
CREATE TYPE application_status_enum AS ENUM ('SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED');
CREATE TYPE interview_type_enum AS ENUM ('TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'MIXED', 'CASE_STUDY');
CREATE TYPE interview_status_enum AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
CREATE TYPE contact_relationship_enum AS ENUM ('CLOSE', 'PROFESSIONAL', 'ACQUAINTANCE', 'RECRUITER', 'HIRING_MANAGER', 'MENTOR');
CREATE TYPE contact_status_enum AS ENUM ('ACTIVE', 'DORMANT', 'ARCHIVED');
CREATE TYPE document_type_enum AS ENUM ('RESUME', 'COVER_LETTER', 'ELEVATOR_PITCH', 'LINKEDIN_SUMMARY', 'LINKEDIN_HEADLINE', 'JD_SUMMARY', 'INTERVIEW_PREP', 'REFERENCE_LETTER');
CREATE TYPE file_format_enum AS ENUM ('DOCX', 'PDF', 'TXT', 'MD');
CREATE TYPE billing_interval_enum AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
CREATE TYPE sub_status_enum AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- ─── USERS ───────────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  plan plan_enum DEFAULT 'FREE',
  plan_expires_at TIMESTAMPTZ,
  ai_credits INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── USER PROFILES ───────────────────────────────────────────────────────────

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT,
  location TEXT,
  country TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  summary TEXT,
  current_role TEXT,
  years_experience INT,
  target_roles TEXT[] DEFAULT '{}',
  target_industries TEXT[] DEFAULT '{}',
  salary_expectation JSONB DEFAULT '{}',
  work_preference work_preference_enum DEFAULT 'HYBRID',
  open_to_relocation BOOLEAN DEFAULT FALSE,
  technical_skills TEXT[] DEFAULT '{}',
  soft_skills TEXT[] DEFAULT '{}',
  languages JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  work_history JSONB DEFAULT '[]',
  projects JSONB DEFAULT '[]',
  awards JSONB DEFAULT '[]',
  publications JSONB DEFAULT '[]',
  linkedin_imported_at TIMESTAMPTZ,
  linkedin_raw_data JSONB,
  profile_completeness INT DEFAULT 0,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RESUME TEMPLATES ────────────────────────────────────────────────────────

CREATE TABLE public.resume_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  ats_score INT,
  is_premium BOOLEAN DEFAULT FALSE,
  preview_url TEXT,
  docx_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.resume_templates (name, slug, description, ats_score, is_premium, sort_order) VALUES
  ('Executive', 'executive', 'Clean single-column, leadership-focused', 95, FALSE, 1),
  ('Modern Pro', 'modern-pro', 'Two-column with skills sidebar', 92, FALSE, 2),
  ('Minimal', 'minimal', 'Whitespace-heavy, typography-driven', 94, FALSE, 3),
  ('Tech Stack', 'tech-stack', 'Projects-first, GitHub-linked', 90, FALSE, 4),
  ('Creative', 'creative', 'Subtle color accents, design roles', 88, TRUE, 5),
  ('Academic', 'academic', 'Publications and research focus', 93, TRUE, 6);

-- ─── RESUMES ─────────────────────────────────────────────────────────────────

CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template_id UUID REFERENCES public.resume_templates(id),
  is_base BOOLEAN DEFAULT FALSE,
  job_application_id UUID,
  ats_score INT,
  ats_score_details JSONB DEFAULT '{}',
  last_scored_at TIMESTAMPTZ,
  docx_file_url TEXT,
  pdf_file_url TEXT,
  last_exported_at TIMESTAMPTZ,
  status resume_status_enum DEFAULT 'DRAFT',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RESUME CONTENT ──────────────────────────────────────────────────────────

CREATE TABLE public.resume_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_id UUID UNIQUE REFERENCES public.resumes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  contact JSONB NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  skills JSONB DEFAULT '{}',
  projects JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  awards JSONB DEFAULT '[]',
  custom_sections JSONB DEFAULT '[]',
  injected_keywords TEXT[] DEFAULT '{}',
  section_order TEXT[] DEFAULT '{}'
);

-- ─── COVER LETTERS ───────────────────────────────────────────────────────────

CREATE TABLE public.cover_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  job_application_id UUID,
  title TEXT NOT NULL,
  tone cover_letter_tone_enum DEFAULT 'PROFESSIONAL',
  subject TEXT,
  greeting TEXT,
  body TEXT NOT NULL,
  signature TEXT,
  word_count INT,
  tone_score INT,
  key_phrases TEXT[] DEFAULT '{}',
  power_words TEXT[] DEFAULT '{}',
  docx_file_url TEXT,
  pdf_file_url TEXT,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── JOB APPLICATIONS ────────────────────────────────────────────────────────

CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo_url TEXT,
  job_url TEXT,
  raw_jd TEXT,
  jd_summary TEXT,
  location TEXT,
  is_remote BOOLEAN DEFAULT FALSE,
  salary_min INT,
  salary_max INT,
  salary_currency TEXT DEFAULT 'USD',
  experience_required TEXT,
  required_skills TEXT[] DEFAULT '{}',
  nice_to_have_skills TEXT[] DEFAULT '{}',
  tech_stack TEXT[] DEFAULT '{}',
  company_intel JSONB DEFAULT '{}',
  ats_score INT,
  match_score INT,
  keyword_score INT,
  matched_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  recommendation TEXT,
  status application_status_enum DEFAULT 'SAVED',
  applied_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  next_action TEXT,
  notes TEXT,
  resume_id UUID,
  cover_letter_id UUID,
  referral_contact TEXT,
  referral_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GENERATED DOCUMENTS ─────────────────────────────────────────────────────

CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  job_application_id UUID REFERENCES public.job_applications(id),
  type document_type_enum NOT NULL,
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  file_url TEXT,
  file_format file_format_enum,
  file_size_kb INT,
  generated_by TEXT DEFAULT 'groq-llama-3',
  prompt_version TEXT,
  generation_ms INT,
  is_archived BOOLEAN DEFAULT FALSE,
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MOCK INTERVIEWS ─────────────────────────────────────────────────────────

CREATE TABLE public.mock_interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  job_application_id UUID,
  role TEXT NOT NULL,
  company TEXT,
  interview_type interview_type_enum DEFAULT 'MIXED',
  status interview_status_enum DEFAULT 'IN_PROGRESS',
  messages JSONB DEFAULT '[]',
  question_count INT DEFAULT 0,
  duration_seconds INT,
  overall_score INT,
  communication_score INT,
  technical_score INT,
  star_score INT,
  confidence_score INT,
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  detailed_feedback JSONB DEFAULT '{}',
  transcript_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NETWORKING CONTACTS ─────────────────────────────────────────────────────

CREATE TABLE public.networking_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  relationship contact_relationship_enum DEFAULT 'ACQUAINTANCE',
  status contact_status_enum DEFAULT 'ACTIVE',
  source TEXT,
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  stripe_customer_id TEXT,
  stripe_sub_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan plan_enum NOT NULL,
  interval billing_interval_enum NOT NULL,
  status sub_status_enum DEFAULT 'ACTIVE',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USAGE EVENTS ─────────────────────────────────────────────────────────────

CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  credits_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SCRAPED JOB CACHE ─────────────────────────────────────────────────────────

CREATE TABLE public.scraped_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT UNIQUE NOT NULL,
  raw_html TEXT,
  parsed_jd TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_scraped_jobs_url ON public.scraped_jobs(url);
CREATE INDEX idx_scraped_jobs_expires ON public.scraped_jobs(expires_at);

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networking_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their data" ON public.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users own their profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their resumes" ON public.resumes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their resume contents" ON public.resume_contents
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.resumes WHERE id = resume_contents.resume_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users own their cover letters" ON public.cover_letters
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their applications" ON public.job_applications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their documents" ON public.generated_documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their interviews" ON public.mock_interviews
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their contacts" ON public.networking_contacts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own their usage events" ON public.usage_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Scraped jobs readable by all" ON public.scraped_jobs
  FOR SELECT USING (true);

-- ─── CREDIT DEDUCTION FUNCTION ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.deduct_credits(
  user_uuid UUID,
  amount INT
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INT;
BEGIN
  SELECT ai_credits INTO current_credits FROM public.users WHERE id = user_uuid;
  IF current_credits IS NULL OR current_credits < amount THEN
    RETURN FALSE;
  END IF;
  UPDATE public.users SET ai_credits = ai_credits - amount WHERE id = user_uuid;
  INSERT INTO public.usage_events (user_id, event, credits_used)
  VALUES (user_uuid, 'credit_deduction', amount);
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── MONTHLY CREDIT RESET (Cron Job) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS VOID AS $$
BEGIN
  UPDATE public.users 
  SET ai_credits = CASE 
    WHEN plan = 'FREE' THEN 10
    WHEN plan = 'PREMIUM' THEN 999999
    WHEN plan = 'PREMIUM_PLUS' THEN 999999
  END
  WHERE plan = 'FREE' OR (plan IN ('PREMIUM', 'PREMIUM_PLUS') AND plan_expires_at < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. API Design

### 5.1 Base URL

```
Production:  https://<project-ref>.supabase.co/functions/v1
Local:       http://localhost:54321/functions/v1
```

### 5.2 Authentication

All endpoints require a Supabase JWT token:
```
Authorization: Bearer <supabase_jwt_token>
```

Supabase Edge Functions automatically validate the JWT via `supabase.auth.getUser()`.

### 5.3 Endpoint Reference

#### Auth
```
POST   /auth/sync           — Sync user after signup (webhook handler)
GET    /auth/me             — Get current user + plan info
DELETE /auth/account        — Delete account + all data (GDPR)
```

#### User Profile
```
GET    /profile             — Get full profile
PUT    /profile             — Update profile fields
POST   /profile/import/linkedin  — Import from LinkedIn URL
GET    /profile/completeness     — Profile completeness score + tips
POST   /profile/analyze          — AI analysis of profile gaps
```

#### Job Analysis
```
POST   /jobs/analyze        — Analyze JD text or URL (main AI endpoint)
GET    /jobs/analyze/:id    — Get cached analysis result
POST   /jobs/scrape         — Scrape job from URL (returns JD text)
```

#### Resumes
```
GET    /resumes             — List all user resumes
POST   /resumes             — Create new resume (triggers AI generation)
GET    /resumes/:id         — Get resume + content
PUT    /resumes/:id         — Update resume content
DELETE /resumes/:id         — Delete resume
POST   /resumes/:id/tailor  — Tailor existing resume to new JD
POST   /resumes/:id/score   — Re-run ATS scoring
POST   /resumes/:id/export  — Generate .docx or .pdf file
GET    /resumes/:id/export  — Download generated file
POST   /resumes/:id/section — AI rewrite of a specific section
GET    /templates           — List resume templates
```

#### Cover Letters
```
GET    /cover-letters                — List
POST   /cover-letters                — Generate (AI)
GET    /cover-letters/:id            — Get
PUT    /cover-letters/:id            — Edit
DELETE /cover-letters/:id            — Delete
POST   /cover-letters/:id/regenerate — New version, same tone
POST   /cover-letters/:id/export     — .docx or .pdf
```

#### Job Applications (Tracker)
```
GET    /applications                 — List with filters
POST   /applications                 — Create
GET    /applications/:id             — Get with linked documents
PUT    /applications/:id             — Update
DELETE /applications/:id             — Delete
PATCH  /applications/:id/status      — Move pipeline stage
GET    /applications/stats           — Aggregate stats
```

#### Mock Interviews
```
POST   /interviews                   — Start interview session
GET    /interviews/:id               — Get session
POST   /interviews/:id/message       — Send message
POST   /interviews/:id/end           — End session + trigger scoring
GET    /interviews/:id/feedback      — Get AI feedback report
GET    /interviews                   — List past interviews
```

#### LinkedIn Tools
```
POST   /linkedin/analyze             — Score existing profile sections
POST   /linkedin/headline            — Generate optimized headline
POST   /linkedin/summary             — Generate About section
POST   /linkedin/post                — Generate LinkedIn post
POST   /linkedin/pitch               — Generate elevator pitch
```

#### Networking
```
GET    /networking/contacts          — List contacts
POST   /networking/contacts          — Add contact
PUT    /networking/contacts/:id      — Update
DELETE /networking/contacts/:id      — Delete
PATCH  /networking/contacts/:id/follow-up — Log follow-up
```

#### Documents
```
GET    /documents                    — List all generated docs
GET    /documents/:id/download       — Download file
DELETE /documents/:id                — Delete
```

#### Billing
```
POST   /billing/checkout             — Create Stripe checkout session
POST   /billing/portal               — Open Stripe billing portal
GET    /billing/plans                — List plans + pricing
GET    /billing/usage                — Current period credit usage
POST   /webhooks/stripe              — Stripe webhook handler
```

### 5.4 Streaming Endpoints

Mock interviews use Supabase Realtime (WebSocket) instead of SSE:
```
Channel: interview:{interviewId}
Events:  message, score_update, complete
```

Resume generation streams via Realtime:
```
Channel: resume:{resumeId}
Events:  section_complete, score_update, export_ready
```

---

## 6. Core Backend Services

### 6.1 Directory Structure

```
supabase/
├── functions/
│   ├── _shared/
│   │   ├── supabase-client.ts
│   │   ├── groq-client.ts
│   │   ├── zod-schemas.ts
│   │   ├── errors.ts
│   │   ├── credits.ts
│   │   └── logger.ts
│   ├── auth/
│   │   ├── sync.ts
│   │   ├── me.ts
│   │   └── delete-account.ts
│   ├── profile/
│   │   ├── get.ts
│   │   ├── update.ts
│   │   ├── import-linkedin.ts
│   │   ├── completeness.ts
│   │   └── analyze.ts
│   ├── jobs/
│   │   ├── analyze.ts
│   │   ├── get-analysis.ts
│   │   └── scrape.ts
│   ├── resumes/
│   │   ├── list.ts
│   │   ├── create.ts
│   │   ├── get.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   ├── tailor.ts
│   │   ├── score.ts
│   │   ├── export.ts
│   │   ├── download.ts
│   │   ├── section-rewrite.ts
│   │   └── templates.ts
│   ├── cover-letters/
│   │   ├── list.ts
│   │   ├── create.ts
│   │   ├── get.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   ├── regenerate.ts
│   │   └── export.ts
│   ├── applications/
│   │   ├── list.ts
│   │   ├── create.ts
│   │   ├── get.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   ├── update-status.ts
│   │   └── stats.ts
│   ├── interviews/
│   │   ├── start.ts
│   │   ├── get.ts
│   │   ├── message.ts
│   │   ├── end.ts
│   │   ├── feedback.ts
│   │   └── list.ts
│   ├── linkedin/
│   │   ├── analyze.ts
│   │   ├── headline.ts
│   │   ├── summary.ts
│   │   ├── post.ts
│   │   └── pitch.ts
│   ├── networking/
│   │   ├── list.ts
│   │   ├── create.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   └── follow-up.ts
│   ├── documents/
│   │   ├── list.ts
│   │   ├── download.ts
│   │   └── delete.ts
│   ├── billing/
│   │   ├── checkout.ts
│   │   ├── portal.ts
│   │   ├── plans.ts
│   │   ├── usage.ts
│   │   └── stripe-webhook.ts
│   └── queue/
│       └── worker.ts
├── migrations/
│   └── 001_initial_schema.sql
└── config.toml
```

### 6.2 Edge Function Example (Hono Framework)

```typescript
// functions/resumes/create.ts
import { Hono } from 'https://deno.land/x/hono@v3.12.0/mod.ts';
import { createClient } from '../_shared/supabase-client.ts';
import { GroqClient } from '../_shared/groq-client.ts';
import { deductCredits } from '../_shared/credits.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const app = new Hono();

const createSchema = z.object({
  templateId: z.string().uuid(),
  jobApplicationId: z.string().uuid().optional(),
  generateFromProfile: z.boolean().default(true),
});

app.post('/', async (c) => {
  const supabase = createClient(c.req.header('Authorization')!);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const { templateId, jobApplicationId } = createSchema.parse(body);

  const hasCredits = await deductCredits(supabase, user.id, 3);
  if (!hasCredits) return c.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, 402);

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  let jobAnalysis = null;
  if (jobApplicationId) {
    const { data: job } = await supabase
      .from('job_applications')
      .select('*')
      .eq('id', jobApplicationId)
      .single();
    jobAnalysis = job;
  }

  const groq = new GroqClient(Deno.env.get('GROQ_API_KEY')!);
  const resumeContent = await groq.generateResume(profile, jobAnalysis, templateId);

  const { data: resume } = await supabase
    .from('resumes')
    .insert({
      user_id: user.id,
      title: `${profile.current_role || 'Professional'} Resume`,
      template_id: templateId,
      job_application_id: jobApplicationId,
      status: 'DRAFT',
    })
    .select()
    .single();

  await supabase.from('resume_contents').insert({
    resume_id: resume.id,
    ...resumeContent,
  });

  const kv = await Deno.openKv();
  await kv.enqueue({
    type: 'export_resume',
    resumeId: resume.id,
    userId: user.id,
  }, { delay: 0 });

  return c.json({ resumeId: resume.id, status: 'generating' }, 202);
});

Deno.serve(app.fetch);
```

### 6.3 Error Handling

```typescript
// functions/_shared/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) { super(message); }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class CreditError extends AppError {
  constructor() { super('Insufficient credits', 402, 'INSUFFICIENT_CREDITS'); }
}

export class RateLimitError extends AppError {
  constructor() { super('Rate limit exceeded', 429, 'RATE_LIMITED'); }
}
```

### 6.4 Credit System

Free tier: 10 credits/month. Credits deducted per AI operation:

| Operation | Credits |
|---|---|
| JD Analysis | 1 |
| Resume Generation | 3 |
| Cover Letter | 2 |
| ATS Scoring | 1 |
| Mock Interview (per session) | 5 |
| LinkedIn Optimizer | 2 |
| Elevator Pitch | 1 |
| Resume Section Rewrite | 1 |

Premium: unlimited. Premium Plus: unlimited + priority queue.


---

## 7. AI Agent Pipeline

### 7.1 Groq AI Configuration

```typescript
// functions/_shared/groq-client.ts

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqClient {
  constructor(private apiKey: string) {}

  async generateResume(profile: any, jobAnalysis: any | null, templateId: string) {
    const prompt = buildResumePrompt(profile, jobAnalysis, templateId);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: RESUME_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return this.validateResumeContent(content);
  }

  async analyzeJd(jdText: string, profile: any) {
    const prompt = buildJdAnalysisPrompt(jdText, profile);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: JD_ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }

  // Fallback to OpenRouter if Groq rate limits
  async fallbackRequest(prompt: string, systemPrompt: string) {
    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'HTTP-Referer': 'https://interviewready.app',
        'X-Title': 'Interview Ready',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });
    return response.json();
  }

  private validateResumeContent(content: any) {
    const schema = z.object({
      name: z.string(),
      title: z.string(),
      contact: z.object({
        email: z.string().email(),
        phone: z.string().optional(),
        location: z.string(),
        linkedin: z.string().optional(),
        github: z.string().optional(),
      }),
      summary: z.string().max(600),
      experience: z.array(z.object({
        role: z.string(),
        company: z.string(),
        location: z.string().optional(),
        start: z.string(),
        end: z.string().optional(),
        current: z.boolean().default(false),
        bullets: z.array(z.string()).min(2).max(6),
      })),
      education: z.array(z.object({
        degree: z.string(),
        field: z.string(),
        school: z.string(),
        year: z.string(),
        gpa: z.string().optional(),
      })),
      skills: z.object({
        technical: z.array(z.string()),
        frameworks: z.array(z.string()),
        tools: z.array(z.string()),
        soft: z.array(z.string()).optional(),
      }),
      injectedKeywords: z.array(z.string()),
    });

    return schema.parse(content);
  }
}
```

### 7.2 JD Analyzer Agent

**Trigger:** `POST /jobs/analyze`  
**Input:** Raw JD text or scraped URL content + user profile  
**Output:** Structured analysis stored in `job_applications`

```typescript
const JD_ANALYSIS_SCHEMA = z.object({
  jobTitle: z.string(),
  company: z.string(),
  location: z.string().optional(),
  isRemote: z.boolean(),
  experienceRequired: z.string(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  requiredSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  techStack: z.array(z.string()),
  cultureSignals: z.array(z.string()),
  redFlags: z.array(z.string()),
  jdSummary: z.string(),
  atsScore: z.number().min(0).max(100),
  matchScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  topStrengths: z.array(z.string()),
  gapAnalysis: z.string(),
  recommendation: z.enum(['Apply Strongly', 'Apply', 'Consider', 'Skip']),
});
```

### 7.3 Resume Tailor Agent

**Trigger:** `POST /resumes` or `POST /resumes/:id/tailor`  
**Input:** User profile + job analysis (if tailoring) + template config  
**Output:** Structured `resume_contents` object

Steps:
1. Load user profile + work history
2. If tailoring: load job analysis from DB
3. Call Groq with profile + JD context
4. Groq returns structured resume JSON
5. Validate against Zod schema
6. Run ATS Scorer agent on the output
7. If ATS score < 80, iterate up to 2 times with feedback
8. Store `resume_contents` in DB
9. Queue document export job

### 7.4 ATS Scorer Agent

**Trigger:** After resume generation, on-demand scoring  
**Input:** Resume content + optional job description  
**Output:** Score breakdown stored in `resumes`

Scoring rubric sent to Groq:
- **Keyword density** (30 pts): required skills present and contextual
- **Quantified impact** (25 pts): bullets have numbers/metrics
- **Formatting safety** (20 pts): no tables, columns, images in core sections
- **Section presence** (15 pts): contact, summary, experience, education, skills
- **Length** (10 pts): 1 page for <10 years, 2 for 10+

```typescript
const ATS_SCORE_SCHEMA = z.object({
  overallScore: z.number(),
  breakdown: z.object({
    keywordDensity: z.object({ score: z.number(), max: z.number(), details: z.string() }),
    quantifiedImpact: z.object({ score: z.number(), max: z.number(), details: z.string() }),
    formattingSafety: z.object({ score: z.number(), max: z.number(), details: z.string() }),
    sectionPresence: z.object({ score: z.number(), max: z.number(), details: z.string() }),
    length: z.object({ score: z.number(), max: z.number(), details: z.string() }),
  }),
  passingKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  improvementTips: z.array(z.string()),
  passesAts: z.boolean(),
});
```

### 7.5 Cover Letter Agent

**Input:** User profile + job analysis + tone preference  
**Output:** Structured letter stored in `cover_letters`

Tone system prompts:
- **Professional**: Formal, concise, data-driven
- **Enthusiastic**: Warm, energy-forward, mission-aligned
- **Concise**: 3-paragraph max, no fluff, direct
- **Storytelling**: Narrative arc with a career pivot or mission moment

### 7.6 Mock Interview Agent

**Input:** Role + type + conversation history  
**Behavior:** Multi-turn with state awareness  
**Output:** Each response streamed via Supabase Realtime; final message triggers scoring

```typescript
const INTERVIEW_SCORE_SCHEMA = z.object({
  overallScore: z.number(),
  communicationScore: z.number(),
  technicalScore: z.number(),
  starScore: z.number(),
  confidenceScore: z.number(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  questionBreakdown: z.array(z.object({
    question: z.string(),
    userAnswer: z.string(),
    score: z.number(),
    feedback: z.string(),
  })),
  hiringDecision: z.enum(['Strong Yes', 'Yes', 'Maybe', 'No']),
});
```

### 7.7 Agent Orchestration

```
JD Input
   │
   ├── [1] JD Analyzer (Groq)     → fast, 2-4s
   │
   └── (after analysis) ──────────────────────────────┐
                                                       │
        [2A] Resume Tailor (Groq)   (parallel) ─┐     │
        [2B] Cover Letter (Groq)    (parallel) ─┤ 8-15s
        [2C] Company Research (Groq) (parallel) ─┘     │
                                                       │
        [3] ATS Scorer (Groq)        (after 2A) → 3-5s│
                                                       │
        [4] Document Export (queue)  (after 3)  → 5-10s│
             (Deno KV + Edge Function)                 │
```

Total perceived latency: ~12s for full package via Realtime streaming.

---

## 8. Document Generation Engine

### 8.1 .docx Generation (Deno Compatible)

Uses the `docx` library via esm.sh (Deno-compatible CDN):

```typescript
// functions/_shared/documents/resume.generator.ts

import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, 
         WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'https://esm.sh/docx@9.0.0';

export async function generateResumeDocx(content: any, templateSlug: string): Promise<Uint8Array> {
  const templateFn = loadTemplate(templateSlug);
  const doc = templateFn(content);
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

// Template: Executive
function executiveTemplate(content: any): Document {
  return new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 900, right: 900 },
        }
      },
      children: [
        new Paragraph({
          text: content.name,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: content.title,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: content.summary }),
      ]
    }]
  });
}
```

### 8.2 PDF Generation (Lightweight, No Puppeteer)

Uses `pdf-lib` instead of Puppeteer (no Chromium needed):

```typescript
// functions/_shared/documents/pdf.generator.ts

import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

export async function generatePdfFromContent(content: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;
  const margin = 50;

  page.drawText(content.name, {
    x: margin, y,
    font: boldFont,
    size: 24,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  page.drawText(content.title, {
    x: margin, y,
    font,
    size: 14,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 40;

  page.drawText('Summary', {
    x: margin, y,
    font: boldFont,
    size: 16,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 25;

  const words = content.summary.split(' ');
  let line = '';
  for (const word of words) {
    const testLine = line + word + ' ';
    const textWidth = font.widthOfTextAtSize(testLine, 11);
    if (textWidth > width - 2 * margin && line !== '') {
      page.drawText(line, { x: margin, y, font, size: 11 });
      y -= 15;
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x: margin, y, font, size: 11 });
    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
```

**Note:** For complex template layouts, use the HTML to Browserless approach with their free tier (1K sessions/month) or generate simplified PDFs with `pdf-lib` for MVP.

### 8.3 File Upload to Supabase Storage

```typescript
// functions/_shared/storage.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_KEY')!
);

export async function uploadDocument(
  buffer: Uint8Array,
  userId: string,
  documentId: string,
  format: 'docx' | 'pdf'
): Promise<string> {
  const path = `${userId}/documents/${documentId}.${format}`;
  const contentType = format === 'docx' 
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/pdf';

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  return data.publicUrl;
}
```

---

## 9. Authentication & Authorization

### 9.1 Supabase Auth Setup

Supabase Auth handles all flows: email/password, Google, LinkedIn OAuth. After signup, the database trigger automatically syncs to `public.users`.

```typescript
// Mobile app auth hook
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
    }
  }
});

// OAuth (Google, LinkedIn)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: 'interviewready://auth/callback' }
});

// Get session
const { data: { session } } = await supabase.auth.getSession();
const jwt = session?.access_token;
```

### 9.2 Authorization Rules (RLS)

All authorization is handled at the database level via Row Level Security. No middleware needed.

| Resource | Free | Premium | Premium Plus |
|---|---|---|---|
| JD Analysis | 3/month | Unlimited | Unlimited |
| Resume Generation | 1 | Unlimited | Unlimited |
| Cover Letter | 1 | Unlimited | Unlimited |
| ATS Scoring | 3/month | Unlimited | Unlimited |
| Mock Interview | 1 session | 10/month | Unlimited |
| LinkedIn Optimizer | 1 | Unlimited | Unlimited |
| Template access | 2 basic | All 6 | All 6 |
| Export to .docx | ✅ | ✅ | ✅ |
| Export to PDF | ❌ | ✅ | ✅ |
| Priority queue | ❌ | ❌ | ✅ |

---

## 10. File Storage & Export

### 10.1 Supabase Bucket Structure

```
documents/
  {userId}/
    documents/
      {documentId}.docx
      {documentId}.pdf
    avatars/
      {userId}.jpg
```

### 10.2 File Lifecycle

1. Document generated → `Uint8Array` in memory
2. Buffer uploaded to Supabase Storage → returns public URL
3. URL stored in `generated_documents.file_url`
4. Client requests download → server returns signed URL (1h TTL via RLS)
5. RLS policies prevent unauthorized access

### 10.3 Export Queue Job (Deno KV)

Heavy document generation is offloaded to Deno KV queue:

```typescript
// functions/queue/worker.ts
const kv = await Deno.openKv();

for await (const entry of kv.watch(['queue', 'export'])) {
  const job = entry.value;
  if (!job) continue;

  const { type, resumeId, userId } = job;

  if (type === 'export_resume') {
    const supabase = createServiceRoleClient();
    const { data: resume } = await supabase
      .from('resumes')
      .select('*, content:resume_contents(*)')
      .eq('id', resumeId)
      .single();

    const docxBuffer = await generateResumeDocx(resume.content, resume.template_id);
    const docxUrl = await uploadDocument(docxBuffer, userId, resumeId, 'docx');

    const { data: user } = await supabase.from('users').select('plan').eq('id', userId).single();
    let pdfUrl = null;
    if (user.plan !== 'FREE') {
      const pdfBuffer = await generatePdfFromContent(resume.content);
      pdfUrl = await uploadDocument(pdfBuffer, userId, resumeId, 'pdf');
    }

    await supabase.from('resumes').update({
      docx_file_url: docxUrl,
      pdf_file_url: pdfUrl,
      last_exported_at: new Date().toISOString(),
    }).eq('id', resumeId);

    await supabase.channel(`user:${userId}`).send({
      type: 'export_complete',
      resumeId,
      docxUrl,
      pdfUrl,
    });
  }
}
```

---

## 11. Background Jobs

### 11.1 Deno KV Queue

```typescript
// Enqueue a job
const kv = await Deno.openKv();
await kv.enqueue({
  type: 'export_resume',
  resumeId: '...',
  userId: '...',
}, { delay: 0 });
```

### 11.2 Scheduled Jobs (Supabase pg_cron)

| Job | Schedule | Purpose |
|---|---|---|
| `expire_scraped_jobs` | Every 1h | Delete `scraped_jobs` past `expires_at` |
| `refresh_ats_scores` | Daily 2am | Re-score resumes where JD has changed |
| `follow_up_reminders` | Daily 9am | Send follow-up emails for networking contacts |
| `monthly_credits_reset` | 1st of month | Reset free tier credits |
| `usage_reports` | Weekly | Aggregate analytics for admin dashboard |

```sql
SELECT cron.schedule('expire-scraped-jobs', '0 * * * *', 
  $$DELETE FROM public.scraped_jobs WHERE expires_at < NOW()$$);

SELECT cron.schedule('reset-credits', '0 0 1 * *', 
  $$SELECT public.reset_monthly_credits()$$);
```

---

## 12. Third-Party Integrations

### 12.1 Job URL Scraping

Supports LinkedIn, Indeed, Glassdoor, company career pages.

```typescript
// functions/jobs/scrape.ts
import * as cheerio from 'https://esm.sh/cheerio@1.0.0';

export async function scrapeJobUrl(url: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data: cached } = await supabase
    .from('scraped_jobs')
    .select('parsed_jd')
    .eq('url', url)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) return cached.parsed_jd;

  const html = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  }).then(r => r.text());

  const $ = cheerio.load(html);

  let jdText = '';
  if (url.includes('linkedin.com')) {
    jdText = $('.description__text, .show-more-less-html__markup').text();
  } else if (url.includes('indeed.com')) {
    jdText = $('#jobDescriptionText').text();
  } else {
    jdText = $('body').text().substring(0, 15000);
  }

  await supabase.from('scraped_jobs').upsert({
    url,
    raw_html: html.substring(0, 50000),
    parsed_jd: jdText,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'url' });

  return jdText;
}
```

### 12.2 Stripe Billing (Pay-Per-Use, No Monthly Fee)

- Webhook endpoint at `POST /webhooks/stripe`
- Events handled:
  - `checkout.session.completed` → activate subscription
  - `invoice.payment_succeeded` → renew + credit reset
  - `invoice.payment_failed` → downgrade to free
  - `customer.subscription.deleted` → cancel + downgrade

**Note:** Stripe charges no monthly fee — only 2.9% + 30c per transaction. This is the ideal payment processor for an MVP with zero upfront costs.

### 12.3 Email (Mailgun Free Tier)

Transactional emails via Mailgun (5,000 free/month):
- Welcome email + profile completion prompt
- Export ready notification
- Follow-up reminder (networking tracker)
- Weekly job search summary (optional opt-in)
- Subscription renewal / expiry notices

```typescript
// functions/_shared/email.ts
const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');

export async function sendEmail(to: string, subject: string, html: string) {
  const formData = new FormData();
  formData.append('from', `Interview Ready <no-reply@${MAILGUN_DOMAIN}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('html', html);

  await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` },
    body: formData,
  });
}
```

**Alternative:** Resend (3,000 free/month) if Mailgun limits are hit.

### 12.4 Analytics (PostHog Free Tier)

Key events tracked:
```typescript
import posthog from 'https://esm.sh/posthog-js@1.100.0';

posthog.capture('resume_generated', {
  template_id: templateId,
  ats_score: atsScore,
  has_tailored_jd: !!jobApplicationId,
});
```

PostHog free tier: 1M events/month, unlimited users.

---

## 13. Feature Specifications

### 13.1 Job Fit Analyzer (Core Feature)

**Flow:**
1. User pastes text or URL
2. If URL → scrape job page → extract JD text
3. Cache scraped JD for 24h by URL
4. Run JD Analyzer Agent against user profile
5. Store result as `job_applications` with `status: SAVED`
6. Return analysis JSON to client in <5s
7. Client renders score rings, keyword matches, recommendation badge

**Gate:** Free users: 3 analyses/month. Prompt upgrade after limit.

### 13.2 Resume Builder

**Flow:**
1. User selects template (2 free, 4 premium)
2. Optionally links a `jobApplicationId` for tailoring
3. Server loads user profile + job analysis (if linked)
4. Resume Tailor Agent generates content
5. ATS Scorer validates — iterates if score < 80
6. Content stored in DB
7. Export job queued for .docx + PDF
8. Realtime stream shows section-by-section generation progress
9. Preview rendered on mobile using react-native-pdf or HTML WebView

### 13.3 Application Tracker

**Kanban columns:** Saved → Applied → Screening → Interview → Offer → Rejected

**Features:**
- Drag-and-drop between columns (`react-native-draggable-flatlist`)
- Auto-timestamps when status changes
- ATS score shown on each card
- Linked resume/cover letter quick-open
- Notes per application
- Reminders: "No activity in 7 days" nudge

### 13.4 LinkedIn Optimizer

**Sections scored:**
- Headline (0-100)
- About / Summary (0-100)
- Experience bullets (per role)
- Skills section
- Overall profile completeness

**Outputs:**
- Section-by-section score with issues list
- AI-generated replacement for each weak section
- Estimated recruiter appeal score after optimization

### 13.5 Elevator Pitch Generator

**Inputs:** Target role + context (interview / networking event / cold email)  
**Output:** 30-second and 60-second pitch variants  
**Tone options:** Confident, humble, mission-driven

### 13.6 Networking Tracker

- Add contacts manually or via LinkedIn URL import
- Log interactions (meeting, message, coffee chat)
- Set follow-up reminders with push notification
- Tag contacts by company, stage, relationship type
- AI-generated follow-up message suggestions

---

## 14. Additional Features Beyond Careerflow

### 14.1 AI Form Autofill Engine

```typescript
const AUTOFILL_MAP = {
  'first_name': 'profile.first_name',
  'last_name': 'profile.last_name',
  'email': 'user.email',
  'phone': 'profile.phone',
  'city': 'profile.location',
  'linkedin_url': 'profile.linkedin_url',
  'github_url': 'profile.github_url',
  'years_experience': 'profile.years_experience',
  'current_role': 'profile.current_role',
  'highest_education': 'profile.education[0].degree',
  'university': 'profile.education[0].school',
  'graduation_year': 'profile.education[0].year',
};
```

The mobile app exposes autofill data as a copyable card.

### 14.2 Job Market Score (Prediction-Market Style)

Each job application gets a market-calibrated "land rate" score based on:
- User's ATS score for this role
- Role's competition level (sourced via web search at analysis time)
- User's application history conversion rate
- Time-on-market for this role type

Displayed as: "You have a 34% estimated chance of reaching interview stage."

### 14.3 Multi-Language Resume Support

Targeting African markets: resume generation supports French, Swahili, and Amharic output.

```typescript
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: 'Write the resume content in professional English.',
  fr: 'Redigez le contenu du CV en francais professionnel.',
  sw: 'Andika maudhui ya CV kwa Kiswahili rasmi.',
  am: 'Write the resume content in professional Amharic.',
};
```

### 14.4 Interview Question Bank

Role-specific question banks generated and cached per job title + interview type. Users can:
- Browse questions by category (technical, behavioral, system design)
- Mark questions as "practiced" or "struggling"
- Get AI-generated model answers with their profile context
- Save answers for offline review

### 14.5 Salary Intelligence

At JD analysis time, Groq retrieves:
- Estimated salary range for this role in this location
- Comparison to user's stated expectation
- Negotiation context if range is below expectation

### 14.6 Career Coach Mode (B2B) — Phase 2

Organizations can create a coach account:
- Invite clients/students
- View their pipeline and application health
- Send feedback on generated documents
- Co-edit resumes with comments

---

## 15. Non-Functional Requirements

### 15.1 Performance Targets

| Metric | Target |
|---|---|
| JD Analysis response | < 5s (P95) |
| Resume generation (full, streamed) | < 15s first byte in < 1s |
| Cover letter generation | < 8s |
| API response (non-AI) | < 200ms (P95) |
| Document export (.docx) | < 10s |
| App cold start (Expo) | < 3s |
| App navigation transition | < 100ms |

### 15.2 Availability

- API uptime target: 99.5% monthly (Supabase SLA)
- Graceful degradation: if AI is down, return cached results where available

### 15.3 Security

- All JWTs validated on every request (Supabase Auth)
- RLS policies enforce data isolation at database level
- File download URLs are signed and expire in 1 hour
- No user PII logged to application logs
- HTTPS only (enforced by Supabase + Cloudflare)
- Rate limiting: 100 req/min per user (Edge Function config)

### 15.4 Scalability

- Stateless Edge Functions: horizontal scaling handled by Supabase
- Deno KV for session-level state and queues
- DB connection pooling via Supabase
- File storage scales with Supabase Storage

---

## 16. Environment Configuration

```env
# Supabase (Required)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>

# AI (Required)
GROQ_API_KEY=<groq-api-key>
OPENROUTER_API_KEY=<openrouter-api-key>  # Fallback

# Email (Required for transactional)
MAILGUN_API_KEY=<mailgun-api-key>
MAILGUN_DOMAIN=mg.interviewready.app

# Payment (Required when launching paid plans)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_PREMIUM_PLUS_PRICE_ID=price_...

# Analytics (Optional)
POSTHOG_API_KEY=phc_...

# App
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## 17. Deployment Architecture

### 17.1 Services (All Free Tier)

| Service | Platform | Cost | Notes |
|---|---|---|---|
| API + Database | Supabase | **$0** | 500MB DB, 2GB storage, 500K Edge Function calls |
| AI | Groq | **$0** | 1M tokens/day |
| AI Fallback | OpenRouter | **$0** | Free tier models |
| File Storage | Supabase Storage | **$0** | 2GB included |
| Auth | Supabase Auth | **$0** | 50K users/month |
| Queue | Deno KV | **$0** | 10GB storage |
| Realtime | Supabase Realtime | **$0** | 200 concurrent connections |
| Email | Mailgun | **$0** | 5,000 emails/month |
| Analytics | PostHog | **$0** | 1M events/month |
| Monitoring | Sentry | **$0** | 5K errors/month |
| DNS | Cloudflare | **$0** | Free plan |
| Mobile App | Expo EAS | **$0** | 100GB bandwidth, 1K MAU |

### 17.2 CI/CD

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref $SUPABASE_PROJECT_REF
      - run: supabase db test
      - run: supabase functions test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref $SUPABASE_PROJECT_REF
      - run: supabase db push
      - run: supabase functions deploy
```

### 17.3 Database Migrations

```bash
# Local development
supabase start
supabase migration new <name>
supabase db push

# Production
supabase link --project-ref <ref>
supabase db push
supabase functions deploy
```

---

## 18. Cost Breakdown

### 18.1 Essential Paid Costs (Unavoidable)

| Item | Frequency | Cost | Notes |
|---|---|---|---|
| **Apple Developer Program** | Annual | **$99/year** | Required for iOS App Store distribution |
| **Google Play Developer** | One-time | **$25** | Required for Google Play Store distribution |
| **Domain Registration** | Annual | **~$12/year** | interviewready.app (or similar) |
| **Total Essential Yearly** | | **~$136** | Minimum to launch on both stores |

### 18.2 Free Tier Services (Zero Monthly Cost)

| Service | Free Tier Limit | Estimated Usage at 1K Users |
|---|---|---|
| Supabase Database | 500MB | ~300MB (sufficient) |
| Supabase Storage | 2GB | ~1.5GB (sufficient) |
| Supabase Edge Functions | 500K calls/month | ~200K (sufficient) |
| Supabase Auth | 50K users/month | ~1K (sufficient) |
| Supabase Realtime | 200 concurrent | ~50 (sufficient) |
| Supabase Bandwidth | 5GB/month | ~3GB (monitor closely) |
| Groq AI | 1M tokens/day | ~500K/day (sufficient) |
| Mailgun | 5K emails/month | ~500 (sufficient) |
| PostHog | 1M events/month | ~100K (sufficient) |
| Sentry | 5K errors/month | ~200 (sufficient) |
| Cloudflare | Unlimited DNS queries | Unlimited (sufficient) |
| Expo EAS | 100GB bandwidth | ~50GB (sufficient) |

### 18.3 Upgrade Triggers

| When This Happens | Upgrade To | New Monthly Cost |
|---|---|---|
| 500MB database full | Supabase Pro ($25/mo) | **$25** |
| 2GB storage full | Supabase Pro (100GB) | **$25** |
| 500K Edge Function calls exceeded | Supabase Pro (2M) | **$25** |
| 5GB bandwidth exceeded | Supabase Pro (250GB) | **$25** |
| 1M Groq tokens/day exceeded | Groq Pay-as-you-go | **~$20-50** |
| Need faster AI than Llama 3 | Anthropic API (selective) | **~$50-100** |
| 5K Mailgun emails exceeded | Mailgun paid plan | **$35** |
| 1K MAU exceeded | Expo EAS Starter | **$19** |

### 18.4 Projected Monthly Costs by Scale

| Scenario | Monthly Cost | Notes |
|---|---|---|
| **MVP Launch** (0-500 users) | **$0** | All free tiers sufficient |
| **Growth** (500-2K users) | **$25-50** | Supabase Pro + maybe Groq paid |
| **Scale** (2K-10K users) | **$100-200** | Supabase Pro + Groq paid + Expo paid |
| **Enterprise** (10K+ users) | **$500+** | Full paid stack |

---

## 19. Sprint Plan

### Week 1 — Foundation

| Day | Tasks |
|---|---|
| 1 | Supabase project setup, schema migration, RLS policies, auth triggers |
| 2 | Supabase Auth setup (Google OAuth), user sync webhook, profile CRUD Edge Functions |
| 3 | JD Analyzer agent (Groq), job scraper (cheerio), scrape cache, analyze endpoint |
| 4 | Resume Tailor agent (Groq), ATS Scorer agent, resume generation endpoint |
| 5 | Cover Letter agent (Groq), LinkedIn agents, cover letter + LinkedIn endpoints |
| 6 | Document export (.docx with docx lib), Deno KV queue setup, Supabase Storage upload |
| 7 | Application Tracker CRUD, Mock Interview agent + Realtime streaming |

### Week 2 — Polish + Mobile

| Day | Tasks |
|---|---|
| 8 | Stripe integration (test mode), plan gating, credit system |
| 9 | Networking tracker, elevator pitch, JD summarizer endpoints |
| 10 | Expo mobile app — auth flows, profile onboarding, Supabase client setup |
| 11 | Job Fit screen, Resume screen with template picker, Realtime streaming |
| 12 | Cover Letter screen, Tracker kanban, Interview screen |
| 13 | LinkedIn Optimizer screen, Networking screen, Settings |
| 14 | Testing, EAS build, app store submission prep |

### Post-MVP Backlog

- Career Coach Mode (B2B)
- Human Resume Review (marketplace)
- LinkedIn profile import via API
- Resume version history + diff view
- Salary Intelligence with live market data
- Chrome Extension (web-based companion)
- Push notifications for follow-up reminders
- Referral program
- PDF export improvements (complex templates)
- Multi-language resume expansion

---

## Appendix A: Free Tier Service Comparison

| Service | Free Tier | Paid Alternative | When to Upgrade |
|---|---|---|---|
| **Supabase** | 500MB DB, 2GB storage, 500K calls | Pro ($25/mo) | Hit any free limit |
| **Groq** | 1M tokens/day | Pay-as-you-go ($0.59/M tokens) | Need >1M/day or faster models |
| **OpenRouter** | Limited free models | Credits system | Groq rate limits |
| **Mailgun** | 5K emails/month | Foundation ($35/mo) | >5K emails |
| **Resend** | 3K emails/month | Pro ($20/mo) | Mailgun limits hit |
| **PostHog** | 1M events/month | Paid ($0.00025/event) | >1M events |
| **Sentry** | 5K errors/month | Team ($26/mo) | >5K errors |
| **Cloudflare** | Free DNS + DDoS | Pro ($20/mo) | Need advanced features |
| **Expo EAS** | 100GB bandwidth | Starter ($19/mo) | >100GB or >1K MAU |

## Appendix B: Architecture Decisions

### Why Supabase over Railway + Node.js?
- **Zero infrastructure cost** at MVP scale
- **Built-in Auth** replaces Clerk ($25/mo savings)
- **Built-in Storage** replaces separate S3/Supabase bucket
- **Edge Functions** replace Express server (no server management)
- **RLS** replaces middleware auth (simpler, more secure)
- **Realtime** replaces SSE/WebSocket infrastructure
- **Deno KV** replaces Redis (no separate service)

### Why Groq over Anthropic?
- **1M free tokens/day** vs. $0 paid for Anthropic
- **Faster inference** (Groq's LPU architecture)
- **Llama 3.3 70B** quality is sufficient for resume/cover letter generation
- **JSON mode** supported for structured output
- **Fallback to OpenRouter** if rate limits hit

### Why pdf-lib over Puppeteer?
- **No Chromium dependency** (saves 100MB+ per function)
- **Faster cold starts** in Edge Functions
- **Simpler deployment** (no browser binaries)
- **Trade-off:** Less complex layouts, but sufficient for MVP

### Why Deno KV over BullMQ/Redis?
- **Built into Deno** (no external dependency)
- **10GB free storage**
- **Simple API** for enqueue/dequeue
- **Trade-off:** Less feature-rich than BullMQ, but sufficient for background jobs

---

*End of PRD v2.0.0 — Free-Tier MVP Edition*
