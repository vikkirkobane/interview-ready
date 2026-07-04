-- Credit System Implementation
-- Tracks user credit balance, transactions, and feature usage

-- Add credit fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS credit_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_expire_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_credits_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credits_used INTEGER DEFAULT 0;

-- Create credit transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- negative for usage, positive for grants
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'grant', 'usage', 'refund', 'expiry', 'bonus', 'purchase'
  )),
  feature TEXT, -- e.g., 'resume_generation', 'cover_letter', 'mock_interview'
  feature_cost INTEGER, -- cost of the feature at time of transaction
  reference_id UUID, -- reference to related entity (resume_id, interview_id, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- for credits that expire
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_feature ON public.credit_transactions(feature);

-- Create credit pricing configuration table
CREATE TABLE IF NOT EXISTS public.credit_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_code TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  description TEXT,
  category TEXT, -- 'resume', 'cover_letter', 'interview', 'job_analysis', 'linkedin', 'ai_assistant'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default credit pricing
INSERT INTO public.credit_pricing (feature_code, feature_name, credit_cost, description, category) VALUES
  -- Resume features
  ('resume_generate', 'Generate New Resume', 5, 'Create a new resume from scratch', 'resume'),
  ('resume_optimize', 'Optimize Resume', 3, 'Optimize existing resume content', 'resume'),
  ('resume_ats_score', 'ATS Score Analysis', 2, 'Analyze resume ATS compatibility', 'resume'),
  ('resume_tailor', 'Tailor Resume to Job', 4, 'Customize resume for specific job', 'resume'),
  
  -- Cover letter features
  ('cover_letter_generate', 'Generate Cover Letter', 4, 'Create a new cover letter', 'cover_letter'),
  ('cover_letter_customize', 'Customize Cover Letter', 3, 'Tailor cover letter for job', 'cover_letter'),
  
  -- Interview features
  ('mock_interview', 'Mock Interview (5 questions)', 10, 'Full mock interview session', 'interview'),
  ('interview_questions', 'Generate Interview Questions', 2, 'Create practice questions', 'interview'),
  ('interview_answer_eval', 'Evaluate Interview Answer', 3, 'Get feedback on answers', 'interview'),
  
  -- Job analysis features
  ('job_description_analysis', 'Job Description Analysis', 2, 'Analyze job requirements', 'job_analysis'),
  ('skills_gap_analysis', 'Skills Gap Analysis', 3, 'Identify missing skills', 'job_analysis'),
  ('job_match_score', 'Job Match Scoring', 1, 'Calculate job compatibility', 'job_analysis'),
  
  -- LinkedIn features
  ('linkedin_profile_optimize', 'LinkedIn Profile Optimization', 5, 'Optimize full LinkedIn profile', 'linkedin'),
  ('linkedin_headline', 'LinkedIn Headline Generation', 2, 'Create compelling headline', 'linkedin'),
  ('linkedin_about', 'LinkedIn About Section', 3, 'Write about section', 'linkedin'),
  
  -- AI Assistant features
  ('ai_simple_question', 'Simple AI Question', 1, 'Basic career question', 'ai_assistant'),
  ('ai_complex_analysis', 'Complex AI Analysis', 3, 'In-depth analysis', 'ai_assistant'),
  ('ai_career_advice', 'Career Advice', 2, 'Personalized career guidance', 'ai_assistant')
ON CONFLICT (feature_code) DO NOTHING;

-- Create credit allocation rules table
CREATE TABLE IF NOT EXISTS public.credit_allocation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type plan_enum NOT NULL,
  monthly_credits INTEGER NOT NULL,
  rollover_months INTEGER DEFAULT 3, -- how many months credits can roll over
  max_rollover_credits INTEGER, -- NULL means unlimited
  bonus_annual_credits INTEGER DEFAULT 0, -- extra credits for annual plans
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_type)
);

-- Insert credit allocation rules
INSERT INTO public.credit_allocation_rules (plan_type, monthly_credits, rollover_months, max_rollover_credits, bonus_annual_credits) VALUES
  ('FREE', 10, 0, 0, 0), -- Free: 10 credits, no rollover
  ('PREMIUM', 100, 3, 300, 20), -- Premium: 100 credits, 3 months rollover, max 300, +20 for annual
  ('PREMIUM_PLUS', 500, NULL, NULL, 100) -- Premium Plus: 500 credits, unlimited rollover, +100 for annual
ON CONFLICT (plan_type) DO UPDATE SET
  monthly_credits = EXCLUDED.monthly_credits,
  rollover_months = EXCLUDED.rollover_months,
  max_rollover_credits = EXCLUDED.max_rollover_credits,
  bonus_annual_credits = EXCLUDED.bonus_annual_credits,
  updated_at = NOW();

