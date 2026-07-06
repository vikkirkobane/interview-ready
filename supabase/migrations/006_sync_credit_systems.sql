-- Migration 006: Sync dual credit systems
-- Ensures credit_balance mirrors ai_credits for all existing users
-- so both the legacy (_shared/credits.ts) and new (credit_pricing) systems
-- work from the same source of truth.

-- Sync credit_balance to match ai_credits for all users
-- who have credit_balance = 0 or NULL but ai_credits > 0
UPDATE public.users
SET
  credit_balance = ai_credits,
  total_credits_earned = GREATEST(total_credits_earned, ai_credits)
WHERE
  credit_balance IS NULL
  OR credit_balance = 0 AND ai_credits > 0;

-- Fix upsert_paystack_subscription to also update credit_balance
CREATE OR REPLACE FUNCTION public.upsert_paystack_subscription(
  p_user_id UUID,
  p_subscription_code TEXT,
  p_customer_code TEXT,
  p_plan_code TEXT,
  p_authorization_code TEXT,
  p_status sub_status_enum,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
  v_plan_type plan_enum;
  v_interval billing_interval_enum;
  v_credits INT;
BEGIN
  -- Get plan type and interval from paystack_plans
  SELECT plan_type, interval INTO v_plan_type, v_interval
  FROM public.paystack_plans
  WHERE plan_code = p_plan_code;

  -- Determine credit grant amount
  v_credits := CASE
    WHEN v_plan_type IN ('PREMIUM', 'PREMIUM_PLUS') THEN 999999
    ELSE 10
  END;

  -- Upsert subscription
  INSERT INTO public.subscriptions (
    user_id,
    paystack_subscription_code,
    paystack_customer_code,
    paystack_plan_code,
    paystack_authorization_code,
    payment_provider,
    plan,
    interval,
    status,
    current_period_start,
    current_period_end
  ) VALUES (
    p_user_id,
    p_subscription_code,
    p_customer_code,
    p_plan_code,
    p_authorization_code,
    'paystack',
    v_plan_type,
    v_interval,
    p_status,
    p_current_period_start,
    p_current_period_end
  )
  ON CONFLICT (paystack_subscription_code)
  DO UPDATE SET
    status = p_status,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  -- Update user plan and BOTH credit columns
  UPDATE public.users
  SET
    plan            = v_plan_type,
    plan_expires_at = p_current_period_end,
    ai_credits      = v_credits,
    credit_balance  = v_credits,
    updated_at      = NOW()
  WHERE id = p_user_id;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.upsert_paystack_subscription IS
  'Creates or updates a Paystack subscription and syncs both credit columns (ai_credits + credit_balance)';
