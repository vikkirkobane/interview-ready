import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

interface SubscribeRequestBody {
  email: string;
  name?: string;
  source?: string;
  waitlistSpot?: number;
}

export function generateEmailHtml(email: string, downloadUrl: string, waitlistSpot?: number): string {
  const spotNumber = waitlistSpot || Math.floor(Math.random() * 200) + 400;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Interview Ready Mobile App Download</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #050C1A;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      background-color: #050C1A;
      padding: 40px 10px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(180deg, #0B192C 0%, #081220 100%);
      border: 1px solid #1E293B;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #0A192F 0%, #0f2744 100%);
      padding: 36px 30px;
      text-align: center;
      border-bottom: 1px solid #1E293B;
    }
    .logo-badge {
      display: inline-block;
      background: linear-gradient(135deg, #00F0FF 0%, #0072FF 100%);
      color: #050C1A;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0;
      color: #94A3B8;
      font-size: 15px;
    }
    .content {
      padding: 32px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 12px;
    }
    .highlight-card {
      background: rgba(0, 240, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.2);
      border-radius: 12px;
      padding: 18px;
      margin: 24px 0;
      text-align: center;
    }
    .spot-number {
      font-size: 32px;
      font-weight: 900;
      color: #00F0FF;
      letter-spacing: -1px;
    }
    .spot-label {
      font-size: 13px;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 28px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #00F0FF 0%, #0084FF 100%);
      color: #050C1A !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 800;
      padding: 16px 36px;
      border-radius: 10px;
      box-shadow: 0 8px 25px rgba(0, 240, 255, 0.35);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .feature-list {
      margin: 28px 0;
      padding: 0;
      list-style: none;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 14px;
      font-size: 14px;
      color: #CBD5E1;
    }
    .feature-icon {
      color: #00F0FF;
      margin-right: 12px;
      font-size: 16px;
      line-height: 1.4;
    }
    .instructions {
      background-color: #0B132B;
      border-radius: 10px;
      padding: 20px;
      margin-top: 24px;
      border: 1px solid #1E293B;
    }
    .instructions h4 {
      margin: 0 0 12px;
      color: #F8FAFC;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .instructions ol {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      color: #94A3B8;
    }
    .instructions li {
      margin-bottom: 8px;
    }
    .footer {
      background-color: #060E1A;
      padding: 24px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      border-top: 1px solid #1E293B;
    }
    .footer a {
      color: #00F0FF;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">⚡ VIP Early Access</div>
        <h1>Interview Ready</h1>
        <p>Your AI-Powered Mock Interview Platform</p>
      </div>

      <div class="content">
        <div class="greeting">Hello,</div>
        <p>
          Thank you for joining <strong>Interview Ready</strong>! Your mobile app access has been unlocked.
        </p>

        <div class="highlight-card">
          <div class="spot-label">Your Waitlist Access Code</div>
          <div class="spot-number">#${spotNumber}</div>
          <p style="margin: 6px 0 0; font-size: 13px; color: #94A3B8;">
            Key in this code <strong>#${spotNumber}</strong> on the download page to unlock your APK
          </p>
        </div>

        <div class="btn-container">
          <a href="${downloadUrl}" class="btn" target="_blank">
            📱 Unlock & Download Mobile App
          </a>
        </div>

        <div style="text-align: center; font-size: 12px; color: #64748B; margin-top: -16px; margin-bottom: 24px;">
          Or copy this URL into your browser: <br/>
          <a href="${downloadUrl}" style="color: #00F0FF; word-break: break-all;">${downloadUrl}</a>
        </div>

        <ul class="feature-list">
          <li class="feature-item">
            <span class="feature-icon">✨</span>
            <div><strong>Dynamic AI Mock Interviewer:</strong> Practice job interviews customized for software engineering, product, finance, and management roles.</div>
          </li>
          <li class="feature-item">
            <span class="feature-icon">🎙️</span>
            <div><strong>Voice & Real-Time Feedback:</strong> Get instant critiques on clarity, confidence, pacing, and keyword accuracy.</div>
          </li>
          <li class="feature-item">
            <span class="feature-icon">📊</span>
            <div><strong>Performance Analytics:</strong> Track your mastery score across behavioral, technical, and situational question sets.</div>
          </li>
        </ul>

        <div class="instructions">
          <h4>Quick Installation Steps (Android)</h4>
          <ol>
            <li>Tap the <strong>Unlock & Download Mobile App</strong> button above.</li>
            <li>Key in your access code <strong>#${spotNumber}</strong> to unlock the APK installer.</li>
            <li>If prompted with <em>"File might be harmful"</em>, tap <strong>Download anyway</strong>, then tap <strong>Install</strong>.</li>
          </ol>
        </div>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} Interview Ready. All rights reserved.</p>
        <p>
          Need help? Contact our support team at <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a>
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
        }
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
