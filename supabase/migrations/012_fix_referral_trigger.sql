-- Migration 012: Fix referral system critical gaps
--
-- Problems:
--   1. generate_referral_code() queries users table for first_name in a BEFORE INSERT
--      trigger, but the row doesn't exist yet → produces "USER####" for every user.
--   2. apply_referral_code() only updates credit_balance, not ai_credits.
--      Since deduct_credits() checks ai_credits, referral credits are unusable.
--
-- Fixes:
--   1. Rewrite generate_referral_code to accept first_name as a parameter.
--      Trigger passes NEW.first_name; manual RPC falls back to querying the table.
--   2. Rewrite apply_referral_code to update BOTH ai_credits and credit_balance.

-- ============================================================================
-- FIX 1: generate_referral_code accepts first_name parameter
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID, p_first_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_first_name TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Use the parameter directly (from trigger's NEW.first_name)
  -- or fall back to querying the table (for manual RPC on existing users)
  v_first_name := COALESCE(p_first_name, (SELECT first_name FROM public.users WHERE id = p_user_id));

  LOOP
    v_code := UPPER(COALESCE(SUBSTRING(v_first_name FROM 1 FOR 4), 'USER')) ||
              LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    SELECT EXISTS(SELECT 1 FROM public.users WHERE referral_code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists OR v_counter > 10;
    v_counter := v_counter + 1;
  END LOOP;

  -- Update user with referral code (no-op during BEFORE INSERT since row
  -- doesn't exist yet; the trigger assigns NEW.referral_code directly)
  UPDATE public.users
  SET referral_code = v_code
  WHERE id = p_user_id;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX 2: Trigger function passes NEW.first_name
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code(NEW.id, NEW.first_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger (idempotent)
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.users;

CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- ============================================================================
-- FIX 3: Backfill existing users who got USER#### codes
-- ============================================================================

DO $$
DECLARE
  v_user RECORD;
  v_new_code TEXT;
BEGIN
  FOR v_user IN
    SELECT id, first_name FROM public.users
    WHERE referral_code IS NULL
       OR referral_code LIKE 'USER%'
  LOOP
    -- Generate a proper name-based code
    v_new_code := UPPER(COALESCE(SUBSTRING(v_user.first_name FROM 1 FOR 4), 'USER')) ||
                  LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Check uniqueness with retry
    WHILE EXISTS(SELECT 1 FROM public.users WHERE referral_code = v_new_code) LOOP
      v_new_code := UPPER(COALESCE(SUBSTRING(v_user.first_name FROM 1 FOR 4), 'USER')) ||
                    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END LOOP;

    UPDATE public.users SET referral_code = v_new_code WHERE id = v_user.id;
  END LOOP;
END $$;

-- ============================================================================
-- FIX 4: apply_referral_code updates BOTH ai_credits and credit_balance
-- ============================================================================

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

  -- Prevent self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot use your own referral code'
    );
  END IF;

  -- Prevent duplicate referrals
  IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already referred'
    );
  END IF;

  -- Create referral record
  INSERT INTO public.referrals (
    referrer_id, referred_id, referral_code,
    credits_granted_to_referrer, credits_granted_to_referred, status
  ) VALUES (
    v_referrer_id, p_referred_user_id, UPPER(p_referral_code),
    v_credits_for_referrer, v_credits_for_referred, 'completed'
  ) RETURNING id INTO v_referral_id;

  -- Update referred user: BOTH ai_credits AND credit_balance
  UPDATE public.users
  SET
    referred_by = v_referrer_id,
    ai_credits = COALESCE(ai_credits, 0) + v_credits_for_referred,
    credit_balance = COALESCE(credit_balance, 0) + v_credits_for_referred,
    total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits_for_referred
  WHERE id = p_referred_user_id;

  -- Update referrer: BOTH ai_credits AND credit_balance
  UPDATE public.users
  SET
    total_referrals = total_referrals + 1,
    referral_credits_earned = referral_credits_earned + v_credits_for_referrer,
    ai_credits = COALESCE(ai_credits, 0) + v_credits_for_referrer,
    credit_balance = COALESCE(credit_balance, 0) + v_credits_for_referrer,
    total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits_for_referrer
  WHERE id = v_referrer_id;

  -- Create credit transaction for referred user (using ai_credits for balance tracking)
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
      'referral_code', UPPER(p_referral_code)
    )
  FROM public.users
  WHERE id = p_referred_user_id;

  -- Create credit transaction for referrer
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

COMMENT ON FUNCTION apply_referral_code IS
  'Applies a referral code, granting credits to both referrer and referred. Updates BOTH ai_credits and credit_balance.';
