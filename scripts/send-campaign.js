const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env
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

const AIRTABLE_API_KEY = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'app5axaWoe4MblFFS';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Interview Ready <welcome@noreply.appinterviewready.top>';
const APP_URL = 'https://appinterviewready.top';
const TEST_EMAIL = 'victorchogo37@gmail.com';

function getEmailContent() {
  const subject = '🎁 A Special Thank You & 40 Extra Credits (Promo Code Inside)';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0f172a;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 36px 32px;
      text-align: center;
      border-bottom: 2px solid #3b82f6;
    }
    .header-logo {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .header-logo span {
      color: #3b82f6;
    }
    .header-tagline {
      margin-top: 6px;
      font-size: 13px;
      color: #94a3b8;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .body {
      padding: 36px 32px;
      font-size: 15px;
      line-height: 1.65;
      color: #334155;
    }
    .badge {
      display: inline-block;
      background-color: #eff6ff;
      color: #2563eb;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 20px;
      border: 1px solid #bfdbfe;
    }
    h2 {
      margin: 0 0 16px 0;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }
    p {
      margin: 0 0 18px 0;
    }
    .promo-card {
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
      border: 2px dashed #3b82f6;
      border-radius: 14px;
      padding: 20px 14px;
      margin: 24px 0;
      text-align: center;
      box-sizing: border-box;
      max-width: 100%;
    }
    .promo-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .promo-code {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #1d4ed8;
      background: #ffffff;
      padding: 8px 16px;
      border-radius: 8px;
      display: inline-block;
      border: 1px solid #bfdbfe;
      box-shadow: 0 2px 6px rgba(37,99,235,0.12);
      font-family: 'Courier New', Courier, monospace;
      max-width: 95%;
      box-sizing: border-box;
      word-break: break-word;
    }
    .promo-value {
      margin-top: 10px;
      font-size: 13px;
      font-weight: 600;
      color: #059669;
    }
    .features-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .features-card h3 {
      margin: 0 0 14px 0;
      font-size: 15px;
      color: #0f172a;
      font-weight: 700;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
      font-size: 14px;
      color: #475569;
    }
    .feature-item:last-child {
      margin-bottom: 0;
    }
    .feature-icon {
      font-size: 16px;
      margin-right: 10px;
      flex-shrink: 0;
    }
    .steps-card {
      background-color: #ffffff;
      border-left: 4px solid #3b82f6;
      padding: 12px 18px;
      margin: 20px 0;
      font-size: 14px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 20px 0;
    }
    .btn {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      padding: 16px 36px;
      border-radius: 9999px;
      display: inline-block;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
      transition: transform 0.2s;
    }
    .footer {
      padding: 28px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
    }
    @media only screen and (max-width: 480px) {
      .wrapper {
        padding: 16px 8px !important;
      }
      .header {
        padding: 24px 16px !important;
      }
      .body {
        padding: 24px 16px !important;
      }
      .promo-card {
        padding: 16px 10px !important;
        margin: 18px 0 !important;
      }
      .promo-code {
        font-size: 16px !important;
        letter-spacing: 1px !important;
        padding: 6px 12px !important;
      }
      .btn {
        padding: 12px 24px !important;
        font-size: 14px !important;
        display: block !important;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview <span>Ready</span></h1>
        <div class="header-tagline">AI-Powered Career & Interview Suite</div>
      </div>
      <div class="body">
        <div class="badge">Celebration & Reward</div>
        <h2>Thank You for Being Part of Our Growth!</h2>
        
        <p>You joined us early, supported our journey, and helped shape <strong>Interview Ready</strong> into what it is today. For that, we want to say a huge and heartfelt <strong>thank you</strong>.</p>
        
        <p>To celebrate and congratulate you, we’re awarding you <strong>extra bonus credits</strong> to supercharge your career preparation:</p>

        <div class="promo-card">
          <div class="promo-label">Your Exclusive Promo Code</div>
          <div class="promo-code">FASTTRACK40</div>
          <div class="promo-value">✨ +40 Extra Credits (Instant Balance Boost)</div>
        </div>

        <p><strong>The web app is now fully ready, optimized, and working excellently!</strong> Everything has been fine-tuned for high performance and precision so you can jump right in and try out the new features:</p>

        <div class="features-card">
          <h3>What You Can Do Right Now:</h3>
          <div class="feature-item">
            <span class="feature-icon">⚡</span>
            <div><strong>Precision ATS Resume Builder:</strong> Tailor bullets and sections directly to match target job descriptions. Clean export to PDF and DOCX.</div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🎯</span>
            <div><strong>Job Fit & Match Analysis:</strong> Get instant gap analysis and intelligent recommendations before you even apply.</div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🎙️</span>
            <div><strong>Interactive AI Mock Interviews:</strong> Practice realistic role-specific questions with real-time coaching, hints, and scorecards.</div>
          </div>
        </div>

        <div class="steps-card">
          <strong>How to redeem your 40 credits in 30 seconds:</strong>
          <ol style="margin: 8px 0 0 0; padding-left: 20px;">
            <li>Visit <a href="${APP_URL}" style="color: #2563eb; font-weight: 600;">${APP_URL}</a></li>
            <li>In the promo/referral section on onboarding or in your account, enter code: <strong>FASTTRACK40</strong></li>
            <li>Your 40 credits will be instantly applied to your account!</li>
          </ol>
        </div>

        <div class="btn-container">
          <a href="${APP_URL}" class="btn">Try the Features & Claim Your Credits &rarr;</a>
        </div>

        <p style="margin-top: 24px; font-size: 14px; color: #64748b;">If you have any questions or feedback as you try out the app, simply reply directly to this email. We would love to hear your thoughts.</p>

        <p style="margin-top: 16px; margin-bottom: 0;">Warm regards,<br><strong>The Interview Ready Team</strong></p>
      </div>

      <div class="footer">
        <p>Interview Ready &bull; <a href="${APP_URL}">appinterviewready.top</a></p>
        <p style="margin-top: 6px;">Questions? Reach us at <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p style="margin-top: 10px; font-size: 11px;">You received this email because you signed up for early access or joined the Interview Ready waitlist. <a href="mailto:info@appinterviewready.top?subject=Unsubscribe">Unsubscribe</a></p>
        <p style="margin-top: 4px; font-size: 11px;">&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hello,

Thank you for being part of our growth!

You joined us early, supported our journey, and helped shape Interview Ready into what it is today. For that, we want to say a huge and heartfelt thank you.

To celebrate and congratulate you, we are awarding you extra bonus credits to supercharge your career preparation:

Exclusive Promo Code: FASTTRACK40
Value: +40 Extra AI Credits

The web app is now fully ready, optimized, and working excellently!
You can now try out:
- Precision ATS Resume Builder: Tailor bullets and sections directly to match target job descriptions with clean export.
- Job Fit & Match Analysis: Instant score and gap analysis for target roles.
- Interactive AI Mock Interviews: Role-specific simulations with real-time feedback and scorecards.

How to redeem your 40 credits in 30 seconds:
1. Open Interview Ready: ${APP_URL}
2. Enter promo code FASTTRACK40 in the promo/referral field
3. 40 credits will be added to your balance instantly!

Start now: ${APP_URL}

Warm regards,
The Interview Ready Team
Support: info@appinterviewready.top
Unsubscribe: reply with 'Unsubscribe' or email info@appinterviewready.top?subject=Unsubscribe`;

  return { subject, html, text };
}

async function sendEmail(toEmail, subject, html, text) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [toEmail],
      reply_to: 'info@appinterviewready.top',
      subject: subject,
      html: html,
      text: text,
      tags: [{ name: 'campaign', value: 'growth_thankyou_fasttrack40' }]
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Resend Error (${response.status}): ` + JSON.stringify(data));
  }

  return data;
}

