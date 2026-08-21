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

export function generateWelcomeEmailHtml(waitlistSpot?: number | string): string {
  const spotDisplay = safeSpotDisplay(waitlistSpot);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Interview Ready</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F9FAFB;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0D1117;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F9FAFB;
      padding: 32px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(13, 17, 23, 0.08);
      border: 1px solid #E5E7EB;
    }
    .header {
      background: linear-gradient(135deg, #1A4F8A 0%, #123761 100%);
      padding: 40px 32px 32px;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      background: #EFF6FF;
      color: #1A4F8A;
      font-family: 'Sora', 'Inter', Arial, sans-serif;
      font-weight: 800;
      font-size: 10px;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 999px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-family: 'Sora', 'Inter', Arial, sans-serif;
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
      font-family: 'Sora', 'Inter', Arial, sans-serif;
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
      font-family: 'Sora', 'Inter', Arial, sans-serif;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0D1117;
      margin: 0 0 14px;
    }
    .step-row {
      display: table;
      width: 100%;
      margin-bottom: 12px;
    }
    .step-num {
      display: table-cell;
      width: 26px;
      font-weight: 800;
      font-size: 13px;
      color: #0EA5E9;
    }
    .step-desc {
      display: table-cell;
      font-size: 13px;
      color: #4B5563;
      line-height: 1.5;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn-primary {
      display: inline-block;
      background-color: #1A4F8A;
      color: #FFFFFF !important;
      font-family: 'Sora', 'Inter', Arial, sans-serif;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.3px;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(26, 79, 138, 0.35);
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
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo-badge">Interview Ready</span>
        <h1>Welcome Aboard!</h1>
        <p>Your app is installed &mdash; your interview prep starts now.</p>
      </div>

      <div class="content">
        <p class="greeting">Hello,</p>
        <p class="lead-text">
          Thank you for downloading Interview Ready${spotDisplay ? ` (early-access member ${spotDisplay})` : ''}. You now have the full AI-powered toolkit in your hands: ATS-optimized resumes, voice-driven mock interviews, and targeted flashcards.
        </p>

        <div class="steps-card">
          <div class="steps-title">Get Started in 3 Steps:</div>
          <div class="step-row">
            <div class="step-num">1.</div>
            <div class="step-desc"><strong>Install the app</strong> &mdash; open the downloaded APK on your Android device and tap Install.</div>
          </div>
          <div class="step-row">
            <div class="step-num">2.</div>
            <div class="step-desc"><strong>Run your first mock interview</strong> &mdash; the AI scores your structure, clarity, and delivery in real time.</div>
          </div>
          <div class="step-row">
            <div class="step-num">3.</div>
            <div class="step-desc"><strong>Tailor your resume</strong> &mdash; paste any job description and let the ATS engine optimize your bullets.</div>
          </div>
        </div>

        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn-primary" target="_blank" rel="noopener noreferrer">
            Open the Web Platform
          </a>
        </div>

        <div class="tip-card">
          <strong>Pro tip:</strong> Candidates who complete three mock interviews in their first week see the biggest improvement in delivery confidence.
        </div>
      </div>

      <div class="footer">
        <p>&copy; 2026 Interview Ready. Built for ambitious professionals.</p>
        <p>Questions? Reach us at <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
      </div>
    </div>
  </div>
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
      subject: 'Welcome to Interview Ready - Your Prep Starts Now!',
      text: [
        'Hello,',
        '',
        `Thank you for downloading Interview Ready${safeSpotDisplay(waitlistSpot) ? ` (early-access member ${safeSpotDisplay(waitlistSpot)})` : ''}. Your AI-powered career toolkit is ready:`,
        '1. Open the Interview Ready app on your Android device.',
        '2. Run your first voice-driven mock interview.',
        '3. Tailor your resume with the ATS optimization engine.',
        '',
        'Web platform: https://appinterviewready.top',
        'Support: info@appinterviewready.top',
        '',
        '- The Interview Ready Team',
      ].join('\n'),
      html: generateWelcomeEmailHtml(waitlistSpot),
    });

    return { sent: true };
  } catch (smtpError: any) {
    console.error('[Welcome Email] SMTP send failed:', smtpError?.message || smtpError);
    return { sent: false, error: smtpError?.message || 'SMTP error' };
  }
}
