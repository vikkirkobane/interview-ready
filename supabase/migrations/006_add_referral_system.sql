-- Referral System Implementation
-- Tracks referral codes, referrals, and rewards

-- Add referral fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_credits_earned INTEGER DEFAULT 0;

-- Create referrals table to track all referral relationships
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  credits_granted_to_referrer INTEGER DEFAULT 10,
  credits_granted_to_referred INTEGER DEFAULT 10,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_first_name TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Get user's first name
  SELECT first_name INTO v_first_name
  FROM public.users
  WHERE id = p_user_id;
  
  -- Generate code based on first name + random number
  LOOP
    v_code := UPPER(COALESCE(SUBSTRING(v_first_name FROM 1 FOR 4), 'USER')) || 
              LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE referral_code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists OR v_counter > 10;
    v_counter := v_counter + 1;
  END LOOP;
  
  -- Update user with referral code
  UPDATE public.users
  SET referral_code = v_code
  WHERE id = p_user_id;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply referral code during signup
CREATE OR REPLACE FUNCTION apply_referral_code(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  v_credits_for_referrer INTEGER := 10;
  v_credits_for_referred INTEGER := 10;
BEGIN
  -- Find referrer by code
  SELECT id INTO v_referrer_id
  FROM public.users
  WHERE referral_code = UPPER(p_referral_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;
  
  -- Check if user is trying to refer themselves
  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot use your own referral code'
    );
  END IF;
  
  -- Check if user was already referred
  IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already referred'
    );
  END IF;
  
  -- Create referral record
  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code,
    credits_granted_to_referrer,
    credits_granted_to_referred,
    status
  ) VALUES (
    v_referrer_id,
    p_referred_user_id,
    UPPER(p_referral_code),
    v_credits_for_referrer,
    v_credits_for_referred,
    'completed'
  ) RETURNING id INTO v_referral_id;
  
  -- Update referred user
  UPDATE public.users
  SET 
    referred_by = v_referrer_id,
    credit_balance = COALESCE(credit_balance, 0) + v_credits_for_referred,
    total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits_for_referred
  WHERE id = p_referred_user_id;
  
  -- Update referrer
  UPDATE public.users
  SET 
    total_referrals = total_referrals + 1,
    referral_credits_earned = referral_credits_earned + v_credits_for_referrer,
    credit_balance = COALESCE(credit_balance, 0) + v_credits_for_referrer,
    total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits_for_referrer
  WHERE id = v_referrer_id;
  
  -- Create credit transaction for referred user
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    transaction_type,
    metadata
  )
  SELECT
    p_referred_user_id,
    v_credits_for_referred,
    COALESCE(credit_balance, 0) - v_credits_for_referred,
    COALESCE(credit_balance, 0),
    'bonus',
    jsonb_build_object(
      'source', 'referral_signup',
      'referrer_id', v_referrer_id,
      'referral_code', UPPER(p_referral_code)
    )
  FROM public.users
  WHERE id = p_referred_user_id;
  
  -- Create credit transaction for referrer
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    transaction_type,
    metadata
  )
  SELECT
    v_referrer_id,
    v_credits_for_referrer,
    COALESCE(credit_balance, 0) - v_credits_for_referrer,
    COALESCE(credit_balance, 0),
    'bonus',
    jsonb_build_object(
      'source', 'referral_reward',
      'referred_user_id', p_referred_user_id,
      'referral_code', UPPER(p_referral_code)
    )
  FROM public.users
  WHERE id = v_referrer_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'credits_granted', v_credits_for_referred,
    'referrer_credits', v_credits_for_referrer
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral stats for a user
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'referral_code', u.referral_code,
    'total_referrals', u.total_referrals,
    'credits_earned', u.referral_credits_earned,
    'referrals', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'referred_user', jsonb_build_object(
            'first_name', ru.first_name,
            'last_name', ru.last_name,
            'email', ru.email
          ),
          'credits_granted', r.credits_granted_to_referrer,
          'created_at', r.created_at
        )
      ), '[]'::jsonb)
      FROM public.referrals r
      JOIN public.users ru ON ru.id = r.referred_id
      WHERE r.referrer_id = p_user_id
      ORDER BY r.created_at DESC
    )
  ) INTO v_stats
  FROM public.users u
  WHERE u.id = p_user_id;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Create RLS policies for referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Add comments
COMMENT ON TABLE public.referrals IS 'Tracks referral relationships and rewards';
COMMENT ON COLUMN public.users.referral_code IS 'Unique referral code for sharing';
COMMENT ON COLUMN public.users.referred_by IS 'User who referred this user';
COMMENT ON COLUMN public.users.total_referrals IS 'Total number of successful referrals';
COMMENT ON COLUMN public.users.referral_credits_earned IS 'Total credits earned from referrals';