async function runTest() {
  console.log(`\n========================================`);
  console.log(`SENDING TEST EMAIL TO: ${TEST_EMAIL}`);
  console.log(`FROM: ${RESEND_FROM}`);
  console.log(`========================================\n`);

  const { subject, html, text } = getEmailContent();

  try {
    const result = await sendEmail(TEST_EMAIL, subject, html, text);
    console.log('✅ TEST EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', result.id);
    console.log('\nPlease check your inbox (' + TEST_EMAIL + ') to inspect the formatting and deliverability.');
  } catch (err) {
    console.error('❌ Failed to send test email:', err.message);
    process.exit(1);
  }
}

async function runBulk() {
  if (!AIRTABLE_API_KEY) {
    throw new Error('AIRTABLE_API_KEY / AIRTABLE_PERSONAL_ACCESS_TOKEN is required for bulk send.');
  }

  console.log(`\n========================================`);
  console.log(`FETCHING EMAILS FROM AIRTABLE SUBMISSIONS...`);
  console.log(`========================================\n`);

  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Submissions`, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Airtable error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const records = data.records || [];
  
  // Extract unique, valid email addresses
  const recipientList = [];
  const seen = new Set();

  for (const r of records) {
    const email = (r.fields.Email || '').trim().toLowerCase();
    if (email && email.includes('@') && !seen.has(email)) {
      seen.add(email);
      recipientList.push({ id: r.id, email });
    }
  }

  console.log(`Found ${recipientList.length} unique valid email addresses in Airtable Submissions:`);
  recipientList.forEach((r, idx) => console.log(`  ${idx + 1}. ${r.email} (${r.id})`));

  console.log(`\nStarting email dispatch...`);
  const { subject, html, text } = getEmailContent();

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < recipientList.length; i++) {
    const item = recipientList[i];
    process.stdout.write(`[${i + 1}/${recipientList.length}] Sending to ${item.email}... `);

    try {
      const resendRes = await sendEmail(item.email, subject, html, text);
      console.log(`DONE (ID: ${resendRes.id})`);
      successCount++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failCount++;
    }

    // Rate-limit throttle (300ms delay between emails)
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n========================================`);
  console.log(`CAMPAIGN DISPATCH FINISHED`);
  console.log(`Success: ${successCount} | Failed: ${failCount}`);
  console.log(`========================================\n`);
}

const mode = process.argv[2];
if (mode === '--bulk') {
  runBulk();
} else {
  runTest();
}
