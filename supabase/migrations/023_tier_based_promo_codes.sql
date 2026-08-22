-- Migration 023: Enforce One Redemption Per Promo Code Tier Per User
-- Description:
--   1. Adds 'tier' column to public.promo_codes and public.promo_code_redemptions
--   2. Enforces unique constraint (user_id, tier) so users can redeem at most 1 promo code per tier
--   3. Updates apply_promo_code() procedure with tier validation and clear user-facing errors

-- 1. Add tier column to promo_codes table
ALTER TABLE public.promo_codes 
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'TIER_1';

-- Update all existing promo codes to appropriate tiers based on credits granted
UPDATE public.promo_codes
SET tier = CASE
  WHEN credits_granted >= 120 THEN 'TIER_4'
  WHEN credits_granted >= 75  THEN 'TIER_3'
  WHEN credits_granted >= 40  THEN 'TIER_2'
  ELSE 'TIER_1'
END;

-- Ensure newly inserted promo codes are assigned to correct tiers
UPDATE public.promo_codes SET tier = 'TIER_1' WHERE code IN ('WELCOME20', 'LINKEDIN20', 'LINKEDIN', 'PROMO20', 'BONUS20', 'TWITTER20', 'REDDIT20', 'EMAIL25', 'NEWSLETTER25', 'COMMUNITY30', 'INTERVIEWREADY', 'CAREER35');
UPDATE public.promo_codes SET tier = 'TIER_2' WHERE code IN ('FASTTRACK40', 'WELCOME50', 'PRO2026', 'INTERVIEW50', 'RESUME50', 'BOOST60');
UPDATE public.promo_codes SET tier = 'TIER_3' WHERE code IN ('SUMMER75', 'VIP80', 'LAUNCH100', 'CAREERPRO100', 'HIRINGSEASON100');
UPDATE public.promo_codes SET tier = 'TIER_4' WHERE code IN ('EXCLUSIVE120', 'SPECIAL125', 'POWERUSER140', 'ULTIMATE150', 'EXECUTIVE150');

-- 2. Add tier column to promo_code_redemptions table
ALTER TABLE public.promo_code_redemptions 
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'TIER_1';

-- Backfill existing redemption records
UPDATE public.promo_code_redemptions r
SET tier = COALESCE(p.tier, 'TIER_1')
FROM public.promo_codes p
WHERE r.promo_code_id = p.id;

-- 3. Replace global single-redemption constraint with per-tier unique constraint
ALTER TABLE public.promo_code_redemptions 
  DROP CONSTRAINT IF EXISTS uq_user_promo_redemption;

ALTER TABLE public.promo_code_redemptions 
  DROP CONSTRAINT IF EXISTS uq_user_tier_redemption;

ALTER TABLE public.promo_code_redemptions 
  ADD CONSTRAINT uq_user_tier_redemption UNIQUE (user_id, tier);

-- Create index for quick tier lookup
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_tier 
  ON public.promo_code_redemptions(user_id, tier);

-- 4. Update stored procedure: apply_promo_code with tier-level verification
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
  v_tier TEXT;
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

  -- 3. Find matching active promo code with Row Lock
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

  v_credits := v_promo.credits_granted;
  v_tier := COALESCE(v_promo.tier, 'TIER_1');

  -- 4. Check if user already redeemed any promo code from this specific tier
  IF EXISTS (
    SELECT 1 FROM public.promo_code_redemptions
    WHERE user_id = p_user_id AND tier = v_tier
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already redeemed a promotional code from this tier (' || v_tier || '). Each promo tier can only be redeemed once per account.'
    );
  END IF;

  -- 5. Check global usage cap for this specific code
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This promo code has reached its maximum limit.'
    );
  END IF;

  -- 6. Record redemption with tier tracking
  INSERT INTO public.promo_code_redemptions (
    promo_code_id,
    user_id,
    code,
    tier,
    credits_granted
  ) VALUES (
    v_promo.id,
    p_user_id,
    v_normalized_code,
    v_tier,
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
      'tier', v_tier,
      'promo_code_id', v_promo.id,
      'redemption_id', v_redemption_id
    )
  FROM public.users
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_promo', true,
    'promo_code', v_normalized_code,
    'tier', v_tier,
    'credits_granted', v_credits,
    'message', 'Success! Promo code applied! You received ' || v_credits || ' bonus credits!'
  );
END;
$$;
