const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const cleanTemplates = [
  {
    template_key: 'waitlist_confirmation',
    name: 'Account Confirmation',
    subject: 'Your Interview Ready Account is Active',
    html_body: `<!DOCTYPE html>
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
</html>`,
    text_body: `Hello {{first_name}},

Your account for Interview Ready is active. You now have full access to our AI career toolkit to tailor your resume, calculate ATS job match scores, and practice mock interviews.

Features Ready in Your Account:
- ATS Resume Optimizer: Tailor your resume bullets to match target job descriptions.
- AI Mock Interviews: Interactive interview practice tailored to your target role.
- Job Fit Analytics: Instant score and gap analysis for every job posting.

Open Interview Ready: https://appinterviewready.top
Support: info@appinterviewready.top

Best regards,
The Interview Ready Team

To unsubscribe, email info@appinterviewready.top with subject unsubscribe.`,
    variables: ['first_name', 'user_name', 'app_url'],
    is_active: true
  },
  {
    template_key: 'promo_reward',
    name: 'Promo Code Activated',
    subject: '{{credits}} Practice Credits Added to Your Account - Interview Ready',
    html_body: `<!DOCTYPE html>
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
</html>`,
    text_body: `Hello {{user_name}},

Your promo code {{promo_code}} was successfully applied. We have credited your account with {{credits}} practice credits.

Credits Added: +{{credits}} Credits
Status: Ready to use immediately

Open app: https://appinterviewready.top
Support: info@appinterviewready.top

Best regards,
The Interview Ready Team

To unsubscribe, email info@appinterviewready.top with subject unsubscribe.`,
    variables: ['user_name', 'promo_code', 'credits', 'app_url'],
    is_active: true
  },
  {
    template_key: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to Interview Ready - Your Account Is Active',
    html_body: `<!DOCTYPE html>
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
</html>`,
    text_body: `Hello {{first_name}},

Welcome to Interview Ready! Your account is active and ready to help you optimize your resume and prepare for interviews.

You have {{credits}} practice credits available in your account.

Features available now:
- ATS Resume Optimizer: Compare your profile against job descriptions and generate tailored bullets.
- AI Mock Interviews: Practice realistic questions tailored to your target role.
- Job Fit Analytics: See exact match scores and recommendations.

Get Started: https://appinterviewready.top
Support: info@appinterviewready.top

Best regards,
The Interview Ready Team

To unsubscribe, email info@appinterviewready.top with subject unsubscribe.`,
    variables: ['first_name', 'user_name', 'credits', 'app_url'],
    is_active: true
  },
  {
    template_key: 'referral_reward',
    name: 'Referral Reward',
    subject: 'Referral Credits Added to Your Account - Interview Ready',
    html_body: `<!DOCTYPE html>
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
</html>`,
    text_body: `Hello {{user_name}},

{{referred_user}} joined Interview Ready using your referral code {{referral_code}}. We have credited your account with {{credits}} practice credits.

Credits Added: +{{credits}} Credits
Total Successful Referrals: {{total_referrals}}

View Your Credits: https://appinterviewready.top
Support: info@appinterviewready.top

Best regards,
The Interview Ready Team

To unsubscribe, email info@appinterviewready.top with subject unsubscribe.`,
    variables: ['user_name', 'referred_user', 'credits', 'referral_code', 'total_referrals'],
    is_active: true
  },
  {
    template_key: 'subscription_created',
    name: 'Subscription Created',
    subject: 'Welcome to Interview Ready {{plan_name}}',
    html_body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Confirmed</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; margin: 0; color: #ffffff; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; color: #dbeafe; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .plan-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #edf2f7; margin: 24px 0; }
    .plan-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569; }
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
        <div class="header-tagline">Subscription Confirmed</div>
      </div>
      <div class="body">
        <div class="badge">ACTIVE PLAN: {{plan_name}}</div>
        <h2>Hello {{user_name}},</h2>
        <p>Thank you for subscribing to <strong>{{plan_name}}</strong>! Your subscription is active and your credits have been allocated.</p>
        <div class="plan-box">
          <div class="plan-row"><span>Plan:</span><span><strong>{{plan_name}}</strong></span></div>
          <div class="plan-row"><span>Monthly Credits:</span><span><strong>{{credits}} Credits</strong></span></div>
          <div class="plan-row"><span>Next Billing Date:</span><span><strong>{{next_billing_date}}</strong></span></div>
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
</html>`,
    text_body: `Hello {{user_name}},

Thank you for subscribing to {{plan_name}}! Your subscription is active and your monthly credits have been added.

Plan: {{plan_name}}
Monthly Credits: {{credits}} Credits
Next Billing Date: {{next_billing_date}}

Open app: https://appinterviewready.top
Support: info@appinterviewready.top

Best regards,
The Interview Ready Team

To unsubscribe, email info@appinterviewready.top with subject unsubscribe.`,
    variables: ['user_name', 'plan_name', 'credits', 'next_billing_date'],
    is_active: true
  },
  {
    template_key: 'credit_reset',
    name: 'Monthly Credits Reset',
    subject: 'Your Monthly Credits Have Been Reset - Interview Ready',
    html_body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credits Reset</title>
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
        <div class="header-tagline">Monthly Balance Refresh</div>
      </div>
      <div class="body">
        <div class="badge">MONTHLY RESET</div>
        <h2>Hello {{first_name}},</h2>
        <p>Your monthly credits have been refreshed for your billing cycle:</p>
        <div class="highlight-box">
          <div class="credits-num">{{credits}} Credits Available</div>
          <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 14px;">Ready to use for ATS resume optimization and mock interviews</p>
        </div>
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
</html>`,
    text_body: `Hello {{first_name}},

Your monthly credits have been refreshed. You now have {{credits}} credits available in your account.

Open app: https://appinterviewready.top
Support: info@appinterviewready.top

Best regards,
The Interview Ready Team

To unsubscribe, email info@appinterviewready.top with subject unsubscribe.`,
    variables: ['first_name', 'credits'],
    is_active: true
  }
];

async function updateLiveEmailTemplates() {
  console.log('Updating live email templates in Supabase database...');
  for (const t of cleanTemplates) {
    const { error } = await supabase
      .from('email_templates')
      .upsert({
        template_key: t.template_key,
        name: t.name,
        subject: t.subject,
        html_body: t.html_body,
        text_body: t.text_body,
        variables: t.variables,
        is_active: t.is_active,
        updated_at: new Date().toISOString()
      }, { onConflict: 'template_key' });

    if (error) {
      console.error(`Failed to update ${t.template_key}:`, error);
    } else {
      console.log(`Successfully updated: ${t.template_key} ("${t.subject}")`);
    }
  }
}

updateLiveEmailTemplates().then(() => console.log('Finished updating email templates.'));
