-- Migration 010: Fix dual-column credit deduction + cancellation reset + monthly cron
-- Resolves:
--   1. deduct_credits only wrote to ai_credits, not credit_balance or credit_transactions
--   2. subscription.disable webhook never reset credits to free tier
--   3. reset_monthly_credits() had no scheduler

-- ─── FIX 1: Unified deduct_credits RPC ────────────────────────────────────────
-- Now atomically deducts from BOTH ai_credits and credit_balance, and logs
-- a row to credit_transactions so the Realtime subscription fires on the frontend.

CREATE OR REPLACE FUNCTION public.deduct_credits(
  user_uuid UUID,
  amount    INT
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INT;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT ai_credits INTO current_credits
  FROM public.users
  WHERE id = user_uuid
  FOR UPDATE;

  IF current_credits IS NULL OR current_credits < amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct from BOTH credit columns atomically
  UPDATE public.users
  SET
    ai_credits         = ai_credits - amount,
    credit_balance     = GREATEST(0, COALESCE(credit_balance, 0) - amount),
    total_credits_used = COALESCE(total_credits_used, 0) + amount
  WHERE id = user_uuid;

  -- Log to credit_transactions → triggers Realtime on the frontend
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_before,
    balance_after,
    transaction_type,
    feature_cost
  ) VALUES (
    user_uuid,
    -amount,
    current_credits,
    current_credits - amount,
    'usage',
    amount
  );

  -- Retain legacy usage_events row for analytics
  INSERT INTO public.usage_events (user_id, event, credits_used)
  VALUES (user_uuid, 'credit_deduction', amount);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── FIX 2: reset_monthly_credits also syncs credit_balance ──────────────────
-- Ensure both columns are kept in sync when free-tier credits are reset.

CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS VOID AS $$
BEGIN
  -- Free users: reset to 10 each month
  UPDATE public.users
  SET
    ai_credits     = 10,
    credit_balance = 10
  WHERE plan = 'FREE';

  -- Pro users whose plan has expired: demote to free tier
  UPDATE public.users
  SET
    ai_credits     = 10,
    credit_balance = 10,
    plan           = 'FREE'
  WHERE
    plan IN ('PREMIUM', 'PREMIUM_PLUS')
    AND plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── FIX 3: pg_cron monthly reset scheduler ───────────────────────────────────
-- Runs reset_monthly_credits() at midnight UTC on the 1st of every month.
-- Requires the pg_cron extension to be enabled on the Supabase project
-- (Dashboard → Database → Extensions → pg_cron).

DO $$
BEGIN
  -- Only schedule if pg_cron extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Remove existing schedule if present (idempotent)
    PERFORM cron.unschedule('monthly-credit-reset')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'monthly-credit-reset'
    );

    -- Schedule: minute=0, hour=0, day=1 of month, any month, any weekday
    PERFORM cron.schedule(
      'monthly-credit-reset',
      '0 0 1 * *',
      'SELECT public.reset_monthly_credits()'
    );
    RAISE NOTICE 'pg_cron job "monthly-credit-reset" scheduled.';
  ELSE
    RAISE NOTICE 'pg_cron extension not found — monthly reset must be triggered manually or via a scheduled Edge Function.';
  END IF;
END $$;

-- ─── FIX 4: handle_new_user — give new users 10 credits on BOTH columns ───────
-- The original trigger only inserted into users (inheriting ai_credits DEFAULT 10)
-- but credit_balance had DEFAULT 0, causing the two to diverge immediately.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, ai_credits, credit_balance)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    10,
    10
  );

  INSERT INTO public.user_profiles (user_id, profile_completeness)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── FIX 5: Backfill existing users where credit_balance < ai_credits ─────────
-- One-time data repair for any user rows already diverged.

UPDATE public.users
SET credit_balance = ai_credits
WHERE credit_balance IS NULL
   OR credit_balance < ai_credits;

