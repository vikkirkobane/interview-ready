import { Platform } from 'react-native';
import { APP_LOGO_DATA_URI } from './brandAssets';
import { buildFileName, renameToCache } from './exportUtils';

declare let window: any;

let printToFileAsync: any;
let shareAsync: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Print = require('expo-print');
  printToFileAsync = Print.printToFileAsync;
} catch {
  // Ignore
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sharing = require('expo-sharing');
  shareAsync = Sharing.shareAsync;
} catch {
  // Ignore
}

export interface LinkedInExportContext {
  candidateName?: string;
  targetRoles?: string[];
  targetCompanies?: string[];
}

export async function exportLinkedInAnalysisPDF(
  analysis: any,
  context: LinkedInExportContext = {}
): Promise<void> {
  const html = buildLinkedInAnalysisHTML(analysis, context);
  const filename = buildFileName(context.candidateName, 'LinkedIn_Optimization_Report', 'pdf');

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.document.title = filename;
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  } else {
    if (!printToFileAsync || !shareAsync) {
      throw new Error('PDF export requires expo-print and expo-sharing.');
    }
    const { uri } = await printToFileAsync({ html });
    const namedUri = await renameToCache(uri, filename);
    await shareAsync(namedUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: `Download ${filename}` });
  }
}

function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleCase(value: string): string {
  const s = String(value || '').trim();
  if (!s) return '';
  const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs']);
  return s
    .split(/\s+/)
    .map((word, i) => {
      const clean = word.toLowerCase();
      if (i > 0 && smallWords.has(clean)) return clean;
      return clean.replace(/(^|[-/.(])([a-z])/g, (m, p1, c) => p1 + c.toUpperCase());
    })
    .join(' ');
}

const SECTION_LABELS: Record<string, string> = {
  headline: 'Headline Optimization',
  about: 'About / Summary Section',
  experience: 'Experience & Impact Bullets',
  skills: 'Skills & Endorsements',
};

const CATEGORY_LABELS: Record<string, string> = {
  hard_skill: 'Hard Skill',
  soft_skill: 'Soft Skill',
  tool: 'Tool / Technology',
  methodology: 'Methodology',
  certification: 'Certification',
  industry_term: 'Industry Term',
};

function buildLinkedInAnalysisHTML(analysis: any, context: LinkedInExportContext = {}): string {
  if (!analysis) {
    return `<!DOCTYPE html><html><body><h1>No data</h1></body></html>`;
  }

  const candidateName = titleCase(context.candidateName || '');
  const targetRoles = Array.isArray(context.targetRoles) ? context.targetRoles : [];
  const targetCompanies = Array.isArray(context.targetCompanies) ? context.targetCompanies : [];
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const overall = Math.round(analysis.overall_score ?? 0);
  const projected = Math.round(analysis.estimated_score_after_optimization ?? 0);
  const scores = analysis.section_scores || {};
  const issues = analysis.issues || {};
  const kwi = analysis.keyword_intelligence || {};
  const spike = analysis.spike;
  const suggestions = analysis.suggestions || {};

  const sectionScoreBars = ['headline', 'about', 'experience', 'skills'].map(key => {
    const score = Math.round(scores[key] ?? 0);
    const color = score >= 80 ? '#16A34A' : score >= 60 ? '#0A66C2' : '#F59E0B';
    return `
      <div class="dimension-row">
        <div class="dimension-label">${esc(SECTION_LABELS[key] || titleCase(key))}</div>
        <div class="dimension-bar-bg">
          <div class="dimension-bar-fill" style="width: ${score}%; background: ${color};"></div>
        </div>
        <div class="dimension-value">${score}/100</div>
      </div>
    `;
  }).join('');

  const issuesBlocks = ['headline', 'about', 'experience', 'skills'].map(key => {
    const list = Array.isArray(issues[key]) ? issues[key] : [];
    if (list.length === 0) return '';
    return `
      <div class="section">
        <div class="section-title">${esc(SECTION_LABELS[key] || titleCase(key))} Issues</div>
        <ul class="list">${list.map((item: string) => `<li>${esc(item)}</li>`).join('')}</ul>
      </div>
    `;
  }).join('');

  const suggestionsHtml = `
    <div class="section">
      <div class="section-title">Recommended Profile Fixes</div>
      ${(suggestions.headline || suggestions.about || (Array.isArray(suggestions.experience_bullets) && suggestions.experience_bullets.length > 0)) ? `
        ${suggestions.headline ? `<p style="margin-bottom: 6px;"><strong>Optimized Headline:</strong> ${esc(suggestions.headline)}</p>` : ''}
        ${suggestions.about ? `<p style="margin-bottom: 6px;"><strong>Optimized About:</strong> ${esc(suggestions.about)}</p>` : ''}
        ${Array.isArray(suggestions.experience_bullets) && suggestions.experience_bullets.length > 0 ? `
          <p><strong>Optimized Experience Bullets:</strong></p>
          <ul class="list">${suggestions.experience_bullets.map((b: string) => `<li>${esc(b)}</li>`).join('')}</ul>
        ` : ''}
      ` : '<p class="text-muted">No recommendations recorded.</p>'}
    </div>
  `;

  const keywords = Array.isArray(kwi.top_keywords) ? kwi.top_keywords : [];
  const keywordRows = keywords.map((kw: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(kw.keyword || '')}</strong></td>
      <td><span class="cat-tag">${esc(CATEGORY_LABELS[kw.category] || esc(kw.category || ''))}</span></td>
      <td class="${kw.present_in_profile ? 'present' : 'absent'}">${kw.present_in_profile ? '✓ In Profile' : '✗ Missing'}</td>
    </tr>
  `).join('');

  const missingKeywords = Array.isArray(kwi.missing_high_priority) ? kwi.missing_high_priority : [];
  const missingBlock = missingKeywords.length > 0 ? `
    <div class="section">
      <div class="section-title">Missing High-Priority Keywords</div>
      <div class="pill-row">
        ${missingKeywords.map((k: string) => `<span class="pill warn">${esc(k)}</span>`).join('')}
      </div>
    </div>
  ` : '';

  const spikeBlock = spike && (spike.identified_differentiator || spike.unique_value_proposition) ? `
    <div class="spike">
      <div class="spike-title">✨ Unique Differentiator (Spike)</div>
      ${spike.identified_differentiator ? `<div class="spike-diff">${esc(spike.identified_differentiator)}</div>` : ''}
      ${spike.unique_value_proposition ? `<div class="spike-uvp">${esc(spike.unique_value_proposition)}</div>` : ''}
    </div>
  ` : '';

  const subjectParts = [
    targetRoles.length > 0 ? targetRoles.join(', ') : '',
    targetCompanies.length > 0 ? targetCompanies.join(', ') : '',
  ].filter(Boolean);
  const subjectLine = subjectParts.join(' • ');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LinkedIn Report - ${esc(candidateName || 'Profile Analysis')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 16mm 14mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: #0f172a;
      line-height: 1.55;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
    }
    .header {
      display: flex;
      align-items: center;
      border-bottom: 2px solid #6B46FE;
      padding-bottom: 14px;
      margin-bottom: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .logo { width: 44px; height: 46px; margin-right: 14px; object-fit: contain; }
    .header-title { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .header-subtitle { font-size: 12px; color: #64748b; font-weight: 500; }

    .title-section {
      text-align: center;
      margin-bottom: 22px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .badge-pill {
      display: inline-block;
      background: #f3f0ff;
      color: #6B46FE;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }
    .main-title { font-size: 24px; font-weight: 800; color: #0A66C2; margin-bottom: 6px; }
    .meta-line { font-size: 13px; color: #334155; font-weight: 600; margin: 2px 0; }
    .date-line { font-size: 12px; color: #64748b; }

    .score-card {
      display: flex;
      align-items: center;
      gap: 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 24px;
      margin-bottom: 22px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .score-ring {
      width: 90px; height: 90px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: conic-gradient(#0A66C2 ${overall}%, #E8F0F8 ${overall}% 100%);
      box-shadow: 0 4px 12px rgba(10, 102, 194, 0.15);
    }
    .score-ring-inner {
      width: 72px; height: 72px; border-radius: 50%;
      background: #fff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .score-num { font-size: 24px; font-weight: 800; color: #0f172a; }
    .score-cap { font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #64748b; }
    .score-text h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .projected { color: #16A34A; font-weight: 700; font-size: 13px; margin-top: 4px; }

    .spike {
      background: #eaf2fb;
      border-left: 4px solid #0A66C2;
      padding: 14px 16px;
      margin-bottom: 20px;
      border-radius: 0 10px 10px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .spike-title { font-weight: 800; color: #0A66C2; margin-bottom: 6px; font-size: 14px; }
    .spike-diff { font-weight: 700; color: #0f172a; font-size: 13px; }
    .spike-uvp { color: #334155; margin-top: 4px; font-size: 12.5px; }

    .section {
      margin-bottom: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 14.5px;
      font-weight: 800;
      color: #0A66C2;
      border-left: 4px solid #0A66C2;
      padding-left: 10px;
      margin-bottom: 10px;
    }

    .dimension-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .dimension-label { width: 150px; font-weight: 600; color: #334155; font-size: 12px; }
    .dimension-bar-bg { flex: 1; height: 10px; border-radius: 5px; background: #e8f0f8; overflow: hidden; }
    .dimension-bar-fill { height: 100%; border-radius: 5px; background: #0A66C2; }
    .dimension-value { width: 52px; text-align: right; font-weight: 700; color: #0f172a; font-size: 12px; }

    p { color: #334155; font-size: 12.5px; line-height: 1.6; }
    p strong { color: #0f172a; }
    .text-muted { color: #94a3b8; font-size: 12px; }

    .list { padding-left: 18px; margin: 0; color: #334155; font-size: 12.5px; }
    .list li { margin-bottom: 5px; line-height: 1.5; }

    table.keywords { width: 100%; border-collapse: collapse; margin-top: 6px; }
    table.keywords th {
      text-align: left; font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px;
      text-transform: uppercase; color: #64748b;
      border-bottom: 1px solid #e2e8f0; padding: 6px 8px;
    }
    table.keywords td { font-size: 12px; color: #334155; border-bottom: 1px solid #f1f5f9; padding: 8px; }
    table.keywords tr:last-child td { border-bottom: none; }
    .present { color: #16A34A; font-weight: 700; }
    .absent { color: #DC2626; font-weight: 700; }
    .cat-tag {
      display: inline-block; font-size: 10.5px; font-weight: 700;
      background: #eaf2fb; color: #0A66C2; border-radius: 999px; padding: 2px 8px;
    }

    .pill-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill {
      display: inline-block; font-size: 11.5px; font-weight: 600;
      background: #fefce8; color: #b45309; border: 1px solid #fde68a;
      border-radius: 999px; padding: 3px 10px;
    }

    .footer {
      margin-top: 28px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${APP_LOGO_DATA_URI}" alt="Interview Ready Logo" />
    <div>
      <h1 class="header-title">Interview Ready</h1>
      <p class="header-subtitle">LinkedIn Profile Optimization Report • appinterviewready.top</p>
    </div>
  </div>

  <div class="title-section">
    <div class="badge-pill">LINKEDIN PROFILE INTELLIGENCE</div>
    <h2 class="main-title">LinkedIn Profile Optimization Report</h2>
    ${candidateName ? `<p class="meta-line">Prepared for <strong>${esc(candidateName)}</strong></p>` : ''}
    ${subjectLine ? `<p class="meta-line">${esc(subjectLine)}</p>` : ''}
    <p class="date-line">Prepared on ${today}</p>
  </div>

  <div class="score-card">
    <div class="score-ring">
      <div class="score-ring-inner">
        <span class="score-num">${overall}</span>
        <span class="score-cap">SCORE</span>
      </div>
    </div>
    <div class="score-text">
      <h2>Overall Profile Score</h2>
      <p style="color: #64748b; font-size: 12.5px;">Projected score after optimization: <span class="projected">${projected}/100</span></p>
    </div>
  </div>

  ${spikeBlock}

  <div class="section">
    <h3 class="section-title">Section Scores</h3>
    ${sectionScoreBars}
  </div>

  ${issuesBlocks}

  ${suggestionsHtml}

  <div class="section">
    <h3 class="section-title">Keyword Intelligence</h3>
    ${keywords.length > 0 ? `
      <table class="keywords">
        <thead>
          <tr>
            <th>#</th>
            <th>Keyword</th>
            <th>Category</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${keywordRows}</tbody>
      </table>
    ` : '<p class="text-muted">No keyword data available.</p>'}
  </div>

  ${missingBlock}

  <div class="footer">
    Generated by Interview Ready AI • https://appinterviewready.top • Confidential
  </div>
</body>
</html>`;
}

// Exported for testability only (not part of the public API).
export { buildLinkedInAnalysisHTML };
