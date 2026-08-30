-- Migration: Update Email Provider to Spaceship (Spacemail)
-- Description: Switches default email provider to Spaceship SMTP across logs, RPCs, and templates
-- Date: 2026-08-30

-- 1. Update default provider in email_logs table
ALTER TABLE public.email_logs ALTER COLUMN provider SET DEFAULT 'spaceship';

-- 2. Update log_email RPC function to use 'spaceship' by default
CREATE OR REPLACE FUNCTION public.log_email(
  p_user_id UUID,
  p_email_to TEXT,
  p_email_type TEXT,
  p_subject TEXT,
  p_template_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_status TEXT DEFAULT 'pending',
  p_provider TEXT DEFAULT 'spaceship',
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

-- 3. Add Waitlist Confirmation Template
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables,
  is_active
) VALUES (
  'waitlist_confirmation',
  'Waitlist Confirmation',
  'You''re on the VIP Waitlist! 🚀 - Interview Ready',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .features-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #edf2f7; margin: 24px 0; }
    .feature-item { display: flex; align-items: center; margin-bottom: 12px; font-size: 14px; color: #334155; }
    .feature-item:last-child { margin-bottom: 0; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
        <div class="header-tagline">Land Your Next Job Faster</div>
      </div>
      <div class="body">
        <div class="badge">🚀 WAITLIST CONFIRMED #{{queue_position}}</div>
        <h2>Hi {{first_name}},</h2>
        <p>You''re officially on the priority waitlist for <strong>Interview Ready</strong>! You will be among the first to experience our next-generation AI career preparation tools.</p>
        <div class="features-box">
          <div class="feature-item">⚡ <strong>Priority Access:</strong> Instant notification when your tier unlocks.</div>
          <div class="feature-item">🎁 <strong>Bonus Credits:</strong> 10 free AI credits reserved for your account.</div>
          <div class="feature-item">📄 <strong>ATS Resume Scanner:</strong> Instant feedback on job match scores.</div>
        </div>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Explore Platform Preview</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top/#faq">FAQ</a> • <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hi {{first_name}},\n\nYou are on the VIP waitlist for Interview Ready!\n\nQueue Position: #{{queue_position}}\nBonus Credits: 10 AI Credits Reserved\n\nVisit: https://appinterviewready.top\nSupport: info@appinterviewready.top\n\nInterview Ready Team',
  '["first_name", "user_name", "queue_position", "app_url"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;
