import { Platform } from 'react-native';
import { CompanyResearchResult } from '../hooks/useApi';
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

export async function exportCompanyResearchPDF(result: CompanyResearchResult): Promise<void> {
  const html = buildCompanyResearchHTML(result);
  const filename = buildFileName(result.company_name, 'Company_Research', 'pdf');

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
    await shareAsync(namedUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Download ${filename}` });
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

function fact(label: string, value?: string): string {
  return `<div class="fact-item">
    <div class="fact-label">${esc(label)}</div>
    <div class="fact-value">${esc(value || 'Not available')}</div>
  </div>`;
}

function buildCompanyResearchHTML(data: CompanyResearchResult): string {
  if (!data) {
    return `<!DOCTYPE html><html><body><h1>No data</h1></body></html>`;
  }

  const companyName = titleCase(data.company_name || 'Company');
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const renderList = (items: string[] | undefined) => {
    if (!items || items.length === 0) return '<p class="text-muted">Not available</p>';
    return `<ul class="list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
  };

  const renderNews = (news: { headline: string; summary: string }[] | undefined) => {
    if (!news || news.length === 0) return '<p class="text-muted">No recent news available.</p>';
    return `<div class="news-list">
      ${news.map(item => `
        <div class="news-item">
          <div class="news-headline">${esc(item.headline)}</div>
          <div class="news-summary">${esc(item.summary)}</div>
        </div>
      `).join('')}
    </div>`;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${esc(companyName)} - Company Research Report</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        @page { size: A4; margin: 18mm 16mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1A1A1A;
          background: #ffffff;
          line-height: 1.55;
          font-size: 12.5px;
          -webkit-print-color-adjust: exact;
        }

        .header {
          display: flex;
          align-items: center;
          border-bottom: 2px solid #6B46FE;
          padding-bottom: 14px;
          margin-bottom: 22px;
        }
        .logo { width: 44px; height: 46px; margin-right: 14px; object-fit: contain; }
        .header-title { font-size: 22px; font-weight: 800; color: #1A1A1A; }
        .header-subtitle { font-size: 12px; color: #6B7280; }

        .title-section { text-align: center; margin-bottom: 22px; }
        .main-title { font-size: 26px; font-weight: 800; color: #6B46FE; margin-bottom: 6px; }
        .tagline { font-size: 14px; color: #4B5563; font-style: italic; margin-bottom: 6px; }
        .date-line { font-size: 12px; color: #6B7280; }

        .scores-section { display: flex; gap: 16px; margin-bottom: 24px; }
        .score-card {
          flex: 1;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .score-card .score-title { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #6B7280; text-transform: uppercase; margin-bottom: 6px; }
        .score-card .score-value { font-size: 26px; color: #6B46FE; font-weight: 800; }

        .section { margin-bottom: 26px; page-break-inside: avoid; }
        .section-title {
          font-size: 15px;
          font-weight: 800;
          color: #6B46FE;
          border-left: 4px solid #6B46FE;
          padding-left: 10px;
          margin-bottom: 12px;
        }

        .verdict {
          background: #F5F3FF;
          border-left: 4px solid #6B46FE;
          padding: 16px;
          margin-bottom: 24px;
          border-radius: 0 10px 10px 0;
        }
        .verdict-title { font-weight: 800; color: #6B46FE; margin-bottom: 8px; font-size: 15px; }

        .fact-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 6px; }
        .fact-item {
          flex: 1 1 45%;
          background: #F9FAFB;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
        }
        .fact-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .fact-value { font-size: 13.5px; font-weight: 600; color: #111827; }

        p { color: #374151; font-size: 13px; line-height: 1.65; }
        .text-muted { color: #9CA3AF; font-size: 13px; }

        .list { padding-left: 20px; margin: 0; color: #374151; font-size: 13px; }
        .list li { margin-bottom: 7px; line-height: 1.55; }

        .two-col { display: flex; gap: 14px; }
        .two-col > div { flex: 1; }
        .sub-label { font-weight: 700; color: #111827; font-size: 13px; margin-bottom: 6px; display: block; }

        .news-item { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #E5E7EB; }
        .news-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .news-headline { font-weight: 700; font-size: 13.5px; color: #111827; margin-bottom: 4px; }
        .news-summary { font-size: 12.5px; color: #4B5563; }

        .red-flags { background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 24px; border-radius: 0 10px 10px 0; }
        .red-flags .section-title { color: #B45309; border-color: #F59E0B; }

        .footer {
          margin-top: 28px;
          text-align: center;
          font-size: 11px;
          color: #9CA3AF;
          border-top: 1px solid #E5E7EB;
          padding-top: 12px;
        }
      </style>
    </head>
    <body>

      <div class="header">
        <img class="logo" src="${APP_LOGO_DATA_URI}" alt="Interview Ready Logo" />
        <div>
          <h1 class="header-title">Interview Ready</h1>
          <p class="header-subtitle">Company Research Intelligence Brief</p>
        </div>
      </div>

      <div class="title-section">
        <h2 class="main-title">${esc(companyName)}</h2>
        ${data.tagline ? `<p class="tagline">${esc(data.tagline)}</p>` : ''}
        <p class="date-line">Prepared on ${today}</p>
      </div>

      <div class="verdict">
        <div class="verdict-title">Strategic Verdict</div>
        <p>${esc(data.summary_verdict)}</p>
      </div>

      <div class="scores-section">
        <div class="score-card">
          <div class="score-title">Opportunity Score</div>
          <div class="score-value">${esc(data.opportunity_score)}/100</div>
        </div>
        ${data.cultural_fit_score != null ? `
          <div class="score-card">
            <div class="score-title">Cultural Fit</div>
            <div class="score-value">${esc(data.cultural_fit_score)}/100</div>
          </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Quick Facts</div>
        <div class="fact-grid">
          ${fact('Industry', data.industry)}
          ${fact('Business Model', data.business_model)}
          ${fact('Company Size', data.company_size)}
          ${fact('Headquarters', data.headquarters)}
          ${fact('Founded', data.founded)}
          ${fact('Financials', data.financials)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Company Overview</div>
        <p>${esc(data.overview)}</p>
      </div>

      <div class="section">
        <div class="section-title">Mission & Values</div>
        <p>${esc(data.mission_values)}</p>
      </div>

      <div class="section">
        <div class="section-title">Key Products & Services</div>
        ${renderList(data.key_products_services)}
      </div>

      <div class="section">
        <div class="section-title">Tech Stack & Competitors</div>
        <div class="two-col">
          <div>
            <span class="sub-label">Tech Stack</span>
            ${renderList(data.tech_stack)}
          </div>
          <div>
            <span class="sub-label">Competitors</span>
            ${renderList(data.competitors)}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Culture Insights</div>
        <p>${esc(data.culture_insights)}</p>
      </div>

      <div class="section">
        <div class="section-title">Growth Signals</div>
        ${renderList(data.growth_signals)}
      </div>

      ${data.red_flags && data.red_flags.length > 0 ? `
        <div class="red-flags">
          <div class="section-title">Risks & Red Flags</div>
          ${renderList(data.red_flags)}
        </div>
      ` : ''}

      <div class="section" style="page-break-before: always;">
        <div class="section-title">Interview Prep: Talking Points</div>
        <p>Show knowledge of these in your interview answers:</p>
        ${renderList(data.interview_talking_points)}
      </div>

      <div class="section">
        <div class="section-title">Smart Questions to Ask</div>
        <p>These questions show strategic thinking and genuine interest:</p>
        ${renderList(data.smart_questions_to_ask)}
      </div>

      ${data.recent_news && data.recent_news.length > 0 ? `
        <div class="section" style="page-break-before: always;">
          <div class="section-title">Recent News</div>
          ${renderNews(data.recent_news)}
        </div>
      ` : ''}

      <div class="footer">
        Generated by Interview Ready AI • Powered by Interview Ready
      </div>

    </body>
    </html>
  `;

  return html;
}