-- Function to grant credits to user
CREATE OR REPLACE FUNCTION grant_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT DEFAULT 'grant',
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_current_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Get current balance
  SELECT credit_balance INTO v_current_balance
  FROM public.users
  WHERE id = p_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Create transaction record
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    transaction_type,
    metadata,
    expires_at
  ) VALUES (
    p_user_id,
    p_amount,
    v_current_balance,
    v_current_balance + p_amount,
    p_transaction_type,
    p_metadata,
    p_expires_at
  ) RETURNING id INTO v_transaction_id;

  -- Update user balance
  UPDATE public.users
  SET 
    credit_balance = credit_balance + p_amount,
    total_credits_earned = total_credits_earned + p_amount,
    credits_expire_at = CASE 
      WHEN p_expires_at IS NOT NULL THEN p_expires_at
      ELSE credits_expire_at
    END
  WHERE id = p_user_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits from user
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_feature TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_current_balance INTEGER;
  v_transaction_id UUID;
  v_feature_cost INTEGER;
BEGIN
  -- Get current balance
  SELECT credit_balance INTO v_current_balance
  FROM public.users
  WHERE id = p_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if user has enough credits
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', p_amount, v_current_balance;
  END IF;

  -- Get feature cost from pricing table
  SELECT credit_cost INTO v_feature_cost
  FROM public.credit_pricing
  WHERE feature_code = p_feature AND is_active = TRUE;

  -- Create transaction record
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    transaction_type,
    feature,
    feature_cost,
    reference_id,
    metadata
  ) VALUES (
    p_user_id,
    -p_amount,
    v_current_balance,
    v_current_balance - p_amount,
    'usage',
    p_feature,
    v_feature_cost,
    p_reference_id,
    p_metadata
  ) RETURNING id INTO v_transaction_id;

  -- Update user balance
  UPDATE public.users
  SET 
    credit_balance = credit_balance - p_amount,
    total_credits_used = total_credits_used + p_amount
  WHERE id = p_user_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has enough credits
CREATE OR REPLACE FUNCTION check_credits(
  p_user_id UUID,
  p_feature TEXT
) RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_required_credits INTEGER;
  v_has_enough BOOLEAN;
BEGIN
  -- Get current balance
  SELECT credit_balance INTO v_current_balance
  FROM public.users
  WHERE id = p_user_id;

  -- Get required credits for feature
  SELECT credit_cost INTO v_required_credits
  FROM public.credit_pricing
  WHERE feature_code = p_feature AND is_active = TRUE;

  IF v_required_credits IS NULL THEN
    RAISE EXCEPTION 'Feature not found or inactive: %', p_feature;
  END IF;

  v_has_enough := v_current_balance >= v_required_credits;

  RETURN jsonb_build_object(
    'has_enough', v_has_enough,
    'current_balance', v_current_balance,
    'required_credits', v_required_credits,
    'remaining_after', v_current_balance - v_required_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant monthly credits based on subscription
CREATE OR REPLACE FUNCTION grant_monthly_credits(
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_user_plan plan_enum;
  v_monthly_credits INTEGER;
  v_bonus_credits INTEGER;
  v_total_credits INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_rollover_months INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Get user's plan
  SELECT plan INTO v_user_plan
  FROM public.users
  WHERE id = p_user_id;

  -- Get credit allocation for plan
  SELECT monthly_credits, rollover_months, bonus_annual_credits
  INTO v_monthly_credits, v_rollover_months, v_bonus_credits
  FROM public.credit_allocation_rules
  WHERE plan_type = v_user_plan;

  IF v_monthly_credits IS NULL THEN
    RAISE EXCEPTION 'No credit allocation found for plan: %', v_user_plan;
  END IF;

  -- Calculate expiry date
  IF v_rollover_months IS NOT NULL AND v_rollover_months > 0 THEN
    v_expires_at := NOW() + (v_rollover_months || ' months')::INTERVAL;
  ELSE
    v_expires_at := NOW() + INTERVAL '1 month'; -- Credits expire in 1 month for free plan
  END IF;

  -- Grant credits
  v_transaction_id := grant_credits(
    p_user_id,
    v_monthly_credits,
    'grant',
    v_expires_at,
    jsonb_build_object(
      'source', 'monthly_allocation',
      'plan', v_user_plan,
      'period', TO_CHAR(NOW(), 'YYYY-MM')
    )
  );

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Create RLS policies for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policies for credit_pricing (read-only for all authenticated users)
ALTER TABLE public.credit_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view credit pricing"
  ON public.credit_pricing
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Create RLS policies for credit_allocation_rules (read-only for all authenticated users)
ALTER TABLE public.credit_allocation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view credit allocation rules"
  ON public.credit_allocation_rules
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Add comments
COMMENT ON TABLE public.credit_transactions IS 'Tracks all credit transactions for users';
COMMENT ON TABLE public.credit_pricing IS 'Defines credit costs for each feature';
COMMENT ON TABLE public.credit_allocation_rules IS 'Defines credit allocation rules per plan type';

