-- Migration 024: Add 50 KES Starter Credit Pack (20 AI Credits) for Kenya M-Pesa
-- Plan Code: PLN_uv701tt6jdcw916

-- 1. Insert the new 50 KES plan into paystack_plans
INSERT INTO public.paystack_plans (
  plan_code,
  plan_type,
  name,
  amount,
  currency,
  interval,
  description,
  monthly_credits,
  is_active
) VALUES (
  'PLN_uv701tt6jdcw916',
  'FREE',
  'Starter Credit Pack (20 Credits)',
  50.00,
  'KES',
  'MONTHLY',
  '20 AI Credits for resume tailoring, cover letters, and mock interviews - Pay with M-Pesa or Card',
  20,
  TRUE
)
ON CONFLICT (plan_code) DO UPDATE SET
  name = EXCLUDED.name,
  amount = EXCLUDED.amount,
  currency = EXCLUDED.currency,
  monthly_credits = EXCLUDED.monthly_credits,
  description = EXCLUDED.description,
  is_active = TRUE;

-- 2. Update upsert_paystack_subscription to handle credit top-ups vs tier upgrades
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
    v_credits := 20;
    v_plan_type := 'FREE';
    v_interval := 'MONTHLY';
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
  SELECT COALESCE(ai_credits, 0) INTO v_current_balance FROM public.users WHERE id = p_user_id;

  -- Update user: If purchasing a Credit Pack (FREE plan_type), top up balance.
  -- If upgrading to PREMIUM / PREMIUM_PLUS, set to full tier allowance.
  IF v_plan_type = 'FREE' THEN
    UPDATE public.users
    SET
      ai_credits           = COALESCE(ai_credits, 0) + v_credits,
      credit_balance       = COALESCE(credit_balance, 0) + v_credits,
      total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits,
      updated_at           = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE public.users
    SET
      plan                 = v_plan_type,
      plan_expires_at      = p_current_period_end,
      ai_credits           = v_credits,
      credit_balance       = v_credits,
      total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits,
      updated_at           = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Log a 'purchase' grant in credit_transactions so Realtime fires
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_before, balance_after,
    transaction_type, metadata
  ) VALUES (
    p_user_id,
    v_credits,
    v_current_balance,
    v_current_balance + v_credits,
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

-- 3. Update reset_monthly_credits so paid credit packs are not wiped on month-end
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS VOID AS $$
BEGIN
  -- Free users: reset to 10 only if they have fewer than 10 credits
  UPDATE public.users
  SET ai_credits = 10, credit_balance = 10
  WHERE plan = 'FREE' AND COALESCE(ai_credits, 0) < 10;

  -- PREMIUM users: top up to 150
  UPDATE public.users
  SET ai_credits = 150, credit_balance = 150
  WHERE plan = 'PREMIUM';

  -- PREMIUM_PLUS users: top up to 400
  UPDATE public.users
  SET ai_credits = 400, credit_balance = 400
  WHERE plan = 'PREMIUM_PLUS';

  -- Expired pro plans: demote to free with standard 10 credits
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

COMMENT ON FUNCTION public.upsert_paystack_subscription IS
  'Creates or updates a Paystack subscription. Grants 20 credits for Starter Pack (PLN_uv701tt6jdcw916), 150 for PREMIUM, 400 for PREMIUM_PLUS.';
