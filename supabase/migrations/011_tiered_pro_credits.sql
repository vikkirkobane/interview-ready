-- Migration 011: Tiered credit limits for Pro subscribers
-- PREMIUM      → 150 credits / month
-- PREMIUM_PLUS → 400 credits / month
-- Replaces the previous 999999 (unlimited) grant for all pro users.

-- ─── 1. Add monthly_credits column to paystack_plans ─────────────────────────
-- Stores how many credits each plan grants per billing cycle.

ALTER TABLE public.paystack_plans
  ADD COLUMN IF NOT EXISTS monthly_credits INTEGER NOT NULL DEFAULT 150;

-- Assign correct amounts per plan_type
UPDATE public.paystack_plans
SET monthly_credits = CASE
  WHEN plan_type = 'PREMIUM'      THEN 150
  WHEN plan_type = 'PREMIUM_PLUS' THEN 400
  ELSE 10  -- fallback / FREE
END;

-- ─── 2. Update credit_allocation_rules to match ───────────────────────────────

UPDATE public.credit_allocation_rules
SET
  monthly_credits        = 150,
  max_rollover_credits   = 300,
  bonus_annual_credits   = 30,
  updated_at             = NOW()
WHERE plan_type = 'PREMIUM';

UPDATE public.credit_allocation_rules
SET
  monthly_credits        = 400,
  max_rollover_credits   = NULL,   -- unlimited rollover for power users
  bonus_annual_credits   = 80,
  updated_at             = NOW()
WHERE plan_type = 'PREMIUM_PLUS';

-- ─── 3. Replace upsert_paystack_subscription ─────────────────────────────────
-- Reads monthly_credits from paystack_plans instead of hard-coding 999999.
-- Also syncs BOTH credit columns and logs a credit_transactions grant row.

CREATE OR REPLACE FUNCTION public.upsert_paystack_subscription(
  p_user_id               UUID,
  p_subscription_code     TEXT,
  p_customer_code         TEXT,
  p_plan_code             TEXT,
  p_authorization_code    TEXT,
  p_status                sub_status_enum,
  p_current_period_start  TIMESTAMPTZ,
  p_current_period_end    TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_subscription_id  UUID;
  v_plan_type        plan_enum;
  v_interval         billing_interval_enum;
  v_credits          INTEGER;
  v_current_balance  INTEGER;
BEGIN
  -- Resolve plan metadata
  SELECT plan_type, interval, monthly_credits
    INTO v_plan_type, v_interval, v_credits
  FROM public.paystack_plans
  WHERE plan_code = p_plan_code;

  -- Fallback if plan not found
  IF v_credits IS NULL THEN
    v_credits := 10;
  END IF;

  -- Upsert subscription row
  INSERT INTO public.subscriptions (
    user_id, paystack_subscription_code, paystack_customer_code,
    paystack_plan_code, paystack_authorization_code, payment_provider,
    plan, interval, status, current_period_start, current_period_end
  ) VALUES (
    p_user_id, p_subscription_code, p_customer_code,
    p_plan_code, p_authorization_code, 'paystack',
    v_plan_type, v_interval, p_status,
    p_current_period_start, p_current_period_end
  )
  ON CONFLICT (paystack_subscription_code)
  DO UPDATE SET
    status               = p_status,
    current_period_start = p_current_period_start,
    current_period_end   = p_current_period_end,
    updated_at           = NOW()
  RETURNING id INTO v_subscription_id;

  -- Read current balance before updating (for transaction log)
  SELECT ai_credits INTO v_current_balance FROM public.users WHERE id = p_user_id;

  -- Update user: plan + BOTH credit columns
  UPDATE public.users
  SET
    plan            = v_plan_type,
    plan_expires_at = p_current_period_end,
    ai_credits      = v_credits,
    credit_balance  = v_credits,
    updated_at      = NOW()
  WHERE id = p_user_id;

  -- Log a 'purchase' grant in credit_transactions so Realtime fires
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_before, balance_after,
    transaction_type, metadata
  ) VALUES (
    p_user_id,
    v_credits - COALESCE(v_current_balance, 0),
    COALESCE(v_current_balance, 0),
    v_credits,
    'purchase',
    jsonb_build_object(
      'plan_code',  p_plan_code,
      'plan_type',  v_plan_type,
      'sub_code',   p_subscription_code
    )
  );

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 4. Replace reset_monthly_credits to use plan-specific amounts ────────────

CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS VOID AS $$
BEGIN
  -- Free users: reset to 10
  UPDATE public.users
  SET ai_credits = 10, credit_balance = 10
  WHERE plan = 'FREE';

  -- PREMIUM users: top up to 150
  UPDATE public.users
  SET ai_credits = 150, credit_balance = 150
  WHERE plan = 'PREMIUM';

  -- PREMIUM_PLUS users: top up to 400
  UPDATE public.users
  SET ai_credits = 400, credit_balance = 400
  WHERE plan = 'PREMIUM_PLUS';

  -- Expired pro plans: demote to free
  UPDATE public.users
  SET
    ai_credits      = 10,
    credit_balance  = 10,
    plan            = 'FREE',
    plan_expires_at = NULL
  WHERE
    plan IN ('PREMIUM', 'PREMIUM_PLUS')
    AND plan_expires_at IS NOT NULL
    AND plan_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Fix handle_expired_subscriptions to also reset credit_balance ─────────

CREATE OR REPLACE FUNCTION public.handle_expired_subscriptions()
RETURNS VOID AS $$
BEGIN
  UPDATE public.users u
  SET
    plan            = 'FREE',
    ai_credits      = 10,
    credit_balance  = 10,
    plan_expires_at = NULL,
    updated_at      = NOW()
  FROM public.subscriptions s
  WHERE u.id = s.user_id
    AND s.status = 'CANCELED'
    AND s.current_period_end < NOW()
    AND u.plan != 'FREE';

  -- Mark subscriptions past their period as CANCELED
  UPDATE public.subscriptions
  SET status = 'CANCELED'
  WHERE current_period_end < NOW()
    AND status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. Migrate existing pro users from 999999 → correct tier amount ──────────
-- One-time update: bring all live pro subscribers in line with the new limits.

UPDATE public.users
SET
  ai_credits     = 150,
  credit_balance = 150
WHERE plan = 'PREMIUM'
  AND (ai_credits > 150 OR ai_credits = 999999);

UPDATE public.users
SET
  ai_credits     = 400,
  credit_balance = 400
WHERE plan = 'PREMIUM_PLUS'
  AND (ai_credits > 400 OR ai_credits = 999999);

COMMENT ON FUNCTION public.upsert_paystack_subscription IS
  'Creates or updates a Paystack subscription. Grants plan-specific credits: PREMIUM=150, PREMIUM_PLUS=400.';
COMMENT ON FUNCTION public.reset_monthly_credits IS
  'Monthly credit top-up: FREE=10, PREMIUM=150, PREMIUM_PLUS=400. Demotes expired pro plans to FREE.';
