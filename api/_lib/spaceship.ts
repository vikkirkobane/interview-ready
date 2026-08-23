import nodemailer from 'nodemailer';

export interface WelcomeEmailResult {
  sent: boolean;
  error?: string;
}

export function createSpaceshipTransporter() {
  let rawHost = (process.env.SPACESHIP_SMTP_HOST || 'mail.spacemail.com').trim().replace(/['"]/g, '');
  if (rawHost.includes('@') || !rawHost.includes('.')) rawHost = 'mail.spacemail.com';

  const rawPort = (process.env.SPACESHIP_SMTP_PORT || '465').trim().replace(/['"]/g, '');
  const port = parseInt(rawPort, 10) || 465;
  const isPort465 = port === 465;
  const secureEnv = (process.env.SPACESHIP_SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureEnv === 'true' || (secureEnv !== 'false' && isPort465);

  const user = (process.env.SPACESHIP_SMTP_USER || '').trim().replace(/['"]/g, '');
  const pass = (process.env.SPACESHIP_SMTP_PASS || '').trim().replace(/['"]/g, '');

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: rawHost,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    // Bound SMTP latency so a slow server can never stall a request path.
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
}

function stripHeaderInjection(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t\0\x0B\x0C]/g, '')
    .replace(/%0[aAdD]/gi, '')
    .trim();
}

export function isValidRecipientEmail(rawEmail: unknown): boolean {
  const sanitized = stripHeaderInjection(typeof rawEmail === 'string' ? rawEmail : String(rawEmail ?? '')).toLowerCase();
  if (sanitized.length < 5 || sanitized.length > 254) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(sanitized)) return false;

  const parts = sanitized.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domainPart] = parts;
  if (localPart.length > 64) return false;
  if (!domainPart.includes('.') || domainPart.startsWith('.') || domainPart.endsWith('.')) return false;

  const blockedPatterns = ['<script', 'javascript:', 'data:', 'vbscript:', 'onclick', 'onerror'];
  return !blockedPatterns.some(p => sanitized.includes(p));
}

// Coerce the waitlist spot to digits only before it touches HTML/text output.
function safeSpotDisplay(waitlistSpot?: number | string): string {
  const digits = `${waitlistSpot ?? ''}`.replace(/[^0-9]/g, '').slice(0, 7);
  return digits ? `#${digits}` : '';
}

// Welcome email, reviewed by content + design agents (Aug 2026):
// table-based skeleton for Outlook, solid bg fallback behind gradients,
// #0369A1 step numbers for contrast, ASCII punctuation only, every claim traced
// to verified product facts. Plain-text version kept in parity with HTML.
export function generateWelcomeEmailHtml(waitlistSpot?: number | string): string {
  const spotDisplay = safeSpotDisplay(waitlistSpot);
  const spotPhrase = spotDisplay ? ` (waitlist spot ${spotDisplay})` : '';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Welcome to Interview Ready</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F9FAFB;
      font-family: 'Sora', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0D1117;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .preheader {
      display: none;
      max-height: 0;
      overflow: hidden;
      mso-hide: all;
    }
    .header {
      background-color: #1A4F8A;
      background-image: linear-gradient(135deg, #1A4F8A 0%, #123761 100%);
      padding: 40px 32px 32px;
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
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 27px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .header p {
      margin: 10px 0 0;
      color: #DBEAFE;
      font-size: 14px;
      font-weight: 400;
    }
    .content {
      padding: 32px;
      background-color: #FFFFFF;
    }
    .greeting {
      font-size: 16px;
      color: #0D1117;
      margin: 0 0 14px;
      font-weight: 700;
    }
    .lead-text {
      font-size: 14px;
      color: #4B5563;
      line-height: 1.65;
      margin: 0 0 24px;
    }
    .steps-card {
      background-color: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      margin: 0 0 26px;
    }
    .steps-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0D1117;
      margin: 0 0 14px;
    }
    .step-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .step-num {
      width: 26px;
      font-weight: 800;
      font-size: 13px;
      color: #0369A1;
      vertical-align: top;
    }
    .step-desc {
      font-size: 13px;
      color: #4B5563;
      line-height: 1.5;
    }
    .btn-row {
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
      padding: 14px 30px;
      border-radius: 12px;
    }
    .tip-card {
      background-color: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      padding: 14px 16px;
      margin: 0;
      font-size: 13px;
      color: #1E40AF;
      line-height: 1.55;
    }
    .retry-text {
      font-size: 13px;
      color: #4B5563;
      line-height: 1.55;
      margin: 20px 0 0;
    }
    .retry-text a {
      color: #1A4F8A;
      font-weight: 700;
      text-decoration: underline;
    }
    .footer {
      background-color: #1A4F8A;
      padding: 24px 32px;
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
  <div class="preheader">Your early-access spot is confirmed. Run your first mock interview today.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F9FAFB">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E5E7EB;">
          <tr>
            <td class="header" bgcolor="#1A4F8A">
              <span class="logo-badge">Interview Ready</span>
              <h1>Welcome Aboard!</h1>
              <p>Your download is verified, and your prep starts today.</p>
            </td>
          </tr>
          <tr>
            <td class="content" bgcolor="#FFFFFF">
              <p class="greeting">Hello,</p>
              <p class="lead-text">
                Thank you for downloading Interview Ready${spotPhrase}. You now have the full AI-powered toolkit in your hands: ATS-optimized resumes, mock interviews, and flashcards.
              </p>

              <div class="steps-card">
                <div class="steps-title">Get Started in 3 Steps:</div>
                <table role="presentation" class="step-table" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="step-num">1.</td>
                    <td class="step-desc"><strong>Install the app:</strong> open the downloaded APK on your Android device and tap Install.</td>
                  </tr>
                </table>
                <table role="presentation" class="step-table" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="step-num">2.</td>
                    <td class="step-desc"><strong>Run your first mock interview:</strong> the AI scores your structure, clarity, and delivery instantly.</td>
                  </tr>
                </table>
                <table role="presentation" class="step-table" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 0;">
                  <tr>
                    <td class="step-num">3.</td>
                    <td class="step-desc"><strong>Tailor your resume:</strong> paste any job description and let the ATS engine optimize your bullets.</td>
                  </tr>
                </table>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 28px auto;">
                <tr>
                  <td bgcolor="#1A4F8A" style="border-radius: 12px;">
                    <a href="https://appinterviewready.top" class="btn-primary" target="_blank" rel="noopener noreferrer">
                      Open the Web Platform
                    </a>
                  </td>
                </tr>
              </table>

              <div class="tip-card">
                <strong>Pro tip:</strong> If Android blocks the install, open Settings &gt; Apps &gt; Special access &gt; Install unknown apps and allow the browser you downloaded with. Reopen the APK and tap Install. If you see "File might be harmful," choose Download anyway; it is the standard notice for apps installed outside the Play Store.
              </div>

              <p class="retry-text">
                <strong>Download didn't complete?</strong> For a smoother download, open the link in a different browser such as Samsung Internet, Firefox, Brave, Opera, or Edge instead of Chrome. <a href="https://appinterviewready.top/download" target="_blank" rel="noopener noreferrer">Retry your download here</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer" bgcolor="#1A4F8A">
              <p>&copy; 2026 Interview Ready. Built for ambitious professionals.</p>
              <p>Questions? Just reply to this email, or write to <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
              <p style="margin-top: 10px;"><a href="https://www.linkedin.com/company/interview-ready-app" target="_blank" rel="noopener noreferrer">Follow us on LinkedIn</a></p>
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

export async function sendWelcomeEmail(
  toEmail: string,
  waitlistSpot?: number | string
): Promise<WelcomeEmailResult> {
  const transporter = createSpaceshipTransporter();
  if (!transporter) {
    return { sent: false, error: 'SMTP not configured' };
  }

  const cleanEmail = stripHeaderInjection(toEmail).toLowerCase();
  if (!isValidRecipientEmail(cleanEmail)) {
    return { sent: false, error: 'Invalid recipient email' };
  }

  try {
    const fromAddress =
      process.env.SPACESHIP_FROM_EMAIL ||
      `"Interview Ready" <${stripHeaderInjection(process.env.SPACESHIP_SMTP_USER || '')}>`;

    await transporter.sendMail({
      from: fromAddress,
      to: cleanEmail,
      subject: `You're in! Welcome to Interview Ready`,
      text: [
        'Hello,',
        '',
        `Thank you for downloading Interview Ready${safeSpotDisplay(waitlistSpot) ? ` (waitlist spot ${safeSpotDisplay(waitlistSpot)})` : ''}. Your AI-powered career toolkit is ready:`,
        '1. Install the app: open the downloaded APK on your Android device and tap Install.',
        '2. Run your first mock interview; the AI scores your structure, clarity, and delivery instantly.',
        '3. Tailor your resume with the ATS optimization engine.',
        '',
        'Pro tip: if Android blocks the install, open Settings > Apps > Special access > Install unknown apps and allow the browser you downloaded with, then reopen the APK and tap Install. See "File might be harmful"? Choose Download anyway; it is the standard notice for apps installed outside the Play Store.',
        '',
        'Web platform: https://appinterviewready.top',
        "Download didn't complete? Try again in a different browser (Samsung Internet, Firefox, Brave, Opera, or Edge): https://appinterviewready.top/download",
        'Support: reply to this email or write to info@appinterviewready.top',
        'Follow us on LinkedIn: https://www.linkedin.com/company/interview-ready-app',
        '',
        '- The Interview Ready Team',
      ].join('\n'),
      html: generateWelcomeEmailHtml(waitlistSpot),
      replyTo: process.env.SUPPORT_REPLY_TO_EMAIL
        ? stripHeaderInjection(process.env.SUPPORT_REPLY_TO_EMAIL)
        : 'info@appinterviewready.top',
    });

    return { sent: true };
  } catch (smtpError: any) {
    console.error('[Welcome Email] SMTP send failed:', smtpError?.message || smtpError);
    return { sent: false, error: smtpError?.message || 'SMTP error' };
  }
}
