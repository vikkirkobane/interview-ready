-- This migration adds missing email templates required for the email system
-- including welcome emails, onboarding recovery emails, and credit reset notifications.

-- Welcome email template
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  is_active
) VALUES (
  'welcome',
  'Welcome Email',
  'Welcome to Interview Ready, {{first_name}}!',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6B46FE; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .button { background-color: #6B46FE; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; display: inline-block; margin: 20px 0; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: white;">Interview Ready</h1>
    </div>
    <div class="content">
      <h2>Hello {{first_name}},</h2>
      <p>Thank you for joining Interview Ready! We''re excited to help you land your next job.</p>
      <p>Let''s get started by analyzing your first job description. Simply paste a job URL or description and we''ll create a tailored resume in minutes.</p>
      <a href="{{app_url}}/onboarding" class="button">Get Started</a>
      <p>Need help? Reply to this email or visit our <a href="{{help_url}}">help center</a>.</p>
      <div class="footer">
        <p>Interview Ready • {{current_year}}</p>
        <p>You''re receiving this email because you signed up for Interview Ready.</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'Hello {{first_name}},\n\nThank you for joining Interview Ready! We''re excited to help you land your next job.\n\nLet''s get started by analyzing your first job description. Simply paste a job URL or description and we''ll create a tailored resume in minutes.\n\nGet started: {{app_url}}/onboarding\n\nNeed help? Visit our help center: {{help_url}}\n\nInterview Ready • {{current_year}}\nYou''re receiving this email because you signed up for Interview Ready.',
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  is_active = EXCLUDED.is_active;

-- Onboarding recovery email (drop at step 2)
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  is_active
) VALUES (
  'onboarding_recovery_step2',
  'Onboarding Recovery Step 2',
  'Complete your profile to unlock AI resume magic, {{first_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background-color: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .highlight { background-color: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .button { background-color: #6B46FE; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>Hi {{first_name}},</h2>
      <p>We noticed you started setting up your profile but haven''t completed it yet.</p>
      <div class="highlight">
        <p><strong>Your AI resume is waiting!</strong> Complete your profile in just 2 minutes to unlock:</p>
        <ul>
          <li>Tailored resume for any job</li>
          <li>Cover letter generation</li>
          <li>Interview preparation</li>
        </ul>
      </div>
      <a href="{{app_url}}/onboarding/profile" class="button">Complete Profile</a>
      <p>Your job search success starts here!</p>
      <p>Interview Ready Team</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{first_name}},\n\nWe noticed you started setting up your profile but haven''t completed it yet.\n\nYour AI resume is waiting! Complete your profile in just 2 minutes to unlock:\n• Tailored resume for any job\n• Cover letter generation\n• Interview preparation\n\nComplete Profile: {{app_url}}/onboarding/profile\n\nYour job search success starts here!\n\nInterview Ready Team',
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  is_active = EXCLUDED.is_active;

-- Onboarding recovery email (drop at step 3)
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  is_active
) VALUES (
  'onboarding_recovery_step3',
  'Onboarding Recovery Step 3',
  'Your job analysis is ready! Generate your resume in one tap',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background-color: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .highlight { background-color: #f0f9ff; border-left: 4px solid #6B46FE; padding: 15px; margin: 20px 0; }
    .button { background-color: #6B46FE; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; display: inline-block; margin: 20px 0; }
    .stats { display: flex; justify-content: space-between; margin: 25px 0; }
    .stat { text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>Hello {{first_name}},</h2>
      <p>Your job analysis is complete and saved! Just one tap to generate your tailored resume.</p>

      <div class="stats">
        <div class="stat">
          <div style="font-size: 24px; font-weight: bold; color: #6B46FE;">{{job_match_score}}%</div>
          <div>Job Match</div>
        </div>
        <div class="stat">
          <div style="font-size: 24px; font-weight: bold; color: #6B46FE;">{{ats_score}}/10</div>
          <div>ATS Score</div>
        </div>
        <div class="stat">
          <div style="font-size: 24px; font-weight: bold; color: #6B46FE;">{{skills_matched}}/{{total_skills}}</div>
          <div>Skills Matched</div>
        </div>
      </div>

      <div class="highlight">
        <p><strong>Your job analysis is ready to transform into a winning resume.</strong></p>
      </div>

      <a href="{{app_url}}/onboarding/resume" class="button">Generate Resume</a>

      <p>If you have any questions, reply to this email!</p>
      <p>Interview Ready Team</p>
    </div>
  </div>
</body>
</html>',
  'Hello {{first_name}},\n\nYour job analysis is complete and saved! Just one tap to generate your tailored resume.\n\nJob Match: {{job_match_score}}%\nATS Score: {{ats_score}}/10\nSkills Matched: {{skills_matched}}/{{total_skills}}\n\nYour job analysis is ready to transform into a winning resume.\n\nGenerate Resume: {{app_url}}/onboarding/resume\n\nIf you have any questions, reply to this email!\n\nInterview Ready Team',
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  is_active = EXCLUDED.is_active;

-- Credit reset notification
INSERT INTO public.email_templates (
  template_key,
  name,
  subject,
  html_body,
  text_body,
  is_active
) VALUES (
  'credit_reset',
  'Monthly Credit Reset',
  'Your monthly credits have been reset!',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background-color: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .highlight { background-color: #f0f9ff; border-left: 4px solid #6B46FE; padding: 15px; margin: 20px 0; }
    .credits { font-size: 48px; font-weight: bold; color: #6B46FE; text-align: center; margin: 25px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <h2>Hi {{first_name}},</h2>

      <p>Your monthly AI credits have been reset! You now have {{credits}} credits available to use.</p>

      <div class="credits">{{credits}}</div>

      <div class="highlight">
        <p><strong>New Month, New Opportunities!</strong> Use your credits to:</p>
        <ul>
          <li>Analyze new job descriptions</li>
          <li>Generate updated resumes</li>
          <li>Prepare for interviews</li>
        </ul>
      </div>

      <p>These credits reset on the 1st of each month. Premium users get unlimited credits.</p>

      <p>Happy job hunting!</p>
      <p>Interview Ready Team</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{first_name}},\n\nYour monthly AI credits have been reset! You now have {{credits}} credits available to use.\n\nNew Month, New Opportunities! Use your credits to:\n• Analyze new job descriptions\n• Generate updated resumes\n• Prepare for interviews\n\nThese credits reset on the 1st of each month. Premium users get unlimited credits.\n\nHappy job hunting!\n\nInterview Ready Team',
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  is_active = EXCLUDED.is_active;