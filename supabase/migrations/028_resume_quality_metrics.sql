-- ==============================================================================
-- 028_resume_quality_metrics.sql
-- Aggregated metrics and alerts for continuous resume generation improvement
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.resume_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug TEXT NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_generations INT DEFAULT 0,
  with_jd_generations INT DEFAULT 0,
  without_jd_generations INT DEFAULT 0,
  positive_feedback_count INT DEFAULT 0,
  negative_feedback_count INT DEFAULT 0,
  edit_count INT DEFAULT 0,
  download_count INT DEFAULT 0,
  avg_word_count NUMERIC(8,2) DEFAULT 0,
  avg_ats_keywords NUMERIC(5,2) DEFAULT 0,
  avg_duration_ms NUMERIC(10,2) DEFAULT 0,
  quality_score NUMERIC(5,2) DEFAULT 0, -- 0.00 to 100.00 score
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_resume_quality_template_date UNIQUE (template_slug, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_resume_quality_template ON public.resume_quality_metrics(template_slug);
CREATE INDEX IF NOT EXISTS idx_resume_quality_date ON public.resume_quality_metrics(metric_date DESC);

-- Alerts table for degraded templates or generation issues
CREATE TABLE IF NOT EXISTS public.resume_quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_slug TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- e.g. 'LOW_QUALITY_SCORE', 'HIGH_EDIT_RATE', 'HIGH_NEGATIVE_FEEDBACK'
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_quality_alerts_resolved ON public.resume_quality_alerts(resolved, created_at DESC);

-- Enable RLS
ALTER TABLE public.resume_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_quality_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resume_quality_metrics' AND policyname = 'Service role full access on quality metrics'
  ) THEN
    CREATE POLICY "Service role full access on quality metrics"
    ON public.resume_quality_metrics FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resume_quality_alerts' AND policyname = 'Service role full access on quality alerts'
  ) THEN
    CREATE POLICY "Service role full access on quality alerts"
    ON public.resume_quality_alerts FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
