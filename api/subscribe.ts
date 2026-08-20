import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

interface SubscribeRequestBody {
  email: string;
  name?: string;
  source?: string;
  waitlistSpot?: number;
  hp?: string;
  website?: string;
}

// In-memory rate limiting map for sliding window
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(
  key: string,
  maxHits: number = 8,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const cleanKey = key || 'unknown-client';
  const timestamps = rateLimitMap.get(cleanKey) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxHits) {
    const oldest = validTimestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  validTimestamps.push(now);
  rateLimitMap.set(cleanKey, validTimestamps);
  return { allowed: true, remaining: maxHits - validTimestamps.length };
}

function stripHeaderInjection(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t\0\x0B\x0C]/g, '')
    .replace(/%0[aAdD]/gi, '')
    .trim();
}

function validateAndSanitizeEmail(rawEmail: unknown): { isValid: boolean; email: string; error?: string } {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { isValid: false, email: '', error: 'Email address is required.' };
  }

  const sanitized = stripHeaderInjection(rawEmail).toLowerCase();

  if (sanitized.length < 5 || sanitized.length > 254) {
    return { isValid: false, email: '', error: 'Email address must be between 5 and 254 characters.' };
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, email: '', error: 'Please enter a valid email format (e.g. name@company.com).' };
  }

  const parts = sanitized.split('@');
  if (parts.length !== 2) return { isValid: false, email: '', error: 'Invalid email format.' };

  const [localPart, domainPart] = parts;
  if (localPart.length > 64) return { isValid: false, email: '', error: 'Email username is too long (max 64 chars).' };
  if (!domainPart.includes('.') || domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return { isValid: false, email: '', error: 'Email domain is invalid.' };
  }

  const blockedPatterns = ['<script', 'javascript:', 'data:', 'vbscript:', 'onclick', 'onerror'];
  if (blockedPatterns.some(p => sanitized.includes(p))) {
    return { isValid: false, email: '', error: 'Unacceptable characters in email address.' };
  }

  return { isValid: true, email: sanitized };
}

export function generateEmailHtml(userEmail: string, downloadUrl: string, waitlistSpot?: number): string {
  const spotNumber = waitlistSpot || Math.floor(Math.random() * 200) + 400;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Interview Ready Mobile App Download is Ready</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F1F5F9;
      padding: 30px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07);
      border: 1px solid #E2E8F0;
    }
    .header {
      background: linear-gradient(135deg, #1A4F8A 0%, #123761 100%);
      padding: 36px 30px 30px;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      background: #0EA5E9;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 20px;
      margin-bottom: 14px;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .header p {
      margin: 10px 0 0;
      color: #E0F2FE;
      font-size: 14px;
      font-weight: 400;
    }
    .content {
      padding: 32px 30px;
      background-color: #FFFFFF;
    }
    .greeting {
      font-size: 16px;
      color: #0F172A;
      margin: 0 0 16px;
      font-weight: 600;
    }
    .lead-text {
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .code-card {
      background-color: #EFF6FF;
      border: 2px solid #BFDBFE;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      margin: 0 0 26px;
    }
    .code-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #1E40AF;
      margin: 0 0 6px;
    }
    .code-value {
      font-size: 36px;
      font-weight: 900;
      color: #1A4F8A;
      letter-spacing: 2px;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
    }
    .code-hint {
      font-size: 12px;
      color: #475569;
      margin: 8px 0 0;
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
      font-size: 15px;
      text-decoration: none;
      padding: 15px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(26, 79, 138, 0.35);
    }
    .steps-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 20px;
      margin: 26px 0;
    }
    .steps-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F172A;
      margin: 0 0 14px;
    }
    .step-row {
      display: table;
      width: 100%;
      margin-bottom: 10px;
    }
    .step-num {
      display: table-cell;
      width: 24px;
      font-weight: 800;
      font-size: 13px;
      color: #0EA5E9;
    }
    .step-desc {
      display: table-cell;
      font-size: 13px;
      color: #334155;
      line-height: 1.4;
    }
    .footer {
      background-color: #1A4F8A;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #1E3A8A;
    }
    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #BFDBFE;
    }
    .footer a {
      color: #38BDF8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo-badge">Interview Ready</span>
        <h1>Your Mobile App Access is Ready!</h1>
        <p>Your priority early access slot has been confirmed.</p>
      </div>

      <div class="content">
        <p class="greeting">Hello,</p>
        <p class="lead-text">
          Thank you for joining the Interview Ready early access waitlist. Your dedicated Android mobile APK installer is ready for download.
        </p>

        <div class="code-card">
          <div class="code-label">Your Priority Access Code</div>
          <div class="code-value">#${spotNumber}</div>
          <div class="code-hint">Copy this number — you'll key it in on the download page to unlock the APK.</div>
        </div>

        <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 12px 16px; margin: 20px 0 16px; font-size: 13px; color: #78350F; line-height: 1.5;">
          <strong>⚠️ Recommended: Please open and download this link in a different browser (such as Samsung Internet, Firefox, Brave, Opera, or Edge) instead of Google Chrome.</strong>
        </div>

        <div class="btn-container">
          <a href="${downloadUrl}" class="btn-primary" target="_blank" rel="noopener noreferrer">
            📱 Unlock &amp; Download Android APK
          </a>
        </div>

        <div class="steps-card">
          <div class="steps-title">Quick Installation Steps:</div>
          <div class="step-row">
            <div class="step-num">1.</div>
            <div class="step-desc">Tap the button above or visit the download page.</div>
          </div>
          <div class="step-row">
            <div class="step-num">2.</div>
            <div class="step-desc">Key in your access code <strong>#${spotNumber}</strong> to unlock the APK file.</div>
          </div>
          <div class="step-row">
            <div class="step-num">3.</div>
            <div class="step-desc">Open the downloaded file on your Android device and tap Install.</div>
          </div>
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

function createSpaceshipTransporter() {
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
  });
}

