import { CoverLetter } from '../types/schemas';
import { formatPersonName } from './exportUtils';

function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCoverLetterHTML(cl: CoverLetter): string {
  const h = cl.header || ({} as any);
  const p = cl.paragraphs || ({} as any);

  const candidateName = formatPersonName(h.candidate_name || '');
  const hiringManager = formatPersonName(h.hiring_manager || '');
  const signOffName = formatPersonName(cl.sign_off?.name || h.candidate_name || '');

  const contactParts = [
    h.phone,
    h.email,
    h.linkedin,
    h.portfolio,
    h.location,
  ]
    .map(val => (val ? String(val).trim() : ''))
    .filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${esc(candidateName || 'Cover Letter')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 20mm 18mm; }
    @media screen {
      body { padding: 36px 28px; max-width: 780px; margin: 0 auto; background: #f8fafc; }
      .page { background: #ffffff; padding: 44px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #1e293b;
      line-height: 1.65;
      -webkit-print-color-adjust: exact;
    }
    .page { width: 100%; }
    .name {
      font-size: 26px;
      font-weight: 800;
      color: #2563EB;
      letter-spacing: -0.4px;
      margin-bottom: 3px;
      line-height: 1.2;
    }
    .role {
      font-size: 13.5px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 6px;
    }
    .contact {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 12px;
      font-weight: 500;
    }
    .divider {
      border: none;
      border-top: 2px solid #2563EB;
      margin: 10px 0 18px 0;
    }
    .date {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 16px;
      font-weight: 500;
    }
    .recip {
      font-size: 12.5px;
      line-height: 1.55;
      margin-bottom: 20px;
      color: #334155;
    }
    .recip-name {
      font-weight: 700;
      color: #0f172a;
    }
    .salutation {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 14px;
    }
    .para {
      font-size: 12.8px;
      margin-bottom: 14px;
      white-space: pre-wrap;
      color: #334155;
      line-height: 1.68;
    }
    .signoff {
      font-size: 13px;
      color: #334155;
      margin-top: 22px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .signname {
      font-size: 14px;
      font-weight: 700;
      color: #2563EB;
      margin-top: 4px;
    }
    .footer {
      font-size: 10.5px;
      color: #94a3b8;
      margin-top: 26px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    <div class="name">${esc(candidateName)}</div>
    ${h.target_role ? `<div class="role">${esc(h.target_role)}</div>` : ''}
    ${contactParts.length > 0 ? `<div class="contact">${contactParts.map(esc).join(' &nbsp;•&nbsp; ')}</div>` : ''}
    <hr class="divider">

    <!-- DATE & RECIPIENT -->
    ${h.date ? `<div class="date">${esc(h.date)}</div>` : ''}
    <div class="recip">
      ${hiringManager ? `<div class="recip-name">${esc(hiringManager)}</div>` : ''}
      ${h.company_name ? `<div><strong>${esc(h.company_name)}</strong></div>` : ''}
      ${h.company_address ? `<div>${esc(h.company_address)}</div>` : ''}
    </div>

    <!-- SALUTATION -->
    ${cl.salutation ? `<div class="salutation">${esc(cl.salutation)}</div>` : ''}

    <!-- BODY PARAGRAPHS -->
    ${p.opening?.text ? `<div class="para">${esc(p.opening.text)}</div>` : ''}
    ${p.body_1?.text ? `<div class="para">${esc(p.body_1.text)}</div>` : ''}
    ${p.body_2?.text ? `<div class="para">${esc(p.body_2.text)}</div>` : ''}
    ${p.closing?.text ? `<div class="para">${esc(p.closing.text)}</div>` : ''}

    <!-- SIGN-OFF -->
    <div class="signoff">
      <div>${esc(cl.sign_off?.closing_phrase || 'Sincerely,')}</div>
      <div class="signname">${esc(signOffName)}</div>
    </div>

    <div class="footer">
      Generated via Interview Ready • https://appinterviewready.top
    </div>
  </div>
</body>
</html>`;
}
