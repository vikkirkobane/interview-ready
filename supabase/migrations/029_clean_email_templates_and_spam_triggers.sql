-- Migration 029: Clean Email Templates and Remove Spam Triggers
-- Description: Updates all email templates in public.email_templates to eliminate spam triggers,
-- emojis in subject lines, em-dashes, and replace legacy waitlist references with clean account notifications.
-- Date: 2026-09-06

-- 1. ACCOUNT CONFIRMATION (Replaces legacy waitlist_confirmation)
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
  'Account Confirmation',
  'Your Interview Ready Account is Active',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Account is Active</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ffffff; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; color: #dbeafe; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; border: 1px solid #dbeafe; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .features-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #edf2f7; margin: 24px 0; }
    .feature-item { margin-bottom: 12px; font-size: 14px; color: #334155; }
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
        <div class="badge">ACCOUNT CONFIRMED</div>
        <h2>Hello {{first_name}},</h2>
        <p>Your account for <strong>Interview Ready</strong> is active. You now have full access to our AI career toolkit to tailor your resume, calculate ATS job match scores, and practice mock interviews.</p>
        <div class="features-box">
          <div class="feature-item"><strong>ATS Resume Optimizer:</strong> Tailor your resume bullets to match target job descriptions.</div>
          <div class="feature-item"><strong>AI Mock Interviews:</strong> Interactive interview practice tailored to your target role.</div>
          <div class="feature-item"><strong>Job Fit Analytics:</strong> Instant score and gap analysis for every job posting.</div>
        </div>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Open Interview Ready</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready | <a href="https://appinterviewready.top">appinterviewready.top</a> | <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p style="margin-top: 8px; font-size: 11px;">You received this transactional email for your account at Interview Ready. <a href="mailto:info@appinterviewready.top?subject=unsubscribe">Unsubscribe</a></p>
        <p>&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hello {{first_name}},\n\nYour account for Interview Ready is active. You now have full access to our AI career toolkit to tailor your resume, calculate ATS job match scores, and practice mock interviews.\n\nFeatures Ready in Your Account:\n- ATS Resume Optimizer: Tailor your resume bullets to match target job descriptions.\n- AI Mock Interviews: Interactive interview practice tailored to your target role.\n- Job Fit Analytics: Instant score and gap analysis for every job posting.\n\nOpen Interview Ready: https://appinterviewready.top\nSupport: info@appinterviewready.top\n\nBest regards,\nThe Interview Ready Team\n\nTo unsubscribe, email info@appinterviewready.top with subject unsubscribe.',
  '["first_name", "user_name", "app_url"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 2. PROMO CODE ACTIVATED
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
  '{{credits}} Practice Credits Added to Your Account - Interview Ready',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Promo Code Activated</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; color: #ffffff; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; color: #dbeafe; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; border: 1px solid #dbeafe; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .highlight-box { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .credits-num { font-size: 32px; font-weight: 800; color: #2563EB; margin: 4px 0; }
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
        <div class="header-tagline">Promo Code Activated</div>
      </div>
      <div class="body">
        <div class="badge">PROMO CODE APPLIED: {{promo_code}}</div>
        <h2>Hello {{user_name}},</h2>
        <p>Your promo code <strong>{{promo_code}}</strong> was successfully applied. We have added the following practice credits to your account:</p>
        <div class="highlight-box">
          <div class="credits-num">+{{credits}} Credits</div>
          <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 14px;">Available immediately for resumes and interview practice</p>
        </div>
        <p>Use your credits to tailor your resume for your target roles, run ATS job-fit scans, and practice AI mock interviews.</p>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Launch Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready | <a href="https://appinterviewready.top">appinterviewready.top</a> | <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p style="margin-top: 8px; font-size: 11px;">You received this transactional email for your account at Interview Ready. <a href="mailto:info@appinterviewready.top?subject=unsubscribe">Unsubscribe</a></p>
        <p>&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hello {{user_name}},\n\nYour promo code {{promo_code}} was successfully applied. We have credited your account with {{credits}} practice credits.\n\nCredits Added: +{{credits}} Credits\nStatus: Ready to use immediately\n\nOpen app: https://appinterviewready.top\nSupport: info@appinterviewready.top\n\nBest regards,\nThe Interview Ready Team\n\nTo unsubscribe, email info@appinterviewready.top with subject unsubscribe.',
  '["user_name", "promo_code", "credits", "app_url"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 3. WELCOME EMAIL
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables,
  is_active
) VALUES (
  'welcome',
  'Welcome Email',
  'Welcome to Interview Ready - Your Account Is Active',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Interview Ready</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ffffff; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; color: #dbeafe; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; border: 1px solid #dbeafe; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .features-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #edf2f7; margin: 24px 0; }
    .feature-item { margin-bottom: 12px; font-size: 14px; color: #334155; }
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
        <div class="badge">ACCOUNT ACTIVATED: {{credits}} CREDITS</div>
        <h2>Hello {{first_name}},</h2>
        <p>Welcome to <strong>Interview Ready</strong>! Your account is active and ready to help you optimize your resume, prepare for interviews, and accelerate your job search.</p>
        <div class="features-box">
          <div class="feature-item"><strong>ATS Resume Optimizer:</strong> Compare your profile against any job description and generate optimized bullets.</div>
          <div class="feature-item"><strong>AI Mock Interviews:</strong> Practice realistic questions tailored to your exact industry and target role.</div>
          <div class="feature-item"><strong>Job Fit Analytics:</strong> See exact match scores and recommendations before you apply.</div>
        </div>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Get Started Now</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready | <a href="https://appinterviewready.top">appinterviewready.top</a> | <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p style="margin-top: 8px; font-size: 11px;">You received this transactional email for your account at Interview Ready. <a href="mailto:info@appinterviewready.top?subject=unsubscribe">Unsubscribe</a></p>
        <p>&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hello {{first_name}},\n\nWelcome to Interview Ready! Your account is active and ready to help you optimize your resume and prepare for interviews.\n\nYou have {{credits}} practice credits available in your account.\n\nFeatures available now:\n- ATS Resume Optimizer: Compare your profile against job descriptions and generate tailored bullets.\n- AI Mock Interviews: Practice realistic questions tailored to your target role.\n- Job Fit Analytics: See exact match scores and recommendations.\n\nGet Started: https://appinterviewready.top\nSupport: info@appinterviewready.top\n\nBest regards,\nThe Interview Ready Team\n\nTo unsubscribe, email info@appinterviewready.top with subject unsubscribe.',
  '["first_name", "user_name", "credits", "app_url"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 4. REFERRAL REWARD
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables,
  is_active
) VALUES (
  'referral_reward',
  'Referral Reward',
  'Referral Credits Added to Your Account - Interview Ready',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Referral Credits Added</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; color: #ffffff; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; color: #dbeafe; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; border: 1px solid #dbeafe; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .stats-card { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin: 24px 0; }
    .stats-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
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
        <div class="header-tagline">Referral Bonus</div>
      </div>
      <div class="body">
        <div class="badge">REFERRAL CONFIRMED</div>
        <h2>Hello {{user_name}},</h2>
        <p><strong>{{referred_user}}</strong> joined Interview Ready using your referral code <code>{{referral_code}}</code>. We have added credits to your account:</p>
        <div class="stats-card">
          <div class="stats-row"><span>Credits Added:</span><span><strong>+{{credits}} Credits</strong></span></div>
          <div class="stats-row"><span>Total Successful Referrals:</span><span><strong>{{total_referrals}}</strong></span></div>
        </div>
        <p>Keep sharing your code with colleagues and friends to build up your practice balance.</p>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">View Your Credits</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready | <a href="https://appinterviewready.top">appinterviewready.top</a> | <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p style="margin-top: 8px; font-size: 11px;">You received this transactional email for your account at Interview Ready. <a href="mailto:info@appinterviewready.top?subject=unsubscribe">Unsubscribe</a></p>
        <p>&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hello {{user_name}},\n\n{{referred_user}} joined Interview Ready using your referral code {{referral_code}}. We have credited your account with {{credits}} practice credits.\n\nCredits Added: +{{credits}} Credits\nTotal Successful Referrals: {{total_referrals}}\n\nView Your Credits: https://appinterviewready.top\nSupport: info@appinterviewready.top\n\nBest regards,\nThe Interview Ready Team\n\nTo unsubscribe, email info@appinterviewready.top with subject unsubscribe.',
  '["user_name", "referred_user", "credits", "referral_code", "total_referrals"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 5. SUBSCRIPTION CREATED
UPDATE public.email_templates
SET
  subject = 'Welcome to Interview Ready {{plan_name}}',
  updated_at = NOW()
WHERE template_key = 'subscription_created';

-- 6. MONTHLY CREDITS RESET
UPDATE public.email_templates
SET
  subject = 'Your Monthly Credits Have Been Reset - Interview Ready',
  updated_at = NOW()
WHERE template_key = 'credit_reset';
