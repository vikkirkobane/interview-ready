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

export interface RoadmapExportContext {
  candidateName?: string;
  jobTitle?: string;
  company?: string;
}

export async function exportRoadmapPDF(
  analysisResult: any,
  context: RoadmapExportContext = {}
): Promise<void> {
  const html = buildRoadmapHTML(analysisResult, context);
  const filename = buildFileName(context.candidateName, 'Preparation_Roadmap', 'pdf');

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

function buildRoadmapHTML(roadmapData: any, context: RoadmapExportContext = {}): string {
  if (!roadmapData || !roadmapData.modules) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Interview Ready - Roadmap</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; text-align: center; padding: 40px; color: #0f172a; }
          .success-box { background: #f0fdf4; color: #166534; padding: 20px; border-radius: 12px; font-weight: 600; border: 1px solid #bbf7d0; }
        </style>
      </head>
      <body>
        <div class="success-box">You have no critical gaps! Continue reviewing your core strengths.</div>
      </body>
      </html>
    `;
  }

  const modulesHTML = roadmapData.modules.map((m: any, i: number) => `
    <div class="step">
      <div class="step-number">${i + 1}</div>
      <div class="step-content">
        <div class="step-header">
          <h3>${esc(m.module_title)}</h3>
          <span class="days">${esc(m.days_allocated)}</span>
        </div>
        <div class="focus-bar">Focus: <strong>${esc(m.focus_skill)}</strong> • Estimated Time: <strong>${esc(m.estimated_hours)}h</strong></div>
        <ul class="actions">
          ${m.action_items.map((item: string) => `<li>${esc(item)}</li>`).join('')}
        </ul>
        ${m.resources_to_use && m.resources_to_use.length > 0 ? `
          <div class="resources">
            <p class="resources-label">RECOMMENDED RESOURCES</p>
            <p class="resources-list">${m.resources_to_use.map((r: string) => esc(r)).join(' • ')}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  const candidateName = context.candidateName || '';
  const jobTitle = context.jobTitle || roadmapData.title || '';
  const company = context.company || '';
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const subjectLine = [jobTitle, company].filter(Boolean).join(' @ ');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Interview Ready - ${esc(roadmapData.duration_days || '30')} Day Preparation Roadmap</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @page { size: A4 portrait; margin: 16mm 14mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0f172a;
          line-height: 1.55;
          background: #ffffff;
          font-size: 12px;
          -webkit-print-color-adjust: exact;
        }

        .container {
          max-width: 800px;
          margin: 0 auto;
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

        .logo {
          width: 44px;
          height: 46px;
          margin-right: 14px;
          object-fit: contain;
        }

        .header-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }

        .header-subtitle {
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
        }

        .title-section {
          text-align: center;
          margin-bottom: 24px;
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

        .main-title {
          font-size: 26px;
          font-weight: 800;
          color: #2563EB;
          margin-bottom: 6px;
        }

        .meta-line {
          font-size: 13px;
          color: #334155;
          margin: 2px 0;
          font-weight: 600;
        }

        .sub-title {
          font-size: 13px;
          color: #64748b;
          max-width: 620px;
          margin: 10px auto 0;
          line-height: 1.6;
        }

        .roadmap-container {
          margin-top: 20px;
        }

        .step {
          display: flex;
          margin-bottom: 18px;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .step-number {
          width: 36px;
          height: 36px;
          background: #2563EB;
          color: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
          flex-shrink: 0;
          margin-right: 14px;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        .step-content {
          background: #f8fafc;
          padding: 16px 20px;
          border-radius: 12px;
          flex-grow: 1;
          border: 1px solid #e2e8f0;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .step-content h3 {
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
        }

        .step-content .days {
          background: #eff6ff;
          color: #2563EB;
          font-weight: 700;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .focus-bar {
          margin: 0 0 10px 0;
          color: #475569;
          font-size: 12px;
        }

        .focus-bar strong {
          color: #2563EB;
        }

        .step-content ul.actions {
          margin: 0;
          padding-left: 18px;
          color: #334155;
          font-size: 12.5px;
        }

        .step-content ul.actions li {
          margin-bottom: 5px;
          line-height: 1.5;
        }

        .resources {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px dashed #cbd5e1;
        }

        .resources-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: #64748b;
          margin-bottom: 3px;
        }

        .resources-list {
          font-size: 12px;
          color: #475569;
          font-weight: 500;
        }

        .footer {
          margin-top: 32px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img class="logo" src="${APP_LOGO_DATA_URI}" alt="Interview Ready Logo" />
          <div>
            <h1 class="header-title">Interview Ready</h1>
            <p class="header-subtitle">Land Your Next Job Faster • appinterviewready.top</p>
          </div>
        </div>

        <div class="title-section">
          <div class="badge-pill">AI PREPARATION ROADMAP</div>
          <h2 class="main-title">${esc(roadmapData.title || 'Personalized Preparation Plan')}</h2>
          ${subjectLine ? `<p class="meta-line">${esc(subjectLine)}</p>` : ''}
          ${candidateName ? `<p class="meta-line">Prepared for <strong>${esc(candidateName)}</strong> • ${today}</p>` : `<p class="meta-line">${today}</p>`}
          ${roadmapData.overview ? `<p class="sub-title">${esc(roadmapData.overview)}</p>` : ''}
        </div>

        <div class="roadmap-container">
          ${modulesHTML}
        </div>

        <div class="footer">
          Generated by Interview Ready AI • https://appinterviewready.top • Confidential
        </div>
      </div>
    </body>
    </html>
  `;
}
