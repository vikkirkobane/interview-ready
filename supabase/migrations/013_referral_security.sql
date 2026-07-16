-- Migration 013: Referral system security hardening
--
-- Fixes from security audit:
--   1. CRITICAL: Prevent users from modifying referral columns via direct Supabase client
--   2. MEDIUM: Use pgcrypto for referral code generation (cryptographically secure)
--   3. MEDIUM: Increase collision retry limit from 10 to 100
--   4. MEDIUM: Add referral cap (max 100 referrals per user)
--   5. MEDIUM: Remove email addresses from referral stats (privacy)

-- ============================================================================
-- FIX 1: Prevent direct client modification of referral columns
-- ============================================================================
-- Uses a session variable gating approach:
--   - SECURITY DEFINER functions set app.referral_lock = 'unlocked' before updates
--   - This trigger blocks any update to referral columns when the lock is not set
--   - Direct client calls (RLS context) never set the variable, so they are blocked

CREATE OR REPLACE FUNCTION prevent_referral_column_tampering()
RETURNS TRIGGER AS $$
BEGIN
  -- If the session variable is set to 'unlocked', allow the change
  -- (set by SECURITY DEFINER functions like apply_referral_code)
  IF current_setting('app.referral_lock', true) = 'unlocked' THEN
    RETURN NEW;
  END IF;

  -- Block changes to referral_code
  IF OLD.referral_code IS DISTINCT FROM NEW.referral_code THEN
    RAISE EXCEPTION 'Cannot modify referral_code directly. Use the referral system.';
  END IF;

  -- Block changes to referred_by
  IF OLD.referred_by IS DISTINCT FROM NEW.referred_by THEN
    RAISE EXCEPTION 'Cannot modify referred_by directly. Use the referral system.';
  END IF;

  -- Block changes to total_referrals
  IF OLD.total_referrals IS DISTINCT FROM NEW.total_referrals THEN
    RAISE EXCEPTION 'Cannot modify total_referrals directly. Use the referral system.';
  END IF;

  -- Block changes to referral_credits_earned
  IF OLD.referral_credits_earned IS DISTINCT FROM NEW.referral_credits_earned THEN
    RAISE EXCEPTION 'Cannot modify referral_credits_earned directly. Use the referral system.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_referral_tampering ON public.users;

CREATE TRIGGER trigger_prevent_referral_tampering
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_referral_column_tampering();

-- ============================================================================
-- FIX 2 + 3: Use pgcrypto + increase retry limit to 100
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID, p_first_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_first_name TEXT;
  v_counter INTEGER := 0;
  v_random_suffix TEXT;
BEGIN
  -- Use the parameter directly (from trigger's NEW.first_name)
  -- or fall back to querying the table (for manual RPC on existing users)
  v_first_name := COALESCE(p_first_name, (SELECT first_name FROM public.users WHERE id = p_user_id));

  LOOP
    -- Use pgcrypto's gen_random_bytes for cryptographic randomness
    -- 2 bytes = 0-65535, modulo 10000 for 4-digit suffix
    v_random_suffix := LPAD(
      ((get_byte(extensions.gen_random_bytes(1), 0) * 256 + get_byte(extensions.gen_random_bytes(1), 0)) % 10000) :: TEXT,
      4, '0'
    );

    v_code := UPPER(COALESCE(SUBSTRING(v_first_name FROM 1 FOR 4), 'USER')) || v_random_suffix;

    SELECT EXISTS(SELECT 1 FROM public.users WHERE referral_code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists OR v_counter > 100;
    v_counter := v_counter + 1;
  END LOOP;

  -- Unlock referral columns so the UPDATE below doesn't trigger the tamper prevention
  PERFORM set_config('app.referral_lock', 'unlocked', true);

  -- Update user with referral code (no-op during BEFORE INSERT since row
  -- doesn't exist yet; the trigger assigns NEW.referral_code directly)
  UPDATE public.users
  SET referral_code = v_code
  WHERE id = p_user_id;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX 4: Referral cap (max 100 referrals per user) + session lock
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
  v_referrer_total INTEGER;
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

  -- Check referral cap (max 100 referrals per user)
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
  'Applies a referral code with rate limiting (100 cap), credit granting to both parties, and referral column lock. Uses app.referral_lock session variable.';

-- ============================================================================
-- FIX 5: Remove email addresses from referral stats (privacy)
-- ============================================================================

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
            'last_name', LEFT(COALESCE(ru.last_name, ''), 1) || '.'
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

COMMENT ON FUNCTION get_referral_stats IS
  'Returns referral stats with anonymized referred user data (no email, last name initial only).';

-- ============================================================================
-- BACKFILL: Regenerate any USER#### codes that still exist
-- ============================================================================
-- This was also in migration 012 but may have been blocked by the new trigger
-- if 012's backfill ran after this migration's trigger was created (unlikely but safe).

DO $$
DECLARE
  v_user RECORD;
  v_new_code TEXT;
  v_random_suffix TEXT;
BEGIN
  -- Unlock for the backfill
  PERFORM set_config('app.referral_lock', 'unlocked', true);

  FOR v_user IN
    SELECT id, first_name FROM public.users
    WHERE referral_code IS NULL
       OR referral_code LIKE 'USER%'
  LOOP
    v_random_suffix := LPAD(
      ((get_byte(extensions.gen_random_bytes(1), 0) * 256 + get_byte(extensions.gen_random_bytes(1), 0)) % 10000) :: TEXT,
      4, '0'
    );
    v_new_code := UPPER(COALESCE(SUBSTRING(v_user.first_name FROM 1 FOR 4), 'USER')) || v_random_suffix;

    WHILE EXISTS(SELECT 1 FROM public.users WHERE referral_code = v_new_code) LOOP
      v_random_suffix := LPAD(
        ((get_byte(extensions.gen_random_bytes(1), 0) * 256 + get_byte(extensions.gen_random_bytes(1), 0)) % 10000) :: TEXT,
        4, '0'
      );
      v_new_code := UPPER(COALESCE(SUBSTRING(v_user.first_name FROM 1 FOR 4), 'USER')) || v_random_suffix;
    END LOOP;

    UPDATE public.users SET referral_code = v_new_code WHERE id = v_user.id;
  END LOOP;
END $$;
