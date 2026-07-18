-- Migration 015: Add tables for Company Research and LinkedIn tasks for Recent Activities tracking

-- ============================================================================
-- 1. company_research
-- ============================================================================

CREATE TABLE public.company_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_url TEXT,
  result_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.company_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own company research" 
  ON public.company_research FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own company research" 
  ON public.company_research FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own company research" 
  ON public.company_research FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company research" 
  ON public.company_research FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. linkedin_tasks
-- ============================================================================

CREATE TABLE public.linkedin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- e.g. 'analyze', 'optimize'
  title TEXT NOT NULL,
  result_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.linkedin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own linkedin tasks" 
  ON public.linkedin_tasks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own linkedin tasks" 
  ON public.linkedin_tasks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own linkedin tasks" 
  ON public.linkedin_tasks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linkedin tasks" 
  ON public.linkedin_tasks FOR DELETE 
  USING (auth.uid() = user_id);
