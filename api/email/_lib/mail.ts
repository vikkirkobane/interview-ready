/**
 * Shared email shell + Resend send for the InterviewReady lifecycle emails.
 *
 * This repo sends exclusively through Resend (RESEND_API_KEY). The legacy
 * Spaceship SMTP channel was spam-flagged (550 JFE040000) and is not used
 * here.
 */

export interface MailSendResult {
  sent: boolean;
  error?: string;
}

function cleanHeader(value: string): string {
  return (value || '')
    .replace(/[\r\n\t\0\x0B\x0C]/g, '')
    .replace(/%0[aAdD]/gi, '')
    .trim();
}

export function senderAddress(): string {
  // From domain must be the verified Resend subdomain.
  return (
    process.env.RESEND_FROM_EMAIL ||
    '"Interview Ready" <welcome@noreply.appinterviewready.top>'
  );
}

function resendConfigured(): boolean {
  return Boolean((process.env.RESEND_API_KEY || '').trim());
}

export async function sendViaResend(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<MailSendResult> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const payload = {
    from: senderAddress(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    reply_to: process.env.SUPPORT_REPLY_TO_EMAIL
      ? cleanHeader(process.env.SUPPORT_REPLY_TO_EMAIL)
      : 'info@appinterviewready.top',
  };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[Email] Resend send failed:', res.status, body?.message || body);
    return { sent: false, error: body?.message || `Resend HTTP ${res.status}` };
  }
  return { sent: true };
}

const BRAND = {
  navy: '#1A4F8A',
  navyDark: '#123761',
  sky: '#0EA5E9',
  bg: '#F9FAFB',
  ink: '#0D1117',
  body: '#4B5563',
  border: '#E5E7EB',
  tipBg: '#EFF6FF',
  tipBorder: '#BFDBFE',
  tipInk: '#1E40AF',
};

/**
 * Single shared, table-based email shell (Outlook-safe), brand-matched to the
 * existing welcome email and the appinterviewready.top site.
 */
export function buildEmailShell(opts: {
  preheader: string;
  kicker?: string; // small uppercase label above the headline
  headline: string;
  subhead?: string;
  bodyHtml: string; // already includes the CTA block if needed
  footerNote?: string;
  unsubscribeUrl?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${cleanHeader(opts.headline)}</title>
<style>
  body{margin:0;padding:0;background-color:${BRAND.bg};font-family:'Sora','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};line-height:1.6;-webkit-font-smoothing:antialiased;}
  .preheader{display:none;max-height:0;overflow:hidden;mso-hide:all;}
  .kicker{display:inline-block;background:#EFF6FF;color:${BRAND.navy};font-weight:800;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;padding:5px 14px;border-radius:999px;margin-bottom:16px;}
  h1{margin:0;font-size:26px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;line-height:1.2;}
  .subhead{margin:10px 0 0;color:#DBEAFE;font-size:14px;font-weight:400;}
  h2{font-size:16px;font-weight:800;color:${BRAND.ink};margin:22px 0 8px;}
  p{margin:0 0 14px;}
  ul{margin:0 0 16px;padding-left:20px;}
  li{margin-bottom:6px;}
  .lead{font-size:14px;color:${BRAND.body};line-height:1.65;}
  .tip{background:${BRAND.tipBg};border:1px solid ${BRAND.tipBorder};border-radius:12px;padding:14px 16px;margin:18px 0;font-size:13px;color:${BRAND.tipInk};line-height:1.55;}
  .btn-row{text-align:center;margin:28px 0 6px;}
  .btn{display:inline-block;background-color:${BRAND.navy};color:#FFFFFF !important;font-weight:700;font-size:14px;letter-spacing:0.3px;text-decoration:none;padding:14px 30px;border-radius:12px;}
  .alt{margin-top:18px;text-align:center;}
  .alt a{color:${BRAND.body};font-size:12px;text-decoration:underline;}
  .footer-note{font-size:12px;color:${BRAND.body};line-height:1.55;margin:18px 0 0;}
</style>
</head>
<body bgcolor="${BRAND.bg}">
  <div class="preheader">${cleanHeader(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.bg}">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};">
        <tr>
          <td bgcolor="${BRAND.navy}" style="background-color:${BRAND.navy};background-image:linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyDark} 100%);padding:38px 32px 30px;text-align:center;">
            <div style="display:inline-block;background:#EFF6FF;color:${BRAND.navy};font-weight:800;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;padding:5px 14px;border-radius:999px;margin-bottom:14px;">Interview Ready</div>
            <h1>${opts.headline}</h1>
            ${opts.subhead ? `<p class="subhead">${opts.subhead}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:32px;background:#FFFFFF;">
            ${opts.bodyHtml}
          </td>
        </tr>
        <tr>
          <td bgcolor="${BRAND.navy}" style="padding:22px 32px;text-align:center;">
            <p style="margin:2px 0;font-size:12px;color:#DBEAFE;">&copy; 2026 Interview Ready. Built for ambitious professionals.</p>
            <p style="margin:2px 0;font-size:12px;color:#DBEAFE;">Questions? Reply to this email or write to <a href="mailto:info@appinterviewready.top" style="color:#7DD3FC;text-decoration:underline;">info@appinterviewready.top</a></p>
            ${opts.unsubscribeUrl ? `<p style="margin:8px 0 0;font-size:11px;color:#BFDBFE;"><a href="${opts.unsubscribeUrl}" style="color:#BFDBFE;text-decoration:underline;">Unsubscribe from career emails</a></p>` : ''}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function ctaBlock(url: string, label: string): string {
  return `<div class="btn-row">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr><td bgcolor="${BRAND.navy}" style="border-radius:12px;">
      <a href="${url}" class="btn" target="_blank" rel="noopener noreferrer">${label}</a>
    </td></tr>
  </table>
</div>`;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<MailSendResult> {
  // Resend only: RESEND_API_KEY is required in this environment. The legacy
  // Spacemail/Spaceship channel is not wired here (spam-flagged since Sep 2026).
  if (!resendConfigured()) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }
  return sendViaResend(opts);
}
