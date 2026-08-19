-- Migration 021: Security Hardening for Referral & Promo Code Submissions
-- Description: Adds advisory transaction locking, strict character validation, and attack mitigation
-- Date: 2026-08-19

-- 1. Create table to log failed/suspicious code attempts for intrusion detection
CREATE TABLE IF NOT EXISTS public.failed_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  attempted_code TEXT NOT NULL,
  ip_address TEXT,
  attempt_type TEXT NOT NULL, -- 'referral', 'promo', 'unknown'
  error_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_code_attempts_user ON public.failed_code_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_failed_code_attempts_created_at ON public.failed_code_attempts(created_at DESC);

-- Enable RLS
ALTER TABLE public.failed_code_attempts ENABLE ROW LEVEL SECURITY;

-- 2. Hardened apply_promo_code function with Advisory Lock & Strict Regex Validation
CREATE OR REPLACE FUNCTION public.apply_promo_code(
  p_user_id UUID,
  p_promo_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo RECORD;
  v_normalized_code TEXT;
  v_credits INTEGER;
  v_redemption_id UUID;
BEGIN
  -- Strip whitespace and normalize to uppercase
  v_normalized_code := UPPER(TRIM(p_promo_code));

  -- 1. Strict Input Validation (Mitigates SQLi, XSS, Unicode homoglyphs, and Dictionary fuzzing payloads)
  IF v_normalized_code IS NULL OR v_normalized_code !~ '^[A-Z0-9_-]{3,20}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid promo code format.'
    );
  END IF;

  -- 2. Acquire Transaction-Scoped Advisory Lock on user_id to prevent concurrent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('promo_redemption:' || p_user_id::text));

  -- 3. Check if user already redeemed any promo code (One-time redemption policy per user)
  IF EXISTS(SELECT 1 FROM public.promo_code_redemptions WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already redeemed a promotional code.'
    );
  END IF;

  -- 4. Find matching active promo code with Row Lock
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE UPPER(code) = v_normalized_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;

  IF v_promo IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired promo code.'
    );
  END IF;

  -- 5. Check global usage cap
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This promo code has reached its maximum limit.'
    );
  END IF;

  v_credits := v_promo.credits_granted;

  -- 6. Record redemption
  INSERT INTO public.promo_code_redemptions (
    promo_code_id,
    user_id,
    code,
    credits_granted
  ) VALUES (
    v_promo.id,
    p_user_id,
    v_normalized_code,
    v_credits
  ) RETURNING id INTO v_redemption_id;

  -- 7. Increment current_uses
  UPDATE public.promo_codes
  SET 
    current_uses = current_uses + 1,
    updated_at = NOW()
  WHERE id = v_promo.id;

  -- 8. Grant credits to user: update ai_credits, credit_balance, total_credits_earned
  UPDATE public.users
  SET
    ai_credits = COALESCE(ai_credits, 0) + v_credits,
    credit_balance = COALESCE(credit_balance, 0) + v_credits,
    total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 9. Record transaction log in credit_transactions
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    transaction_type,
    metadata
  )
  SELECT
    p_user_id,
    v_credits,
    COALESCE(ai_credits, 0) - v_credits,
    COALESCE(ai_credits, 0),
    'bonus',
    jsonb_build_object(
      'source', 'promo_code',
      'promo_code', v_normalized_code,
      'promo_code_id', v_promo.id,
      'redemption_id', v_redemption_id
    )
  FROM public.users
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_promo', true,
    'promo_code', v_normalized_code,
    'credits_granted', v_credits,
    'redemption_id', v_redemption_id,
    'message', 'Success! Promo code applied! You received ' || v_credits || ' bonus credits!'
  );
END;
$$;

-- 3. Hardened apply_referral_code function with Advisory Lock & Strict Regex Validation
CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  v_credits_for_referrer INTEGER := 10;
  v_credits_for_referred INTEGER := 10;
  v_referrer_total INTEGER;
  v_normalized_code TEXT;
BEGIN
  v_normalized_code := UPPER(TRIM(p_referral_code));

  -- 1. Strict Input Validation
  IF v_normalized_code IS NULL OR v_normalized_code !~ '^[A-Z0-9_-]{3,20}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code format.'
    );
  END IF;

  -- 2. Acquire Transaction-Scoped Advisory Lock on user_id to prevent concurrent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('referral_redemption:' || p_referred_user_id::text));

  -- 3. Find the referrer
  SELECT id INTO v_referrer_id
  FROM public.users
  WHERE referral_code = v_normalized_code;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code'
    );
  END IF;

  -- 4. Prevent self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot use your own referral code'
    );
  END IF;

  -- 5. Prevent duplicate referrals
  IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already referred'
    );
  END IF;

  -- 6. Check referrer referral cap (max 100 referrals per user)
  SELECT total_referrals INTO v_referrer_total
  FROM public.users
  WHERE id = v_referrer_id;

  IF v_referrer_total >= 100 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This referral code has reached its maximum usage limit'
    );
  END IF;

  -- Unlock referral columns for this SECURITY DEFINER function
  PERFORM set_config('app.referral_lock', 'unlocked', true);

  -- 7. Create referral record
  INSERT INTO public.referrals (
    referrer_id, referred_id, referral_code,
    credits_granted_to_referrer, credits_granted_to_referred, status
  ) VALUES (
    v_referrer_id, p_referred_user_id, v_normalized_code,
    v_credits_for_referrer, v_credits_for_referred, 'completed'
  ) RETURNING id INTO v_referral_id;

  -- 8. Update referred user
  UPDATE public.users
  SET
    referred_by = v_referrer_id,
    ai_credits = COALESCE(ai_credits, 0) + v_credits_for_referred,
    credit_balance = COALESCE(credit_balance, 0) + v_credits_for_referred,
    total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits_for_referred,
    updated_at = NOW()
  WHERE id = p_referred_user_id;

  -- 9. Update referrer
  UPDATE public.users
  SET
    total_referrals = total_referrals + 1,
    referral_credits_earned = referral_credits_earned + v_credits_for_referrer,
    ai_credits = COALESCE(ai_credits, 0) + v_credits_for_referrer,
    credit_balance = COALESCE(credit_balance, 0) + v_credits_for_referrer,
    total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits_for_referrer,
    updated_at = NOW()
  WHERE id = v_referrer_id;

  -- 10. Record credit transactions
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_before, balance_after,
    transaction_type, metadata
  )
  SELECT
    p_referred_user_id,
    v_credits_for_referred,
    COALESCE(ai_credits, 0) - v_credits_for_referred,
    COALESCE(ai_credits, 0),
    'bonus',
    jsonb_build_object(
      'source', 'referral_signup',
      'referrer_id', v_referrer_id,
      'referral_code', v_normalized_code
    )
  FROM public.users
  WHERE id = p_referred_user_id;

  INSERT INTO public.credit_transactions (
    user_id, amount, balance_before, balance_after,
    transaction_type, metadata
  )
  SELECT
    v_referrer_id,
    v_credits_for_referrer,
    COALESCE(ai_credits, 0) - v_credits_for_referrer,
    COALESCE(ai_credits, 0),
    'bonus',
    jsonb_build_object(
      'source', 'referral_reward',
      'referred_user_id', p_referred_user_id,
      'referral_code', v_normalized_code
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
$$;
