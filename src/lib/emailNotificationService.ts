import { supabase, supabaseUrl } from './supabase';
import { syncUserToAirtable } from './airtableService';

/**
 * Interface for email delivery options
 */
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  emailType: 'welcome' | 'password_reset' | 'login_alert' | 'general';
  metadata?: Record<string, any>;
}

/**
 * Generate a responsive, branded HTML email template for Interview Ready
 */
export function generateEmailHtmlTemplate({
  preheader,
  title,
  subtitle,
  badgeText,
  userName = 'there',
  bodyContent,
  ctaText,
  ctaUrl,
  proTip,
}: {
  preheader: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  userName?: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  proTip?: string;
}): string {
  const currentYear = new Date().getFullYear();
  const directWebUrl = ctaUrl || 'https://appinterviewready.top';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F8FAFC;
      padding: 32px 16px;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }
    .header {
      background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%);
      padding: 36px 32px;
      text-align: center;
      color: #FFFFFF;
    }
    .header-logo {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      color: #FFFFFF;
    }
    .header-tagline {
      font-size: 13px;
      font-weight: 500;
      opacity: 0.9;
      margin-top: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #DBEAFE;
    }
    .body {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      background-color: #EFF6FF;
      color: #1D4ED8;
      font-weight: 700;
      font-size: 13px;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 20px;
      border: 1px solid #DBEAFE;
    }
    h2 {
      font-size: 22px;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 16px 0;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 16px 0;
    }
    .features-box {
      background-color: #F8FAFC;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #EDF2F7;
      margin: 24px 0;
    }
    .feature-item {
      margin-bottom: 12px;
      font-size: 14px;
      color: #334155;
    }
    .feature-item:last-child {
      margin-bottom: 0;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 16px 0;
    }
    .btn {
      background: #2563EB;
      color: #FFFFFF !important;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 9999px;
      display: inline-block;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
    }
    .tip-card {
      background-color: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      padding: 16px 18px;
      margin: 20px 0 0;
      font-size: 13px;
      color: #1E40AF;
      line-height: 1.5;
    }
    .footer {
      padding: 24px 32px;
      background-color: #F8FAFC;
      border-top: 1px solid #F1F5F9;
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .footer a {
      color: #2563EB;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
        <div class="header-tagline">Land Your Next Job Faster</div>
      </div>
      <div class="body">
        ${badgeText ? `<div class="badge">${badgeText}</div>` : ''}
        <h2>Hello ${userName},</h2>
        ${bodyContent}

        ${ctaText ? `
        <div class="btn-container">
          <a href="${directWebUrl}" class="btn" target="_blank" rel="noopener noreferrer">
            ${ctaText}
          </a>
        </div>
        ` : ''}

        ${proTip ? `
        <div class="tip-card">
          <strong>💡 Pro Tip:</strong> ${proTip}
        </div>
        ` : ''}
      </div>
      <div class="footer">
        <p>Interview Ready Web App • <a href="https://appinterviewready.top">appinterviewready.top</a> • <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p>© ${currentYear} Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Deliver an email via Supabase Edge Function 'email-send' (Resend)
 */
export async function sendEmailNotification(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${supabaseUrl}/functions/v1/email-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        emailType: options.emailType,
        metadata: options.metadata || {},
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn('[EmailService] Edge function returned status:', response.status, err);
      return { success: false, error: err?.error || `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[EmailService] Error dispatching email notification:', error);
    return { success: false, error: error?.message || 'Network error' };
  }
}

/**
 * Send the Rich Welcome Email to newly registered users (Email, Google, or LinkedIn)
 */
export async function triggerWelcomeEmail(userEmail: string, userName?: string): Promise<boolean> {
  if (!userEmail) return false;

  const appUrl = typeof globalThis !== 'undefined' && (globalThis as any).location?.origin
    ? (globalThis as any).location.origin
    : 'https://appinterviewready.top';

  const html = generateEmailHtmlTemplate({
    preheader: 'Your AI career toolkit is ready. Run your first mock interview today.',
    title: 'Welcome Aboard!',
    subtitle: 'Your journey to landing your dream job begins today.',
    badgeText: '🎁 WELCOME BONUS: 10 FREE AI CREDITS',
    userName: userName || 'there',
    bodyContent: `
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        Thank you for joining <strong>Interview Ready</strong>. You now have instant access to our complete AI-powered career platform:
      </p>
      <div style="background-color: #F8FAFC; border-radius: 12px; padding: 20px; border: 1px solid #EDF2F7; margin: 20px 0;">
        <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0F172A;">3 Quick Steps to Get Started:</p>
        <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          <li style="margin-bottom: 6px;"><strong>Tailor Your Resume:</strong> Paste any job description to get instant ATS scores and bullet-point optimizations.</li>
          <li style="margin-bottom: 6px;"><strong>Practice Mock Interviews:</strong> Experience real-time audio & text interview coaching tailored to your target job.</li>
          <li><strong>Optimize LinkedIn:</strong> Transform your headline and about section into a high-visibility recruiter magnet.</li>
        </ol>
      </div>
    `,
    ctaText: 'Launch Web App',
    ctaUrl: `${appUrl}/login`,
    proTip: 'You can access the full platform directly from your browser at appinterviewready.top on any laptop, tablet, or smartphone.',
  });

  const text = [
    `Hello ${userName || 'there'},`,
    '',
    'Welcome to Interview Ready! Your AI career platform is ready to help you land your dream role:',
    '1. Tailor your resume with ATS scoring.',
    '2. Practice realistic AI mock interviews.',
    '3. Optimize your LinkedIn profile for recruiter visibility.',
    '',
    `Access Web Platform: ${appUrl}/login`,
    'Support: info@appinterviewready.top',
    '',
    '- The Interview Ready Team',
  ].join('\n');

  const res = await sendEmailNotification({
    to: userEmail,
    subject: `You're in! Welcome to Interview Ready`,
    html,
    text,
    emailType: 'welcome',
    metadata: { source: 'client_welcome_dispatch' },
  });

  return res.success;
}

/**
 * Send VIP Waitlist Confirmation Email via Spaceship
 */
export async function triggerWaitlistConfirmationEmail(
  userEmail: string,
  userName?: string,
  queuePosition: number = 100
): Promise<boolean> {
  if (!userEmail) return false;

  const appUrl = typeof globalThis !== 'undefined' && (globalThis as any).location?.origin
    ? (globalThis as any).location.origin
    : 'https://appinterviewready.top';

  const html = generateEmailHtmlTemplate({
    preheader: "You're officially on the VIP waitlist for Interview Ready!",
    title: 'Waitlist Confirmed 🚀',
    subtitle: `Queue Position: #${queuePosition} • 10 Bonus AI Credits Reserved`,
    badgeText: `🚀 WAITLIST SPOT #${queuePosition}`,
    userName: userName || 'there',
    bodyContent: `
      <p style="font-size: 15px; color: #475569; line-height: 1.6;">
        You have secured your spot on the priority access waitlist for <strong>Interview Ready</strong>.
      </p>
      <div style="background-color: #F8FAFC; border-radius: 12px; padding: 20px; border: 1px solid #EDF2F7; margin: 20px 0;">
        <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0F172A;">What You Get on Day 1:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          <li style="margin-bottom: 6px;"><strong>10 Free AI Credits:</strong> Reserved and waiting in your account.</li>
          <li style="margin-bottom: 6px;"><strong>Instant ATS Scans:</strong> Real-time resume keyword matching.</li>
          <li><strong>Priority Support:</strong> Direct coaching assistance via info@appinterviewready.top.</li>
        </ul>
      </div>
    `,
    ctaText: 'Visit Web Platform',
    ctaUrl: appUrl,
    proTip: 'Interview Ready is a high-performance web app accessible on any browser at appinterviewready.top.',
  });

  const text = [
    `Hello ${userName || 'there'},`,
    '',
    `You are on the VIP waitlist for Interview Ready (Queue Position: #${queuePosition})!`,
    'We have reserved 10 bonus AI credits for your account.',
    '',
    `Visit: ${appUrl}`,
    'Support: info@appinterviewready.top',
    '',
    '- The Interview Ready Team',
  ].join('\n');

  // Sync to Airtable table (Submissions) in background
  syncUserToAirtable({
    email: userEmail,
    name: userName,
    status: 'Confirmed',
    waitlistSpot: queuePosition,
    sendConfirmationEmail: false, // already dispatched below
  }).catch(() => {});

  const res = await sendEmailNotification({
    to: userEmail,
    subject: `You're on the VIP Waitlist! 🚀 - Interview Ready`,
    html,
    text,
    emailType: 'general',
    metadata: { source: 'waitlist_signup', queue_position: queuePosition },
  });

  return res.success;
}
