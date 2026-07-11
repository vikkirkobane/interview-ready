-- Add Paystack support to subscriptions table
-- This migration adds Paystack-specific fields while keeping the existing structure

-- Add Paystack fields to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS paystack_plan_code TEXT,
ADD COLUMN IF NOT EXISTS paystack_authorization_code TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'paystack'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_paystack_code ON public.subscriptions(paystack_subscription_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON public.subscriptions(payment_provider);

-- Create payment transactions table for Paystack
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('stripe', 'paystack')),
  provider_reference TEXT,
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policy for payment_transactions
CREATE POLICY "Users own their payment transactions" ON public.payment_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create indexes for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- Create Paystack plans table
CREATE TABLE IF NOT EXISTS public.paystack_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT UNIQUE NOT NULL,
  plan_type plan_enum NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  interval billing_interval_enum NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on paystack_plans
ALTER TABLE public.paystack_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Paystack plans readable by all" ON public.paystack_plans FOR SELECT USING (true);

-- Insert default Paystack plans with actual Paystack plan codes
-- USD Plans (International - Primary)
INSERT INTO public.paystack_plans (plan_code, plan_type, name, amount, currency, interval, description) VALUES
  ('PLN_0jg6lfy4ttw68tj', 'PREMIUM', 'Premium Monthly', 5.00, 'USD', 'MONTHLY', 'Unlimited AI credits, all templates, priority support'),
  ('PLN_2uob7t7251usns5', 'PREMIUM', 'Premium Yearly', 50.00, 'USD', 'YEARLY', 'Unlimited AI credits, all templates, priority support (2 months free)'),
  ('PLN_fkvsy1vdlgcnp0p', 'PREMIUM_PLUS', 'Premium Plus Monthly', 10.00, 'USD', 'MONTHLY', 'Everything in Premium + priority queue, advanced analytics'),
  ('PLN_35hurhal4nnj3n9', 'PREMIUM_PLUS', 'Premium Plus Yearly', 100.00, 'USD', 'YEARLY', 'Everything in Premium + priority queue, advanced analytics (2 months free)')
ON CONFLICT (plan_code) DO NOTHING;

-- Function to create or update Paystack subscription
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
BEGIN
  -- Get plan type from paystack_plans
  SELECT plan_type INTO v_plan_type
  FROM public.paystack_plans
  WHERE plan_code = p_plan_code;

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
    (SELECT interval FROM public.paystack_plans WHERE plan_code = p_plan_code),
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

  -- Update user plan
  UPDATE public.users
  SET 
    plan = v_plan_type,
    plan_expires_at = p_current_period_end,
    ai_credits = CASE 
      WHEN v_plan_type IN ('PREMIUM', 'PREMIUM_PLUS') THEN 999999
      ELSE ai_credits
    END,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle subscription cancellation
CREATE OR REPLACE FUNCTION public.cancel_paystack_subscription(
  p_subscription_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id and update subscription
  UPDATE public.subscriptions
  SET 
    status = 'CANCELED',
    cancel_at_period_end = TRUE,
    canceled_at = NOW(),
    updated_at = NOW()
  WHERE paystack_subscription_code = p_subscription_code
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Downgrade user to free plan after current period
  -- This will be handled by a cron job checking expired subscriptions

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron job to handle expired subscriptions
CREATE OR REPLACE FUNCTION public.handle_expired_subscriptions()
RETURNS VOID AS $$
BEGIN
  -- Downgrade users with expired subscriptions
  UPDATE public.users u
  SET 
    plan = 'FREE',
    ai_credits = 10,
    plan_expires_at = NULL,
    updated_at = NOW()
  FROM public.subscriptions s
  WHERE u.id = s.user_id
    AND s.status = 'CANCELED'
    AND s.current_period_end < NOW()
    AND u.plan != 'FREE';

  -- Update subscription status
  UPDATE public.subscriptions
  SET status = 'CANCELED'
  WHERE current_period_end < NOW()
    AND status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Cron job should be scheduled separately via Supabase Dashboard or CLI
-- Command: SELECT cron.schedule('handle-expired-subscriptions', '0 0 * * *', $$SELECT public.handle_expired_subscriptions()$$);

-- Add comment to document the migration
COMMENT ON TABLE public.payment_transactions IS 'Stores all payment transactions from Stripe and Paystack';
COMMENT ON TABLE public.paystack_plans IS 'Paystack plan configurations with Nigerian Naira pricing';
COMMENT ON FUNCTION public.upsert_paystack_subscription IS 'Creates or updates a Paystack subscription and updates user plan';
COMMENT ON FUNCTION public.cancel_paystack_subscription IS 'Handles Paystack subscription cancellation';