async function saveToAirtable(email: string, waitlistSpot: number): Promise<{ saved: boolean; id?: string; error?: string }> {
  const apiKey = (process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PAT || '').trim().replace(/['"]/g, '');
  const baseId = (process.env.AIRTABLE_BASE_ID || '').trim().replace(/['"]/g, '');
  const tableName = (process.env.AIRTABLE_TABLE_NAME || 'Submissions').trim().replace(/['"]/g, '');

  if (!apiKey || !baseId) {
    return { saved: false, error: 'Airtable not configured' };
  }

  try {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Email': email,
          'Waitlist Spot': waitlistSpot,
          'Submitted At': new Date().toISOString(),
          'Status': 'Confirmed'
        },
        typecast: true
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.warn('[Airtable API] Error response:', errJson);
      return { saved: false, error: errJson.error?.message || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { saved: true, id: result.id };
  } catch (err: any) {
    console.warn('[Airtable API] Exception:', err);
    return { saved: false, error: err.message || String(err) };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  // 1. IP Rate Limiter
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientIp, 8, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: `Too many submissions. Please try again in ${rateLimit.retryAfterSec} seconds.` });
  }

  try {
    const { email, name, source, waitlistSpot, hp, website }: SubscribeRequestBody = req.body || {};

    // 2. Honeypot Anti-Bot Trap
    if (hp || website) {
      return res.status(200).json({ success: true, message: 'Subscription confirmed.' });
    }

    // 3. Strict RFC 5322 validation
    const emailCheck = validateAndSanitizeEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ error: emailCheck.error || 'A valid email address is required.' });
    }

    const sanitizedEmail = emailCheck.email;
    const spot = typeof waitlistSpot === 'number' && waitlistSpot >= 100 && waitlistSpot <= 999999
      ? waitlistSpot
      : Math.floor(Math.random() * 200) + 400;

    const appBaseUrl = process.env.APP_URL || (req.headers.host ? `https://${req.headers.host}` : 'https://appinterviewready.top');
    const cleanAppUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
    const downloadUrl = `${cleanAppUrl}/download?spot=${spot}&email=${encodeURIComponent(sanitizedEmail)}`;

    console.log(`[Subscribe API] Secure submission recorded: ${sanitizedEmail} (Spot: #${spot})`);

    // 4. Save to Airtable
    const airtableResult = await saveToAirtable(sanitizedEmail, spot);

    // 5. Send Spaceship email
    const transporter = createSpaceshipTransporter();
    let emailSent = false;
    let emailStatusMessage = '';

    if (!transporter) {
      emailStatusMessage = 'Email recorded successfully.';
    } else {
      try {
        const fromAddress = process.env.SPACESHIP_FROM_EMAIL || `"Interview Ready" <${stripHeaderInjection(process.env.SPACESHIP_SMTP_USER || '')}>`;
        const mailOptions = {
          from: fromAddress,
          to: sanitizedEmail,
          subject: '📱 Your Interview Ready Mobile App Download is Ready!',
          text: `Welcome to Interview Ready!\n\nYour waitlist access code is #${spot}.\n\nUnlock and download your mobile app here:\n${downloadUrl}\n\nFor support, email us at info@appinterviewready.top`,
          html: generateEmailHtml(sanitizedEmail, downloadUrl, spot),
        };

        const info = await transporter.sendMail(mailOptions);
        emailSent = true;
        emailStatusMessage = 'Download link sent to your email!';
      } catch (smtpError: any) {
        console.error('[Subscribe API] Error sending email via Spaceship SMTP:', smtpError);
        emailStatusMessage = `Email recorded, but SMTP failed: ${smtpError.message || 'Check credentials'}`;
      }
    }

    return res.status(200).json({
      success: true,
      email: sanitizedEmail,
      waitlistSpot: spot,
      downloadUrl,
      emailSent,
      airtableSaved: airtableResult.saved,
      airtableMessage: airtableResult.error || (airtableResult.saved ? 'Saved to Airtable' : undefined),
      message: emailStatusMessage,
      recordedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Subscribe API] Error in /api/subscribe:', error);
    return res.status(500).json({ error: 'Internal server error while processing subscription.' });
  }
}
