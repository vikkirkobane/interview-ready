-- Migration: Add Email System
-- Description: Adds email tracking, templates, and verification system
-- Version: 1.0.0
-- Date: 2026-07-04

-- Create email_logs table to track all sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'verification', 'payment_success', 'payment_failed', 'subscription_created', 'subscription_cancelled', 'credit_granted', 'referral_reward', 'notification', 'alert'
  subject TEXT NOT NULL,
  template_id TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  provider TEXT DEFAULT 'resend', -- 'resend', 'supabase'
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read their own email logs
CREATE POLICY "Users can read own email logs"
  ON public.email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update email logs
CREATE POLICY "Service role can manage email logs"
  ON public.email_logs
  FOR ALL
  USING (false);

-- Create email_templates table for custom email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL, -- 'payment_success', 'payment_failed', etc.
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB DEFAULT '[]', -- Array of variable names used in template
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_email_templates_template_key ON public.email_templates(template_key) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read active templates (needed for email service)
CREATE POLICY "Anyone can read active email templates"
  ON public.email_templates
  FOR SELECT
  USING (is_active = true);

-- Only service role can manage templates
CREATE POLICY "Service role can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (false);

-- Function to log email
CREATE OR REPLACE FUNCTION public.log_email(
  p_user_id UUID,
  p_email_to TEXT,
  p_email_type TEXT,
  p_subject TEXT,
  p_template_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_status TEXT DEFAULT 'pending',
  p_provider TEXT DEFAULT 'resend',
  p_provider_message_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.email_logs (
    user_id,
    email_to,
    email_type,
    subject,
    template_id,
    metadata,
    status,
    provider,
    provider_message_id,
    sent_at
  )
  VALUES (
    p_user_id,
    p_email_to,
    p_email_type,
    p_subject,
    p_template_id,
    p_metadata,
    p_status,
    p_provider,
    p_provider_message_id,
    CASE WHEN p_status = 'sent' THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function to update email status
CREATE OR REPLACE FUNCTION public.update_email_status(
  p_log_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.email_logs
  SET 
    status = p_status,
    error_message = p_error_message,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    updated_at = NOW()
  WHERE id = p_log_id;

  RETURN FOUND;
END;
$$;

-- Function to get email statistics for a user
CREATE OR REPLACE FUNCTION public.get_email_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total_sent', COUNT(*) FILTER (WHERE status = 'sent'),
    'total_failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'total_pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'by_type', json_object_agg(
      email_type,
      json_build_object(
        'count', type_count,
        'sent', sent_count,
        'failed', failed_count
      )
    )
  ) INTO v_stats
  FROM (
    SELECT 
      email_type,
      COUNT(*) as type_count,
      COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count
    FROM public.email_logs
    WHERE user_id = p_user_id
      AND created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY email_type
  ) stats;

  RETURN COALESCE(v_stats, '{}'::JSON);
END;
$$;

-- Insert default email templates
INSERT INTO public.email_templates (template_key, name, subject, html_body, text_body, variables) VALUES
(
  'payment_success',
  'Payment Successful',
  'Payment Successful - Interview Ready',
  '<html><body><h1>Payment Successful!</h1><p>Hi {{user_name}},</p><p>Your payment of {{amount}} {{currency}} has been successfully processed.</p><p><strong>Plan:</strong> {{plan_name}}</p><p><strong>Transaction ID:</strong> {{transaction_id}}</p><p>Thank you for subscribing to Interview Ready!</p></body></html>',
  'Payment Successful!\n\nHi {{user_name}},\n\nYour payment of {{amount}} {{currency}} has been successfully processed.\n\nPlan: {{plan_name}}\nTransaction ID: {{transaction_id}}\n\nThank you for subscribing to Interview Ready!',
  '["user_name", "amount", "currency", "plan_name", "transaction_id"]'::JSONB
),
(
  'payment_failed',
  'Payment Failed',
  'Payment Failed - Interview Ready',
  '<html><body><h1>Payment Failed</h1><p>Hi {{user_name}},</p><p>We were unable to process your payment of {{amount}} {{currency}}.</p><p><strong>Reason:</strong> {{error_message}}</p><p>Please try again or contact support if the issue persists.</p></body></html>',
  'Payment Failed\n\nHi {{user_name}},\n\nWe were unable to process your payment of {{amount}} {{currency}}.\n\nReason: {{error_message}}\n\nPlease try again or contact support if the issue persists.',
  '["user_name", "amount", "currency", "error_message"]'::JSONB
),
(
  'subscription_created',
  'Subscription Activated',
  'Welcome to {{plan_name}} - Interview Ready',
  '<html><body><h1>Welcome to {{plan_name}}!</h1><p>Hi {{user_name}},</p><p>Your subscription has been activated successfully.</p><p><strong>Plan:</strong> {{plan_name}}</p><p><strong>Credits:</strong> {{credits}} per month</p><p><strong>Next billing date:</strong> {{next_billing_date}}</p><p>Start using your credits now!</p></body></html>',
  'Welcome to {{plan_name}}!\n\nHi {{user_name}},\n\nYour subscription has been activated successfully.\n\nPlan: {{plan_name}}\nCredits: {{credits}} per month\nNext billing date: {{next_billing_date}}\n\nStart using your credits now!',
  '["user_name", "plan_name", "credits", "next_billing_date"]'::JSONB
),
(
  'subscription_cancelled',
  'Subscription Cancelled',
  'Subscription Cancelled - Interview Ready',
  '<html><body><h1>Subscription Cancelled</h1><p>Hi {{user_name}},</p><p>Your {{plan_name}} subscription has been cancelled.</p><p>You can continue using your remaining credits until {{expiry_date}}.</p><p>We hope to see you again soon!</p></body></html>',
  'Subscription Cancelled\n\nHi {{user_name}},\n\nYour {{plan_name}} subscription has been cancelled.\n\nYou can continue using your remaining credits until {{expiry_date}}.\n\nWe hope to see you again soon!',
  '["user_name", "plan_name", "expiry_date"]'::JSONB
),
(
  'credit_granted',
  'Credits Added',
  'Credits Added to Your Account - Interview Ready',
  '<html><body><h1>Credits Added!</h1><p>Hi {{user_name}},</p><p>{{credits}} credits have been added to your account.</p><p><strong>Reason:</strong> {{reason}}</p><p><strong>New balance:</strong> {{new_balance}} credits</p></body></html>',
  'Credits Added!\n\nHi {{user_name}},\n\n{{credits}} credits have been added to your account.\n\nReason: {{reason}}\nNew balance: {{new_balance}} credits',
  '["user_name", "credits", "reason", "new_balance"]'::JSONB
),
(
  'referral_reward',
  'Referral Reward',
  'You Earned Referral Credits! - Interview Ready',
  '<html><body><h1>Referral Reward!</h1><p>Hi {{user_name}},</p><p>Congratulations! {{referred_user}} used your referral code.</p><p>You earned {{credits}} credits!</p><p><strong>Your referral code:</strong> {{referral_code}}</p><p><strong>Total referrals:</strong> {{total_referrals}}</p></body></html>',
  'Referral Reward!\n\nHi {{user_name}},\n\nCongratulations! {{referred_user}} used your referral code.\n\nYou earned {{credits}} credits!\n\nYour referral code: {{referral_code}}\nTotal referrals: {{total_referrals}}',
  '["user_name", "referred_user", "credits", "referral_code", "total_referrals"]'::JSONB
),
(
  'welcome',
  'Welcome to Interview Ready',
  'Welcome to Interview Ready!',
  '<html><body><h1>Welcome to Interview Ready!</h1><p>Hi {{user_name}},</p><p>Thank you for joining Interview Ready. We''re excited to help you land your dream job!</p><p><strong>Your free credits:</strong> {{credits}}</p><p>Get started by:</p><ul><li>Uploading your resume</li><li>Analyzing job descriptions</li><li>Generating cover letters</li><li>Practicing interviews</li></ul></body></html>',
  'Welcome to Interview Ready!\n\nHi {{user_name}},\n\nThank you for joining Interview Ready. We''re excited to help you land your dream job!\n\nYour free credits: {{credits}}\n\nGet started by:\n- Uploading your resume\n- Analyzing job descriptions\n- Generating cover letters\n- Practicing interviews',
  '["user_name", "credits"]'::JSONB
)
ON CONFLICT (template_key) DO NOTHING;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION public.update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_logs_updated_at();

CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_templates_updated_at();

-- Grant permissions
GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
GRANT SELECT ON public.email_templates TO anon, authenticated;
GRANT ALL ON public.email_templates TO service_role;

-- Add comments
COMMENT ON TABLE public.email_logs IS 'Tracks all emails sent to users';
COMMENT ON TABLE public.email_templates IS 'Stores email templates for transactional emails';
COMMENT ON FUNCTION public.log_email IS 'Logs an email send attempt';
COMMENT ON FUNCTION public.update_email_status IS 'Updates the status of a sent email';
COMMENT ON FUNCTION public.get_email_stats IS 'Gets email statistics for a user';
