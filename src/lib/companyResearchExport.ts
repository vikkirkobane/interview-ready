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
  const filename = buildFileName(result.company_name, 'Company_Intelligence_Report', 'pdf');

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
      <title>${esc(companyName)} - Company Research Intelligence Report</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 16mm 14mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0f172a;
          background: #ffffff;
          line-height: 1.55;
          font-size: 12px;
          -webkit-print-color-adjust: exact;
        }

        .header {
          display: flex;
          align-items: center;
          border-bottom: 2px solid #2563EB;
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
          background: #eff6ff;
          color: #2563EB;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 4px 14px;
          border-radius: 9999px;
          margin-bottom: 8px;
        }
        .main-title { font-size: 26px; font-weight: 800; color: #2563EB; margin-bottom: 6px; }
        .tagline { font-size: 13.5px; color: #475569; font-style: italic; margin-bottom: 6px; }
        .date-line { font-size: 12px; color: #64748b; }

        .scores-section {
          display: flex;
          gap: 14px;
          margin-bottom: 20px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .score-card {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          text-align: center;
        }
        .score-card .score-title { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .score-card .score-value { font-size: 24px; color: #2563EB; font-weight: 800; }

        .section {
          margin-bottom: 20px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 14.5px;
          font-weight: 800;
          color: #2563EB;
          border-left: 4px solid #2563EB;
          padding-left: 10px;
          margin-bottom: 10px;
        }

        .verdict {
          background: #eff6ff;
          border-left: 4px solid #2563EB;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 0 10px 10px 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .verdict-title { font-weight: 800; color: #2563EB; margin-bottom: 6px; font-size: 14px; }

        .fact-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
        .fact-item {
          flex: 1 1 45%;
          background: #f8fafc;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .fact-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 3px;
        }
        .fact-value { font-size: 13px; font-weight: 600; color: #0f172a; }

        p { color: #334155; font-size: 12.5px; line-height: 1.6; }
        .text-muted { color: #94a3b8; font-size: 12px; }

        .list { padding-left: 18px; margin: 0; color: #334155; font-size: 12.5px; }
        .list li { margin-bottom: 5px; line-height: 1.5; }

        .two-col { display: flex; gap: 14px; break-inside: avoid; page-break-inside: avoid; }
        .two-col > div { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
        .sub-label { font-weight: 700; color: #0f172a; font-size: 12.5px; margin-bottom: 6px; display: block; }

        .news-item { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; break-inside: avoid; page-break-inside: avoid; }
        .news-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .news-headline { font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 3px; }
        .news-summary { font-size: 12px; color: #475569; }

        .red-flags { background: #fefce8; border-left: 4px solid #f59e0b; padding: 14px 16px; margin-bottom: 20px; border-radius: 0 10px 10px 0; break-inside: avoid; page-break-inside: avoid; }
        .red-flags .section-title { color: #b45309; border-color: #f59e0b; }

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
          <p class="header-subtitle">Company Intelligence Brief • appinterviewready.top</p>
        </div>
      </div>

      <div class="title-section">
        <div class="badge-pill">COMPANY INTELLIGENCE</div>
        <h2 class="main-title">${esc(companyName)}</h2>
        ${data.tagline ? `<p class="tagline">${esc(data.tagline)}</p>` : ''}
        <p class="date-line">Prepared on ${today}</p>
      </div>

      <div class="verdict">
        <div class="verdict-title">Strategic Overview Verdict</div>
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

      <div class="section">
        <div class="section-title">Interview Prep: Key Talking Points</div>
        <p style="margin-bottom: 8px;">Showcase familiarity with these focus points in your interview:</p>
        ${renderList(data.interview_talking_points)}
      </div>

      <div class="section">
        <div class="section-title">Smart Questions to Ask Hiring Managers</div>
        <p style="margin-bottom: 8px;">Demonstrate strategic interest by asking these questions:</p>
        ${renderList(data.smart_questions_to_ask)}
      </div>

      ${data.recent_news && data.recent_news.length > 0 ? `
        <div class="section">
          <div class="section-title">Recent News & Developments</div>
          ${renderNews(data.recent_news)}
        </div>
      ` : ''}

      <div class="footer">
        Generated by Interview Ready AI • https://appinterviewready.top • Confidential
      </div>

    </body>
    </html>
  `;

  return html;
}
