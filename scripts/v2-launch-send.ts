import { config } from 'dotenv';
import { createSpaceshipTransporter, isValidRecipientEmail } from '../api/_lib/spaceship.ts';

// One-time campaign send: deliver the "Android v2 launch + COMMUNITY30 promo"
// email to every Airtable Submissions record (no Status filter) that does not
// yet have its 'V2 Sent' checkbox set, then flag each record after success.
//
// Usage:
//   npx tsx scripts/v2-launch-send.ts            # dry-run: lists recipients, sends nothing
//   npx tsx scripts/v2-launch-send.ts --send     # real send (marks each record after success)
//   npx tsx scripts/v2-launch-send.ts --send --limit 2   # test on the first 2 only
//   npx tsx scripts/v2-launch-send.ts --send --delay 2000
//   npx tsx scripts/v2-launch-send.ts --env-file .env.production

interface AirtableRecord {
  id: string;
  fields?: Record<string, unknown>;
}

interface V2EmailResult {
  sent: boolean;
  error?: string;
}

const args = process.argv.slice(2);
const envIdx = args.indexOf('--env-file');
// Shell-exported variables always win over file values (no override).
config({ path: envIdx !== -1 ? args[envIdx + 1] : '.env', override: false });
const DO_SEND = args.includes('--send');
const flagValue = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};
// CLI overrides beat env vars; Airtable accepts table IDs (tbl...) or names.
const BASE_OVERRIDE = flagValue('--base-id');
const TABLE_OVERRIDE = flagValue('--table-id');
const LIMIT = (() => { const v = flagValue('--limit'); return v ? parseInt(v, 10) : 0; })();
const DELAY_MS = (() => { const v = flagValue('--delay'); return v ? parseInt(v, 10) : 1500; })();

function envClean(name: string): string {
  return (process.env[name] || '').trim().replace(/['"]/g, '');
}

// Local copy of spaceship.ts's unexported header-injection sanitizer
// (used for the From address and recipient normalization).
function stripHeaderInjection(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t\0\x0B\x0C]/g, '')
    .replace(/%0[aAdD]/gi, '')
    .trim();
}

// Coerce the waitlist spot to digits only before it touches output.
function safeSpotDisplay(waitlistSpot?: number | string): string {
  const digits = `${waitlistSpot ?? ''}`.replace(/[^0-9]/g, '').slice(0, 7);
  return digits ? `#${digits}` : '';
}

