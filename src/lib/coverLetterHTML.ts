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
    @page { size: A4 portrait; margin: 18mm 20mm 16mm 20mm; }
    @media screen {
      body { padding: 36px 28px; max-width: 800px; margin: 0 auto; background: #f8fafc; }
      .page { background: #ffffff; padding: 44px 48px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12.4px;
      color: #1e293b;
      line-height: 1.62;
      -webkit-print-color-adjust: exact;
    }
    .page { width: 100%; }
    .name {
      font-size: 24px;
      font-weight: 800;
      color: #1E3A8A;
      letter-spacing: -0.4px;
      margin-bottom: 2px;
      line-height: 1.2;
    }
    .role {
      font-size: 13px;
      font-weight: 600;
      color: #3B82F6;
      margin-bottom: 4px;
    }
    .contact {
      font-size: 10.5px;
      color: #64748b;
      margin-bottom: 10px;
      font-weight: 500;
    }
    .divider {
      border: none;
      border-top: 2px solid #2563EB;
      margin: 8px 0 16px 0;
    }
    .date {
      font-size: 11.5px;
      color: #64748b;
      margin-bottom: 14px;
      font-weight: 500;
    }
    .recip {
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 16px;
      color: #334155;
    }
    .recip-name {
      font-weight: 700;
      color: #0f172a;
    }
    .salutation {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .para {
      font-size: 12.2px;
      margin-bottom: 12px;
      white-space: pre-wrap;
      color: #334155;
      line-height: 1.62;
      text-align: justify;
      text-justify: inter-word;
    }
    .signoff {
      font-size: 12.5px;
      color: #334155;
      margin-top: 18px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .signname {
      font-size: 13.5px;
      font-weight: 700;
      color: #1E3A8A;
      margin-top: 4px;
    }
    .footer {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 22px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
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
