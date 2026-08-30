import { supabase, supabaseUrl } from './supabase';

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
  userName = 'there',
  bodyContent,
  ctaText,
  ctaUrl,
  proTip,
}: {
  preheader: string;
  title: string;
  subtitle: string;
  userName?: string;
  bodyContent: string;
  ctaText?: string;
  ctaUrl?: string;
  proTip?: string;
}): string {
  const currentYear = new Date().getFullYear();

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
      background-color: #F9FAFB;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0D1117;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .preheader {
      display: none !important;
      visibility: hidden;
      mso-hide: all;
      font-size: 1px;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
    .header {
      background-color: #1A4F8A;
      background-image: linear-gradient(135deg, #1A4F8A 0%, #123761 100%);
      padding: 36px 28px;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      background: #EFF6FF;
      color: #1A4F8A;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 999px;
      margin-bottom: 14px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 14px;
      color: #DBEAFE;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn-primary {
      display: inline-block;
      background-color: #1A4F8A;
      color: #FFFFFF !important;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.3px;
      text-decoration: none;
      padding: 13px 28px;
      border-radius: 10px;
    }
    .tip-card {
      background-color: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 10px;
      padding: 14px 16px;
      margin: 20px 0 0;
      font-size: 13px;
      color: #1E40AF;
      line-height: 1.5;
    }
    .footer {
      background-color: #1A4F8A;
      padding: 24px 28px;
      text-align: center;
      border-top: 1px solid #123761;
    }
    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #DBEAFE;
    }
    .footer a {
      color: #7DD3FC;
      text-decoration: underline;
    }
  </style>
</head>
<body bgcolor="#F9FAFB">
  <div class="preheader">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F9FAFB">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E5E7EB;">
          <tr>
            <td class="header" bgcolor="#1A4F8A">
              <span class="logo-badge">Interview Ready</span>
              <h1>${title}</h1>
              <p>${subtitle}</p>
            </td>
          </tr>
          <tr>
            <td class="content" bgcolor="#FFFFFF">
              <p class="greeting">Hello ${userName},</p>
              ${bodyContent}

              ${ctaText && ctaUrl ? `
              <div class="btn-container">
                <a href="${ctaUrl}" class="btn-primary" target="_blank" rel="noopener noreferrer">
                  ${ctaText}
                </a>
              </div>
              ` : ''}

              ${proTip ? `
              <div class="tip-card">
                <strong>Pro Tip:</strong> ${proTip}
              </div>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td class="footer" bgcolor="#1A4F8A">
              <p>&copy; ${currentYear} Interview Ready. Built for ambitious professionals.</p>
              <p>Questions? Reply to this email or write to <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
              <p style="margin-top: 8px;"><a href="https://www.linkedin.com/company/interview-ready-app" target="_blank" rel="noopener noreferrer">Follow us on LinkedIn</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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

  const appUrl = typeof window !== 'undefined' && window?.location?.origin
    ? window.location.origin
    : 'https://appinterviewready.top';

  const html = generateEmailHtmlTemplate({
    preheader: 'Your AI career toolkit is ready. Run your first mock interview today.',
    title: 'Welcome Aboard!',
    subtitle: 'Your journey to landing your dream job begins today.',
    userName: userName || 'there',
    bodyContent: `
      <p style="font-size: 14px; color: #4B5563; line-height: 1.6;">
        Thank you for joining <strong>Interview Ready</strong>. You now have instant access to our complete AI-powered career platform:
      </p>
      <div style="background-color: #F3F4F6; border-radius: 10px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1F2937;">3 Quick Steps to Get Started:</p>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #4B5563; line-height: 1.6;">
          <li><strong>Tailor Your Resume:</strong> Paste any job description to get instant ATS scores and bullet-point optimizations.</li>
          <li><strong>Practice Mock Interviews:</strong> Experience real-time audio & text interview coaching tailored to your target job.</li>
          <li><strong>Optimize LinkedIn:</strong> Transform your headline and about section into a high-visibility recruiter magnet.</li>
        </ol>
      </div>
    `,
    ctaText: 'Launch Interview Ready',
    ctaUrl: `${appUrl}/login`,
    proTip: 'On iPhone or Android, you can add Interview Ready directly to your Home Screen from the browser menu for a seamless native app experience!',
  });

  const text = [
    `Hello ${userName || 'there'},`,
    '',
    'Welcome to Interview Ready! Your AI career platform is ready to help you land your dream role:',
    '1. Tailor your resume with ATS scoring.',
    '2. Practice realistic AI mock interviews.',
    '3. Optimize your LinkedIn profile for recruiter visibility.',
    '',
    `Access the app: ${appUrl}/login`,
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