async function fetchV2PendingRecords(apiKey: string, baseId: string, tableName: string): Promise<AirtableRecord[]> {
  // The 'V2 Sent' checkbox field now exists on the table (fldbXlm0RdDpvIDEl),
  // so a server-side formula is safe. Un-sent records are also filtered
  // client-side below for belt-and-braces safety.
  const formula = `NOT({V2 Sent})`;
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('filterByFormula', formula);
    url.searchParams.set('sort[0][field]', 'Submitted At');
    url.searchParams.set('sort[0][direction]', 'asc');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Airtable list failed (${res.status}): ${JSON.stringify(err)}`);
    }
    const data: any = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records.filter(r => !r.fields?.['V2 Sent']);
}

async function markV2Sent(apiKey: string, baseId: string, tableName: string, recordId: string): Promise<boolean> {
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: { 'V2 Sent': true }, typecast: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`   [FLAG FAILED] ${recordId} (${res.status}): ${JSON.stringify(err)}`);
    return false;
  }
  return true;
}

export function generateV2LaunchEmailHtml(waitlistSpot?: number | string): string {
  const spotDisplay = safeSpotDisplay(waitlistSpot);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Ready for Android v2 is Here</title>
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
    .promo-card {
      background: linear-gradient(135deg, #0EA5E9 0%, #1A4F8A 100%);
      border-radius: 12px;
      padding: 20px;
      margin: 0 0 26px;
      text-align: center;
    }
    .promo-title {
      font-family: 'Sora', 'Inter', Arial, sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.4px;
      color: #E0F2FE;
      margin: 0 0 8px;
    }
    .promo-code {
      display: inline-block;
      background-color: #FFFFFF;
      color: #123761;
      font-family: 'Sora', 'Inter', Arial, sans-serif;
      font-weight: 800;
      font-size: 22px;
      letter-spacing: 3px;
      padding: 10px 24px;
      border-radius: 10px;
      margin-bottom: 8px;
    }
    .promo-desc {
      font-size: 13px;
      color: #F0F9FF;
      line-height: 1.55;
      margin: 6px 0 0;
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
    .retry-card {
      background-color: #FEF3C7;
      border: 1px solid #FCD34D;
      border-radius: 12px;
      padding: 14px 16px;
      margin: 16px 0 0;
      font-size: 13px;
      color: #78350F;
      line-height: 1.55;
    }
    .retry-card a {
      color: #92400E;
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
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo-badge">Interview Ready</span>
        <h1>You Were Here First: Meet Android v2</h1>
        <p>The all-new app is officially live for our early-access community.</p>
      </div>

      <div class="content">
        <p class="greeting">Hello,</p>
        <p class="lead-text">
          Before anyone else, you believed in Interview Ready${spotDisplay ? ` (early-access member ${spotDisplay})` : ''}. Today that early faith pays off: version&nbsp;2 of our Android app is ready for you, rebuilt around the tools that get you hired, from ATS-tested resume bullets to voice AI mock interviews with instant confidence and pacing breakdowns.
        </p>

        <div class="steps-card">
          <div class="steps-title">Your 3-Step Early Access:</div>
          <div class="step-row">
            <div class="step-num">1.</div>
            <div class="step-desc"><strong>Download:</strong> Head to the <a href="https://appinterviewready.top/download" target="_blank" rel="noopener noreferrer" style="color:#1A4F8A; font-weight:700;">downloads page</a> and enter your priority waitlist access code. That unlocks a secure 15-minute download session for the v2 app.</div>
          </div>
          <div class="step-row">
            <div class="step-num">2.</div>
            <div class="step-desc"><strong>Install:</strong> Open the downloaded file. If Android shows a &ldquo;File might be harmful&rdquo; prompt, tap <strong>Download anyway</strong>, then enable &ldquo;Allow from this source&rdquo; if asked.</div>
          </div>
          <div class="step-row">
            <div class="step-num">3.</div>
            <div class="step-desc"><strong>Redeem:</strong> Launch the app and enter promo code <strong>COMMUNITY30</strong> to unlock your bonus AI credits.</div>
          </div>
        </div>

        <div class="btn-container">
          <a href="https://appinterviewready.top/download" class="btn-primary" target="_blank" rel="noopener noreferrer">
            Download Android v2
          </a>
        </div>

        <div class="promo-card">
          <p class="promo-title">Your Community Perk</p>
          <span class="promo-code">COMMUNITY30</span>
          <p class="promo-desc">Install v2, open the app, and enter the code above,<br>your bonus AI credits will be waiting.</p>
        </div>

        <div class="tip-card">
          <strong>Quick download tip:</strong> Chrome can be stubborn with direct APK links: Samsung Internet, Firefox, Brave, Opera, or Edge work best.
        </div>

        <div class="retry-card">
          <strong>Security prompt during install?</strong> It's standard Android caution for direct APK installs. Tap <strong>Download anyway</strong> or allow installation from your browser to continue. <a href="https://appinterviewready.top/download" target="_blank" rel="noopener noreferrer">Retry your download here</a>.
        </div>

        <p class="lead-text" style="margin: 24px 0 0;">
          Thank you for being first through the door. We built v2 for you.
        </p>
      </div>

      <div class="footer">
        <p><strong>Warmly,</strong><br>The Interview Ready Team</p>
        <p>Questions? Just hit reply, or email us at <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p style="margin-top: 12px;">You're receiving this because you joined the Interview Ready early-access list.<br>&copy; 2026 Interview Ready. All rights reserved.</p>
        <p style="margin-top: 10px;"><a href="https://www.linkedin.com/company/interview-ready-app" target="_blank" rel="noopener noreferrer">Follow us on LinkedIn</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateV2LaunchEmailText(waitlistSpot?: number | string): string {
  const spotDisplay = safeSpotDisplay(waitlistSpot);
  return [
    'YOU WERE HERE FIRST — MEET ANDROID V2',
    'The all-new Interview Ready app is officially live for our early-access community.',
    '',
    'Hello,',
    '',
    `Before anyone else, you believed in Interview Ready${spotDisplay ? ` (early-access member ${spotDisplay})` : ''}. Today that early faith pays off: version 2 of our Android app is ready for you — rebuilt around the tools that get you hired, from ATS-tested resume bullets to voice AI mock interviews with instant confidence and pacing breakdowns.`,
    '',
    'YOUR 3-STEP EARLY ACCESS',
    '',
    '1. DOWNLOAD — Head to https://appinterviewready.top/download and enter your priority waitlist access code. That unlocks a secure 15-minute download session for the v2 app.',
    '',
    '2. INSTALL — Open the downloaded file. If Android shows a "File might be harmful" prompt, tap Download anyway — then enable "Allow from this source" if asked.',
    '',
    '3. REDEEM — Launch the app and enter promo code COMMUNITY30 to unlock your bonus AI credits.',
    '',
    '>> [ DOWNLOAD ANDROID V2 ]',
    '   https://appinterviewready.top/download',
    '',
    '-----------------------------------------------------',
    ' YOUR COMMUNITY PERK',
    '',
    '   C O M M U N I T Y 3 0',
    '',
    ' Install v2, open the app, and enter the code above —',
    ' your bonus AI credits will be waiting.',
    '-----------------------------------------------------',
    '',
    'QUICK DOWNLOAD TIP',
    'Chrome can be stubborn with direct APK links — Samsung Internet, Firefox, Brave, Opera, or Edge work best.',
    '',
    'SECURITY PROMPT DURING INSTALL?',
    'It\'s standard Android caution for direct APK installs — tap "Download anyway" / allow installation from your browser to continue.',
    'Retry: https://appinterviewready.top/download',
    '',
    'Thank you for being first through the door. We built v2 for you.',
    '',
    'Warmly,',
    'The Interview Ready Team',
    'Questions? Just hit reply — info@appinterviewready.top',
    '',
    'You\'re receiving this because you joined the Interview Ready early-access list.',
    '© 2026 Interview Ready. All rights reserved.',
    '',
    'Follow us on LinkedIn:',
    'https://www.linkedin.com/company/interview-ready-app',
  ].join('\n');
}

async function sendV2LaunchEmail(toEmail: string, waitlistSpot?: number | string): Promise<V2EmailResult> {
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
      subject: `Android v2 is here — you're first in line`,
      text: generateV2LaunchEmailText(waitlistSpot),
      html: generateV2LaunchEmailHtml(waitlistSpot),
      replyTo: 'info@appinterviewready.top',
    });

    return { sent: true };
  } catch (smtpError: any) {
    console.error('[V2 Launch Email] SMTP send failed:', smtpError?.message || smtpError);
    return { sent: false, error: smtpError?.message || 'SMTP error' };
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const apiKey = envClean('AIRTABLE_API_KEY') || envClean('AIRTABLE_PAT');
  const baseId = BASE_OVERRIDE || envClean('AIRTABLE_BASE_ID');
  const tableName = TABLE_OVERRIDE || envClean('AIRTABLE_TABLE_NAME') || 'Submissions';

  if (!apiKey || !baseId) {
    console.error('Missing AIRTABLE_API_KEY / AIRTABLE_BASE_ID in .env — aborting.');
    process.exit(1);
  }

  console.log(`Querying Airtable base ${baseId} table "${tableName}" for every record without V2 Sent...`);
  const records = await fetchV2PendingRecords(apiKey, baseId, tableName);

  const valid = records.filter(r => isValidRecipientEmail(String(r.fields?.['Email'] ?? '')));
  const invalid = records.length - valid.length;
  const batch = LIMIT > 0 ? valid.slice(0, LIMIT) : valid;

  console.log('');
  console.log(`Found ${records.length} record(s) pending v2 launch${LIMIT > 0 ? `, processing first ${batch.length}` : ''}.`);
  console.log(`  Valid recipients:   ${valid.length}`);
  console.log(`  Invalid/missing:    ${invalid}`);
  console.log('');

  if (!DO_SEND) {
    console.log('DRY RUN — no emails will be sent. Recipients:');
    for (const r of batch) {
      const email = String(r.fields?.['Email'] ?? '(no email)');
      const spot = r.fields?.['Waitlist Spot'];
      const ok = isValidRecipientEmail(email);
      console.log(`  ${ok ? 'OK ' : 'BAD'} ${email.padEnd(34)} spot=${spot ?? '-'}`);
    }
    console.log('');
    console.log('Re-run with --send to deliver. Add --limit N to trial a small batch first.');
    return;
  }

  console.log(`SEND MODE — delivering to ${batch.length} recipient(s), ${DELAY_MS}ms pacing.`);
  let sent = 0;
  let failed = 0;
  let flagged = 0;

  for (const [i, r] of batch.entries()) {
    const email = String(r.fields['Email']);
    const spot = r.fields?.['Waitlist Spot'] as number | string | undefined;
    process.stdout.write(`[${i + 1}/${valid.length}] ${email} ... `);

    const result = await sendV2LaunchEmail(email, spot);
    if (!result.sent) {
      failed++;
      console.log(`FAILED (${result.error})`);
      continue;
    }
    sent++;
    const okFlag = await markV2Sent(apiKey, baseId, tableName, r.id);
    if (okFlag) flagged++;
    console.log(okFlag ? 'sent + flagged' : 'sent (flag write failed - may resend on re-run)');
    if (i < batch.length - 1) await sleep(DELAY_MS);
  }

  console.log('');
  console.log(`Done. sent=${sent} failed=${failed} flagged=${flagged}, skipped=${invalid} invalid.`);
  if (failed > 0) process.exit(2);
}

main().catch(err => {
  console.error('V2 launch send aborted:', err?.message || err);
  process.exit(1);
});
