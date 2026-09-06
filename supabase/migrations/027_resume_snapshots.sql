-- ==============================================================================
-- 027_resume_snapshots.sql
-- Internal resume storage snapshots, generation logs, and feedback capture
-- ==============================================================================

-- 1. Create a private storage bucket for internal resume snapshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resume-snapshots',
  'resume-snapshots',
  false,
  10485760, -- 10MB limit
  ARRAY['text/html', 'application/json', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resume-snapshots:
-- Service role has full access by default.
-- Authenticated users can view their own snapshots if needed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own resume snapshots'
  ) THEN
    CREATE POLICY "Users can view their own resume snapshots"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'resume-snapshots'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- 2. Resume generation logs table (stores metadata, raw AI output, rendered HTML, and target job description)
CREATE TABLE IF NOT EXISTS public.resume_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_slug TEXT NOT NULL DEFAULT 'executive',
  job_description TEXT,
  job_title TEXT,
  job_company TEXT,
  job_analysis_id UUID,
  ai_raw_output JSONB,
  rendered_html_path TEXT,
  rendered_html TEXT,
  word_count INT DEFAULT 0,
  section_count INT DEFAULT 0,
  ats_keywords_count INT DEFAULT 0,
  generation_duration_ms INT DEFAULT 0,
  prompt_version TEXT DEFAULT 'v2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_gen_logs_resume_id ON public.resume_generation_logs(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_gen_logs_user_id ON public.resume_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_gen_logs_template ON public.resume_generation_logs(template_slug);
CREATE INDEX IF NOT EXISTS idx_resume_gen_logs_created_at ON public.resume_generation_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.resume_generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resume_generation_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resume_generation_logs' AND policyname = 'Users can view own generation logs'
  ) THEN
    CREATE POLICY "Users can view own generation logs"
    ON public.resume_generation_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resume_generation_logs' AND policyname = 'Service role full access on generation logs'
  ) THEN
    CREATE POLICY "Service role full access on generation logs"
    ON public.resume_generation_logs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 3. Resume feedback and quality signals table
CREATE TABLE IF NOT EXISTS public.resume_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT CHECK (rating IN (-1, 1)), -- 1 = thumbs up, -1 = thumbs down
  feedback_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  feedback_note TEXT,
  edited_after_generation BOOLEAN DEFAULT false,
  downloaded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_resume_feedback_resume_id UNIQUE (resume_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resume_feedback_resume_id ON public.resume_feedback(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_feedback_user_id ON public.resume_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_feedback_rating ON public.resume_feedback(rating);

-- Enable RLS
ALTER TABLE public.resume_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resume_feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resume_feedback' AND policyname = 'Users can view own resume feedback'
  ) THEN
    CREATE POLICY "Users can view own resume feedback"
    ON public.resume_feedback FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resume_feedback' AND policyname = 'Users can insert own resume feedback'
  ) THEN
    CREATE POLICY "Users can insert own resume feedback"
    ON public.resume_feedback FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resume_feedback' AND policyname = 'Users can update own resume feedback'
  ) THEN
    CREATE POLICY "Users can update own resume feedback"
    ON public.resume_feedback FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resume_feedback' AND policyname = 'Service role full access on resume feedback'
  ) THEN
    CREATE POLICY "Service role full access on resume feedback"
    ON public.resume_feedback FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 4. Trigger to track edits on resume contents after generation
CREATE OR REPLACE FUNCTION public.track_resume_edited_after_generation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.resume_feedback
  SET edited_after_generation = true,
      updated_at = now()
  WHERE resume_id = NEW.resume_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_track_resume_edited ON public.resume_contents;
CREATE TRIGGER trg_track_resume_edited
AFTER UPDATE ON public.resume_contents
FOR EACH ROW
EXECUTE FUNCTION public.track_resume_edited_after_generation();
