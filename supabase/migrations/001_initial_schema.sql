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
  -- Create user in public.users
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Create empty user_profile
  INSERT INTO public.user_profiles (user_id, profile_completeness)
  VALUES (NEW.id, 0);
  
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
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users own their profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their resumes" ON public.resumes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their resume contents" ON public.resume_contents
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.resumes WHERE id = resume_contents.resume_id AND user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.resumes WHERE id = resume_contents.resume_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users own their cover letters" ON public.cover_letters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their applications" ON public.job_applications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their documents" ON public.generated_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their interviews" ON public.mock_interviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their contacts" ON public.networking_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users own their usage events" ON public.usage_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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
