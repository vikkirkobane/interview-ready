import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

interface SubscribeRequestBody {
  email: string;
  name?: string;
  source?: string;
  waitlistSpot?: number;
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
      margin: 8px 0 0;
      color: #BAE6FD;
      font-size: 14px;
      font-weight: 400;
    }
    .content {
      padding: 32px 28px;
      color: #334155;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 12px;
    }
    p {
      margin: 0 0 16px;
      font-size: 14px;
      color: #334155;
    }
    .highlight-card {
      background-color: #EFF6FF;
      border: 2px solid #BFDBFE;
      border-radius: 14px;
      padding: 22px 18px;
      margin: 24px 0;
      text-align: center;
    }
    .spot-label {
      font-size: 11px;
      color: #1E40AF;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .spot-number {
      font-size: 36px;
      font-weight: 900;
      color: #1A4F8A;
      letter-spacing: -1px;
      line-height: 1;
    }
    .spot-hint {
      margin: 10px 0 0;
      font-size: 12px;
      color: #475569;
      font-weight: 500;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0 24px;
    }
    .btn {
      display: inline-block;
      background: #1A4F8A;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 15px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(26, 79, 138, 0.35);
      letter-spacing: 0.3px;
    }
    .url-fallback {
      text-align: center;
      font-size: 12px;
      color: #64748B;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .url-fallback a {
      color: #1A4F8A;
      font-weight: 600;
    }
    .feature-list {
      margin: 24px 0;
      padding: 0;
      list-style: none;
      border-top: 1px solid #F1F5F9;
      padding-top: 18px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
      font-size: 13px;
      color: #334155;
    }
    .feature-icon {
      color: #0EA5E9;
      font-weight: bold;
      margin-right: 10px;
      font-size: 15px;
      line-height: 1.4;
    }
    .instructions {
      background-color: #F8FAFC;
      border-radius: 12px;
      padding: 18px 20px;
      margin-top: 24px;
      border: 1px solid #E2E8F0;
    }
    .instructions h4 {
      margin: 0 0 10px;
      color: #0F172A;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .instructions ol {
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
      color: #475569;
    }
    .instructions li {
      margin-bottom: 6px;
    }
    .footer {
      background-color: #1A4F8A;
      padding: 24px 28px;
      text-align: center;
      font-size: 12px;
      color: #E2E8F0;
    }
    .footer p {
      margin: 0 0 6px;
      color: #E2E8F0;
    }
    .footer a {
      color: #7DD3FC;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Brand Header -->
      <div class="header">
        <div class="logo-badge">⚡ VIP Early Access</div>
        <h1>Interview Ready</h1>
        <p>AI-Powered Career & Mock Interview Platform</p>
      </div>

      <!-- Main Body -->
      <div class="content">
        <div class="greeting">Welcome to Interview Ready!</div>
        <p>
          Thank you for joining our priority waitlist. Your standalone Android APK installer is ready to download and install.
        </p>

        <!-- Access Code Highlight Box -->
        <div class="highlight-card">
          <div class="spot-label">Your Waitlist Access Code</div>
          <div class="spot-number">#${spotNumber}</div>
          <div class="spot-hint">
            Key in this code <strong>#${spotNumber}</strong> on the download page to unlock the APK installer.
          </div>
        </div>

        <!-- Primary CTA Button -->
        <div class="btn-container">
          <a href="${downloadUrl}" class="btn" target="_blank">
            📱 Unlock & Download Android APK
          </a>
        </div>

        <div class="url-fallback">
          Or open this link directly in your mobile browser:<br/>
          <a href="${downloadUrl}">${downloadUrl}</a>
        </div>

        <!-- App Features -->
        <ul class="feature-list">
          <li class="feature-item">
            <span class="feature-icon">✨</span>
            <div><strong>Dynamic Voice Interviews:</strong> Practice job questions spoken aloud with intelligent follow-ups.</div>
          </li>
          <li class="feature-item">
            <span class="feature-icon">📊</span>
            <div><strong>Instant AI Scoring:</strong> Real-time feedback on confidence, clarity, pacing, and keywords.</div>
          </li>
          <li class="feature-item">
            <span class="feature-icon">⚡</span>
            <div><strong>Offline Question Bank:</strong> Review 500+ curated interview flashcards anywhere.</div>
          </li>
        </ul>

        <!-- Installation Instructions -->
        <div class="instructions">
          <h4>Quick 3-Step Installation (Android)</h4>
          <ol>
            <li>Tap the <strong>Unlock & Download Android APK</strong> button above.</li>
            <li>Key in your access code <strong>#${spotNumber}</strong> to unlock the installer.</li>
            <li>Tap <strong>Download</strong> and open the APK to complete installation.</li>
          </ol>
        </div>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p>© ${new Date().getFullYear()} Interview Ready. All rights reserved.</p>
        <p>
          Questions or need help? Reach us at <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Creates Nodemailer transporter configured for Spaceship SMTP
 */
function createSpaceshipTransporter() {
  let rawHost = (process.env.SPACESHIP_SMTP_HOST || 'mail.spacemail.com').trim().replace(/['"]/g, '');
  
  // If user accidentally put their email address in host, automatically fix to mail.spacemail.com
  if (rawHost.includes('@') || !rawHost.includes('.')) {
    rawHost = 'mail.spacemail.com';
  }

  const rawPort = (process.env.SPACESHIP_SMTP_PORT || '465').trim().replace(/['"]/g, '');
  const port = parseInt(rawPort, 10) || 465;
  const isPort465 = port === 465;
  const secureEnv = (process.env.SPACESHIP_SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureEnv === 'true' || (secureEnv !== 'false' && isPort465);

  const user = (process.env.SPACESHIP_SMTP_USER || '').trim().replace(/['"]/g, '');
  const pass = (process.env.SPACESHIP_SMTP_PASS || '').trim().replace(/['"]/g, '');

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: rawHost,
    port,
    secure, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

async function saveToAirtable(email: string, waitlistSpot: number): Promise<{ saved: boolean; id?: string; error?: string }> {
  const apiKey = (process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PAT || '').trim().replace(/['"]/g, '');
  const baseId = (process.env.AIRTABLE_BASE_ID || '').trim().replace(/['"]/g, '');
  const tableName = (process.env.AIRTABLE_TABLE_NAME || 'Submissions').trim().replace(/['"]/g, '');

  if (!apiKey || !baseId) {
    return { saved: false, error: 'Airtable not configured (AIRTABLE_API_KEY / AIRTABLE_BASE_ID)' };
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
    console.log('[Airtable API] Record created with ID:', result.id);
    return { saved: true, id: result.id };
  } catch (err: any) {
    console.warn('[Airtable API] Exception:', err);
    return { saved: false, error: err.message || String(err) };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for frontend API calls
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { email, name, source, waitlistSpot }: SubscribeRequestBody = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const spot = waitlistSpot || Math.floor(Math.random() * 200) + 400;

    // Determine base application URL
    const appBaseUrl =
      process.env.APP_URL ||
      (req.headers.host ? `https://${req.headers.host}` : 'https://appinterviewready.top');
    
    // Clean download link with referral email query
    const cleanAppUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
    const downloadUrl = `${cleanAppUrl}/download?email=${encodeURIComponent(trimmedEmail)}`;

    console.log(`[Subscribe API] Recording email submission: ${trimmedEmail} (Spot: #${spot})`);

    // 1. Record in Airtable spreadsheet if configured
    const airtableResult = await saveToAirtable(trimmedEmail, spot);

    // 2. Prepare Spaceship SMTP email transport
    const transporter = createSpaceshipTransporter();
    let emailSent = false;
    let emailStatusMessage = '';

    if (!transporter) {
      console.warn(
        '[Subscribe API] Spaceship SMTP credentials (SPACESHIP_SMTP_USER / SPACESHIP_SMTP_PASS) not set in environment. Skipping email dispatch.'
      );
      emailStatusMessage = 'Email recorded successfully. SMTP delivery skipped (environment credentials pending).';
    } else {
      try {
        const fromAddress =
          process.env.SPACESHIP_FROM_EMAIL ||
          `"Interview Ready" <${process.env.SPACESHIP_SMTP_USER}>`;

        const mailOptions = {
          from: fromAddress,
          to: trimmedEmail,
          subject: '📱 Your Interview Ready Mobile App Download is Ready!',
          text: `Welcome to Interview Ready!\n\nYour early access spot is #${spot}.\n\nDownload and install the mobile app here:\n${downloadUrl}\n\nFor support, email us at info@appinterviewready.top`,
          html: generateEmailHtml(trimmedEmail, downloadUrl, spot),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Subscribe API] Spaceship email sent successfully:', info.messageId);
        emailSent = true;
        emailStatusMessage = 'Download link sent to your email via Spaceship!';
      } catch (smtpError: any) {
        console.error('[Subscribe API] Error sending email via Spaceship SMTP:', smtpError);
        emailStatusMessage = `Email recorded, but Spaceship SMTP dispatch failed: ${smtpError.message || 'Check credentials'}`;
      }
    }

    return res.status(200).json({
      success: true,
      email: trimmedEmail,
      waitlistSpot: spot,
      downloadUrl,
      emailSent,
      airtableSaved: airtableResult.saved,
      airtableMessage: airtableResult.error || (airtableResult.saved ? 'Saved to Airtable' : undefined),
      message: emailStatusMessage,
      recordedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Subscribe API] Unhandled error in /api/subscribe:', error);
    return res.status(500).json({
      error: 'Internal server error while processing subscription.',
      details: error.message || String(error),
    });
  }
}
