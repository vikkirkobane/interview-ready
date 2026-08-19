-- Migration 020: Standardize Branded Email Templates (Interview Ready)
-- Description: Updates all transactional email templates to the official White & Blue theme
-- Date: 2026-08-19

-- 1. WELCOME EMAIL
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
  'Welcome to Interview Ready, {{first_name}}! 🚀',
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
        <div class="badge">🎁 WELCOME BONUS: {{credits}} CREDITS</div>
        <h2>Hello {{first_name}},</h2>
        <p>Welcome to <strong>Interview Ready</strong>! We are thrilled to help you accelerate your job search, craft ATS-beating resumes, and ace your upcoming interviews.</p>
        <div class="features-box">
          <div class="feature-item">⚡ <strong>AI Job Analyzer:</strong> Match your profile against any job description.</div>
          <div class="feature-item">📄 <strong>Tailored Resumes:</strong> Stand out to hiring managers in seconds.</div>
          <div class="feature-item">🎯 <strong>Mock Interviews:</strong> Practice real questions tailored to your target role.</div>
        </div>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Get Started Now</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top/#faq">Help Center & FAQ</a> • <a href="https://appinterviewready.top/privacy">Privacy Policy</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hello {{first_name}},\n\nWelcome to Interview Ready! We are thrilled to help you accelerate your job search.\n\nYou have {{credits}} free credits in your account.\n\nStart now: https://appinterviewready.top\n\nNeed help? Visit: https://appinterviewready.top/#faq\n\nInterview Ready Team',
  '["first_name", "user_name", "credits", "app_url", "help_url"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 2. PAYMENT SUCCESS EMAIL
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables,
  is_active
) VALUES (
  'payment_success',
  'Payment Successful',
  'Receipt for Your Payment - Interview Ready',
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
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .receipt-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #edf2f7; margin: 24px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; color: #475569; }
    .receipt-row:last-child { border-bottom: none; font-weight: 700; color: #0f172a; font-size: 15px; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 9999px; display: inline-block; }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
        <div class="header-tagline">Payment Confirmed</div>
      </div>
      <div class="body">
        <div class="badge">✓ PAYMENT SUCCESSFUL</div>
        <h2>Hi {{user_name}},</h2>
        <p>Thank you for your purchase! Your payment has been successfully processed and your account has been credited.</p>
        <div class="receipt-box">
          <div class="receipt-row"><span>Plan / Item:</span><span><strong>{{plan_name}}</strong></span></div>
          <div class="receipt-row"><span>Amount Paid:</span><span>{{amount}} {{currency}}</span></div>
          <div class="receipt-row"><span>Transaction ID:</span><span><code>{{transaction_id}}</code></span></div>
        </div>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Launch Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top/#faq">Help & FAQ</a> • <a href="https://appinterviewready.top/terms">Terms of Service</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hi {{user_name}},\n\nYour payment of {{amount}} {{currency}} for {{plan_name}} was successful.\n\nTransaction ID: {{transaction_id}}\n\nOpen app: https://appinterviewready.top\n\nInterview Ready Team',
  '["user_name", "amount", "currency", "plan_name", "transaction_id"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 3. PROMO CODE ACTIVATED EMAIL
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
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .highlight-box { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .credits-num { font-size: 32px; font-weight: 800; color: #2563EB; margin: 4px 0; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 9999px; display: inline-block; }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
        <div class="header-tagline">Promo Bonus Activated</div>
      </div>
      <div class="body">
        <div class="badge">PROMO CODE: {{promo_code}}</div>
        <h2>Hi {{user_name}},</h2>
        <p>Great news! You have successfully redeemed campaign code <strong>{{promo_code}}</strong>. We have credited your account with:</p>
        <div class="highlight-box">
          <div class="credits-num">+{{credits}} AI Credits</div>
          <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 14px;">Ready to use immediately for resumes & interviews</p>
        </div>
        <p>Use your bonus credits to tailor your resume for top tech & corporate roles and get actionable AI feedback.</p>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Start Using Credits</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top/#faq">Help Center & FAQ</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hi {{user_name}},\n\nYou redeemed promo code {{promo_code}}! We credited {{credits}} bonus AI credits to your account.\n\nOpen app: https://appinterviewready.top\n\nInterview Ready Team',
  '["user_name", "promo_code", "credits", "app_url", "help_url"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 4. REFERRAL REWARD EMAIL (For Referrer)
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
  '🎁 You Earned {{credits}} Referral Credits! - Interview Ready',
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
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .stats-card { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin: 24px 0; }
    .stats-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 9999px; display: inline-block; }
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
        <div class="badge">🎉 FRIEND REFERRED!</div>
        <h2>Hi {{user_name}},</h2>
        <p>Awesome news! <strong>{{referred_user}}</strong> just joined Interview Ready using your referral code <code>{{referral_code}}</code>.</p>
        <div class="stats-card">
          <div class="stats-row"><span>Credits Earned:</span><span><strong>+{{credits}} AI Credits</strong></span></div>
          <div class="stats-row"><span>Total Successful Referrals:</span><span><strong>{{total_referrals}}</strong></span></div>
        </div>
        <p>Keep sharing your code with colleagues and friends to earn more credits!</p>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">View Your Credits</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top/#faq">Help Center</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hi {{user_name}},\n\n{{referred_user}} used your referral code {{referral_code}}! You earned {{credits}} bonus AI credits.\n\nTotal referrals: {{total_referrals}}\n\nOpen app: https://appinterviewready.top\n\nInterview Ready Team',
  '["user_name", "referred_user", "credits", "referral_code", "total_referrals"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 5. SUBSCRIPTION ACTIVATED EMAIL
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables,
  is_active
) VALUES (
  'subscription_created',
  'Subscription Activated',
  'Welcome to Interview Ready {{plan_name}}! 🚀',
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
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .plan-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #edf2f7; margin: 24px 0; }
    .plan-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; color: #475569; }
    .plan-row:last-child { border-bottom: none; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 9999px; display: inline-block; }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
        <div class="header-tagline">Subscription Activated</div>
      </div>
      <div class="body">
        <div class="badge">🚀 {{plan_name}} ACTIVE</div>
        <h2>Hi {{user_name}},</h2>
        <p>Your <strong>{{plan_name}}</strong> subscription has been successfully activated. You now have full access to all premium features.</p>
        <div class="plan-box">
          <div class="plan-row"><span>Subscription Plan:</span><span><strong>{{plan_name}}</strong></span></div>
          <div class="plan-row"><span>Monthly Credits:</span><span><strong>{{credits}} Credits</strong></span></div>
          <div class="plan-row"><span>Next Renewal Date:</span><span>{{next_billing_date}}</span></div>
        </div>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Go to Dashboard</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top/#faq">Help Center & FAQ</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hi {{user_name}},\n\nYour {{plan_name}} subscription is active with {{credits}} monthly credits.\nNext renewal: {{next_billing_date}}\n\nOpen app: https://appinterviewready.top\n\nInterview Ready Team',
  '["user_name", "plan_name", "credits", "next_billing_date"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 6. SUBSCRIPTION RENEWED EMAIL
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables,
  is_active
) VALUES (
  'subscription_renewed',
  'Subscription Renewed',
  'Your Subscription Was Renewed - Interview Ready',
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
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .renew-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #edf2f7; margin: 24px 0; }
    .renew-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 9999px; display: inline-block; }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
        <div class="header-tagline">Subscription Renewed</div>
      </div>
      <div class="body">
        <div class="badge">✓ MONTHLY RENEWAL COMPLETED</div>
        <h2>Hi {{user_name}},</h2>
        <p>Your <strong>{{plan_name}}</strong> subscription has been successfully renewed. Your monthly credits have been refreshed.</p>
        <div class="renew-box">
          <div class="renew-row"><span>Active Plan:</span><span><strong>{{plan_name}}</strong></span></div>
          <div class="renew-row"><span>Next Billing Date:</span><span>{{next_billing_date}}</span></div>
        </div>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Open App</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top/#faq">Help & FAQ</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hi {{user_name}},\n\nYour {{plan_name}} subscription was successfully renewed.\nNext billing date: {{next_billing_date}}\n\nOpen app: https://appinterviewready.top\n\nInterview Ready Team',
  '["user_name", "plan_name", "next_billing_date"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 7. PAYMENT FAILED EMAIL
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  variables,
  is_active
) VALUES (
  'payment_failed',
  'Payment Failed',
  'Action Required: Payment Failed - Interview Ready',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #fef2f2; color: #dc2626; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .error-box { background-color: #fef2f2; border-radius: 12px; padding: 16px; border: 1px solid #fee2e2; margin: 20px 0; color: #991b1b; font-size: 14px; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 9999px; display: inline-block; }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
        <div class="header-tagline">Payment Failed</div>
      </div>
      <div class="body">
        <div class="badge">⚠️ ACTION REQUIRED</div>
        <h2>Hi {{user_name}},</h2>
        <p>We were unable to process your payment of <strong>{{amount}} {{currency}}</strong>.</p>
        <div class="error-box">
          <strong>Reason:</strong> {{error_message}}
        </div>
        <p>Please update your billing information or retry the payment to ensure uninterrupted access to your Pro features.</p>
        <div class="btn-container">
          <a href="https://appinterviewready.top/pricing" class="btn">Update Payment Method</a>
        </div>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top/#faq">Help Center & FAQ</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hi {{user_name}},\n\nWe were unable to process your payment of {{amount}} {{currency}}.\nReason: {{error_message}}\n\nUpdate billing: https://appinterviewready.top/pricing\n\nInterview Ready Team',
  '["user_name", "amount", "currency", "error_message", "retry_url"]'::JSONB,
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;
