-- Migration 019: Add Promo Codes System
-- Description: Adds promotional code system (e.g. LINKEDIN20 granting 20 credits), one-time user redemption tracking, and email templates
-- Date: 2026-08-19

-- 1. Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  credits_granted INTEGER NOT NULL DEFAULT 20,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create promo_code_redemptions table (Enforces 1 promo code per user)
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  credits_granted INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_promo_redemption UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_code_redemptions(user_id);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read active promo codes"
  ON public.promo_codes
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can read own promo redemptions"
  ON public.promo_code_redemptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage promo codes"
  ON public.promo_codes
  FOR ALL
  USING (false);

CREATE POLICY "Service role can manage promo redemptions"
  ON public.promo_code_redemptions
  FOR ALL
  USING (false);

-- 3. Stored Procedure: apply_promo_code
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
  v_normalized_code := UPPER(TRIM(p_promo_code));

  -- 1. Check if user already redeemed a promo code (One-time usage per user rule)
  IF EXISTS(SELECT 1 FROM public.promo_code_redemptions WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already redeemed a promotional code.'
    );
  END IF;

  -- 2. Find matching active promo code
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE UPPER(code) = v_normalized_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_promo IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired promo code.'
    );
  END IF;

  -- 3. Check usage cap if set
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This promo code has reached its maximum limit.'
    );
  END IF;

  v_credits := v_promo.credits_granted;

  -- 4. Record redemption
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

  -- 5. Increment current_uses
  UPDATE public.promo_codes
  SET 
    current_uses = current_uses + 1,
    updated_at = NOW()
  WHERE id = v_promo.id;

  -- 6. Grant credits to user: update ai_credits, credit_balance, total_credits_earned
  UPDATE public.users
  SET
    ai_credits = COALESCE(ai_credits, 0) + v_credits,
    credit_balance = COALESCE(credit_balance, 0) + v_credits,
    total_credits_earned = COALESCE(total_credits_earned, 0) + v_credits,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 7. Record transaction log in credit_transactions
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

-- 4. Seed initial promo codes (LinkedIn community & Launch campaigns)
INSERT INTO public.promo_codes (code, description, credits_granted, is_active)
VALUES
  ('LINKEDIN20', 'LinkedIn Community Welcome Bonus - 20 Credits', 20, true),
  ('LINKEDIN', 'LinkedIn Community Special - 20 Credits', 20, true),
  ('PROMO20', 'Promotional Campaign 20 Credits', 20, true),
  ('WELCOME20', 'Welcome Campaign 20 Credits', 20, true)
ON CONFLICT (code) DO UPDATE SET
  credits_granted = EXCLUDED.credits_granted,
  is_active = EXCLUDED.is_active;

-- 5. Add promo_reward email template
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables,
  is_active
) VALUES (
  'promo_reward',
  'Promo Code Activated',
  '🎉 {{credits}} Free AI Credits Added to Your Account! - Interview Ready',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .header { background: linear-gradient(135deg, #6B46FE 0%, #8B5CF6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background-color: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px; }
    .badge { display: inline-block; background-color: #ede9fe; color: #6B46FE; font-weight: 700; padding: 6px 14px; border-radius: 9999px; font-size: 14px; margin-bottom: 16px; }
    .button { background-color: #6B46FE; color: #ffffff !important; padding: 14px 28px; border-radius: 9999px; text-decoration: none; display: inline-block; margin: 24px 0; font-weight: 600; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Interview Ready</h1>
    </div>
    <div class="content">
      <div class="badge">PROMO CODE APPLIED: {{promo_code}}</div>
      <h2 style="color: #111827; margin-top: 0;">Hi {{user_name}},</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Great news! You have successfully redeemed promo code <strong>{{promo_code}}</strong>. We have credited <strong>{{credits}} bonus AI credits</strong> to your account.
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        You can now use your credits to analyze job descriptions, tailor your resume for ATS algorithms, and practice mock interview questions.
      </p>
      <div style="text-align: center;">
        <a href="{{app_url}}" class="button">Start Preparing Now</a>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="{{help_url}}" style="color: #6B46FE;">Help & FAQ</a></p>
        <p>You received this email because you redeemed a promo code on Interview Ready.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hi {{user_name}},\n\nGreat news! You have successfully redeemed promo code {{promo_code}}. We have credited {{credits}} bonus AI credits to your account.\n\nStart preparing now: {{app_url}}\n\nNeed help? Visit {{help_url}}\n\nInterview Ready Team',
  '["user_name", "promo_code", "credits", "app_url", "help_url"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;
