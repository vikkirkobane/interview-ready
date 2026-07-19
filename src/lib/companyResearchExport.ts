import { Platform } from 'react-native';
import { CompanyResearchResult } from '../hooks/useApi';

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

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  } else {
    if (!printToFileAsync || !shareAsync) {
      throw new Error('PDF export requires expo-print and expo-sharing.');
    }
    const { uri } = await printToFileAsync({ html });
    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Download Company Research PDF' });
  }
}

function buildCompanyResearchHTML(data: CompanyResearchResult): string {
  if (!data) {
    return `<!DOCTYPE html><html><body><h1>No data</h1></body></html>`;
  }

  // Helper functions to safely map lists
  const renderList = (items: string[]) => {
    if (!items || items.length === 0) return '<p class="text-muted">None available</p>';
    return `<ul class="list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
  };

  const renderNews = (news: { headline: string; summary: string }[]) => {
    if (!news || news.length === 0) return '<p class="text-muted">No recent news available.</p>';
    return `<div class="news-list">
      ${news.map(item => `
        <div class="news-item">
          <div class="news-headline">${item.headline}</div>
          <div class="news-summary">${item.summary}</div>
        </div>
      `).join('')}
    </div>`;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${data.company_name} - Intelligence Brief</title>
      <style>
        :root {
          --primary: #0ea5e9;
          --bg: #ffffff;
          --surface: #f8fafc;
          --border: #e2e8f0;
          --text: #0f172a;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --success: #10b981;
          --warning: #f59e0b;
        }

        @page { margin: 40px; }
        
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: var(--text);
          background: var(--bg);
          line-height: 1.5;
          margin: 0;
          padding: 20px;
        }
        
        h1, h2, h3 { margin-top: 0; }
        
        .header {
          border-bottom: 2px solid var(--primary);
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 28px;
          color: var(--primary);
          margin-bottom: 5px;
        }
        .header p.tagline {
          font-size: 16px;
          color: var(--text-secondary);
          font-style: italic;
          margin: 0;
        }

        .scores-section {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
        }
        .score-card {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .score-card .score-title {
          font-size: 14px;
          font-weight: bold;
          color: var(--text-secondary);
          margin-bottom: 5px;
        }
        .score-card .score-value {
          font-size: 24px;
          color: var(--primary);
          font-weight: bold;
        }

        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 18px;
          color: var(--primary);
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .fact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }
        .fact-item {
          background: var(--surface);
          padding: 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
        }
        .fact-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .fact-value {
          font-size: 14px;
          font-weight: bold;
          color: var(--text);
        }

        p { color: var(--text-secondary); font-size: 14px; line-height: 1.6; }
        
        .list { padding-left: 20px; margin: 0; color: var(--text-secondary); font-size: 14px; }
        .list li { margin-bottom: 8px; }

        .news-item {
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--border);
        }
        .news-item:last-child { border-bottom: none; }
        .news-headline { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
        .news-summary { font-size: 13px; color: var(--text-secondary); }

        .verdict {
          background: #f0f9ff;
          border-left: 4px solid var(--primary);
          padding: 15px;
          margin-bottom: 30px;
        }
        .verdict-title {
          font-weight: bold;
          color: var(--primary);
          margin-bottom: 8px;
          font-size: 16px;
        }

        .red-flags {
          background: #fffbeb;
          border-left: 4px solid var(--warning);
          padding: 15px;
          margin-bottom: 30px;
        }
      </style>
    </head>
    <body>

      <div class="header">
        <h1>${data.company_name}</h1>
        ${data.tagline ? `<p class="tagline">${data.tagline}</p>` : ''}
      </div>

      <div class="verdict">
        <div class="verdict-title">Strategic Verdict</div>
        <p>${data.summary_verdict}</p>
      </div>

      <div class="scores-section">
        <div class="score-card">
          <div class="score-title">OPPORTUNITY SCORE</div>
          <div class="score-value">${data.opportunity_score}/100</div>
        </div>
        ${data.cultural_fit_score ? `
          <div class="score-card">
            <div class="score-title">CULTURAL FIT</div>
            <div class="score-value">${data.cultural_fit_score}/100</div>
          </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Quick Facts</div>
        <div class="fact-grid">
          <div class="fact-item"><div class="fact-label">Industry</div><div class="fact-value">${data.industry || '-'}</div></div>
          <div class="fact-item"><div class="fact-label">Business Model</div><div class="fact-value">${data.business_model || '-'}</div></div>
          <div class="fact-item"><div class="fact-label">Company Size</div><div class="fact-value">${data.company_size || '-'}</div></div>
          <div class="fact-item"><div class="fact-label">Headquarters</div><div class="fact-value">${data.headquarters || '-'}</div></div>
          <div class="fact-item"><div class="fact-label">Founded</div><div class="fact-value">${data.founded || '-'}</div></div>
          <div class="fact-item"><div class="fact-label">Financials</div><div class="fact-value">${data.financials || '-'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Company Overview</div>
        <p>${data.overview}</p>
      </div>

      <div class="section">
        <div class="section-title">Mission & Values</div>
        <p>${data.mission_values}</p>
      </div>

      <div class="section">
        <div class="section-title">Key Products & Services</div>
        ${renderList(data.key_products_services)}
      </div>

      <div class="section">
        <div class="section-title">Tech Stack & Competitors</div>
        <div class="fact-grid" style="grid-template-columns: 1fr 1fr;">
          <div>
            <strong>Tech Stack:</strong>
            ${renderList(data.tech_stack || [])}
          </div>
          <div>
            <strong>Competitors:</strong>
            ${renderList(data.competitors || [])}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Culture Insights</div>
        <p>${data.culture_insights}</p>
      </div>

      <div class="section">
        <div class="section-title">Growth Signals</div>
        ${renderList(data.growth_signals)}
      </div>

      ${data.red_flags && data.red_flags.length > 0 ? `
        <div class="section red-flags">
          <div class="section-title" style="color: var(--warning); border-color: var(--warning);">Risks & Red Flags</div>
          ${renderList(data.red_flags)}
        </div>
      ` : ''}

      <div class="section" style="page-break-before: always;">
        <div class="section-title">Interview Prep: Talking Points to Demonstrate</div>
        <p>Show knowledge of these in your interview answers:</p>
        ${renderList(data.interview_talking_points)}
      </div>

      <div class="section">
        <div class="section-title">Interview Prep: Smart Questions to Ask</div>
        <p>These questions show strategic thinking and genuine interest:</p>
        ${renderList(data.smart_questions_to_ask)}
      </div>

      ${data.recent_news && data.recent_news.length > 0 ? `
        <div class="section" style="page-break-before: always;">
          <div class="section-title">Recent News</div>
          ${renderNews(data.recent_news)}
        </div>
      ` : ''}

    </body>
    </html>
  `;

  return html;
}
