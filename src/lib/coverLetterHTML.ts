import { CoverLetter } from '../types/schemas';

export function buildCoverLetterHTML(cl: CoverLetter): string {
  const h = cl.header || ({} as any);
  const p = cl.paragraphs || ({} as any);

  const contactParts = [h.phone, h.email, h.linkedin, h.portfolio].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${h.candidate_name} Cover Letter</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    @page { size: A4; margin: 48pt 56pt; }
    @media screen { body { padding: 48px 40px; max-width: 750px; margin: 0 auto; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
           font-size: 12.7px; color: #1A1A1A; line-height: 1.55;
           -webkit-print-color-adjust: exact; }
    .name    { font-size: 34.7px; font-weight: 700; color: #1A3A5C; margin-bottom: 4px; }
    .role    { font-size: 12px; font-weight: 600; color: #1A3A5C; margin-bottom: 2px; }
    .contact { font-size: 10.7px; color: #555555; margin-bottom: 0; }
    hr       { border: none; border-top: 0.75pt solid #1A3A5C; margin: 12pt 0; }
    .date    { font-size: 12px; margin-bottom: 4pt; }
    .recip   { font-size: 12px; line-height: 1.7; }
    .recip-name    { font-weight: 700; }
    .salutation    { font-size: 12px; font-weight: 700;
                     margin-top: 16pt; margin-bottom: 14pt; }
    .para    { font-size: 12.7px; margin-bottom: 14pt; white-space: pre-wrap; }
    .signoff { font-size: 12.7px; margin-top: 20pt; }
    .signname{ font-size: 13.3px; font-weight: 700; color: #1A3A5C; margin-top: 4pt; }
    .footer  { font-size: 10.7px; color: #555555; margin-top: 24pt;
               border-top: 0.5pt solid #DDDDDD; padding-top: 8pt; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="name">${h.candidate_name}</div>
  <div class="contact">${contactParts.join(' &nbsp;·&nbsp; ')}</div>
  <hr>

  <!-- DATE & RECIPIENT -->
  <div class="date">${h.date}</div>
  <div class="recip" style="margin-top:12pt;">
    ${h.hiring_manager
      ? `<div class="recip-name">${h.hiring_manager}</div>` : ''}
    <div><strong>${h.company_name}</strong></div>
    ${h.company_address
      ? `<div>${h.company_address}</div>` : ''}
  </div>

  <!-- SALUTATION -->
  <div class="salutation">${cl.salutation}</div>

  <!-- BODY PARAGRAPHS -->
  <div class="para">${p.opening?.text || ''}</div>
  <div class="para">${p.body_1?.text || ''}</div>
  <div class="para">${p.body_2?.text || ''}</div>
  <div class="para">${p.closing?.text || ''}</div>

  <!-- SIGN-OFF -->
  <div class="signoff">${cl.sign_off?.closing_phrase || ''}</div>
  <div class="signname">${cl.sign_off?.name || ''}</div>

  <!-- OPTIONAL FOOTER -->
  <div class="footer">${contactParts.join(' &nbsp;·&nbsp; ')}</div>

</body>
</html>`;
}
