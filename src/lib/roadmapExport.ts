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

// Native flow: expo-print generates the PDF, renameToCache gives it the proper
// filename in the cache directory, then expo-sharing delivers it.

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
  const filename = buildFileName(context.candidateName, 'Roadmap', 'pdf');

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

function buildRoadmapHTML(roadmapData: any, context: RoadmapExportContext = {}): string {
  if (!roadmapData || !roadmapData.modules) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Interview Ready - Roadmap</title>
        <style>
          body { font-family: 'Inter', sans-serif; text-align: center; padding: 40px; color: #1a1a1a; }
          .success-box { background: #e8f5e9; color: #2e7d32; padding: 20px; border-radius: 12px; font-weight: 600; }
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
        <h3>${m.module_title} <span class="days">(${m.days_allocated})</span></h3>
        <p class="focus">Focus: ${m.focus_skill} • Estimated Time: ${m.estimated_hours}h</p>
        <ul class="actions">
          ${m.action_items.map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
        ${m.resources_to_use && m.resources_to_use.length > 0 ? `
          <div class="resources">
            <p class="resources-label">Recommended Resources</p>
            <p class="resources-list">${m.resources_to_use.join(', ')}</p>
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
      <title>Interview Ready - ${roadmapData.duration_days} Day Roadmap</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

        body {
          font-family: 'Inter', sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background: #ffffff;
        }

        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          color: rgba(82, 33, 230, 0.03);
          z-index: -1;
          white-space: nowrap;
          pointer-events: none;
          font-weight: 700;
        }

        .container {
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 20px;
          margin-bottom: 40px;
        }

        .logo {
          width: 44px;
          height: 46px;
          margin-right: 15px;
          object-fit: contain;
        }

        .header-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
        }

        .header-subtitle {
          color: #666;
          font-size: 14px;
          margin: 0;
        }

        .title-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .main-title {
          font-size: 32px;
          font-weight: 700;
          color: #5221E6;
          margin-bottom: 15px;
        }

        .meta-line {
          font-size: 15px;
          color: #333;
          margin: 4px 0;
          font-weight: 600;
        }

        .sub-title {
          font-size: 16px;
          color: #555;
          max-width: 600px;
          margin: 12px auto 0;
        }

        .roadmap-container {
          margin-top: 40px;
        }

        .step {
          display: flex;
          margin-bottom: 30px;
          page-break-inside: avoid;
        }

        .step-number {
          width: 40px;
          height: 40px;
          background: #5221E6;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
          flex-shrink: 0;
          margin-right: 20px;
        }

        .step-content {
          background: #f8f9fa;
          padding: 24px;
          border-radius: 12px;
          flex-grow: 1;
          border: 1px solid #eee;
        }

        .step-content h3 {
          margin-top: 0;
          margin-bottom: 5px;
          color: #1a1a1a;
          font-size: 20px;
        }

        .step-content .days {
          color: #5221E6;
          font-weight: 600;
          font-size: 16px;
        }

        .step-content .focus {
          margin: 0 0 12px 0;
          color: #5221E6;
          font-weight: 600;
          font-size: 14px;
        }

        .step-content ul.actions {
          margin: 0;
          padding-left: 20px;
          color: #444;
        }

        .step-content ul.actions li {
          margin-bottom: 8px;
        }

        .resources {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px dashed #ddd;
        }

        .resources-label {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .resources-list {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: #666;
        }

        .footer {
          margin-top: 60px;
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #f0f0f0;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="watermark">INTERVIEW READY</div>

      <div class="container">
        <div class="header">
          <img class="logo" src="${APP_LOGO_DATA_URI}" alt="Interview Ready Logo" />
          <div>
            <h1 class="header-title">Interview Ready</h1>
            <p class="header-subtitle">Your Personal AI Career Coach</p>
          </div>
        </div>

        <div class="title-section">
          <h2 class="main-title">${roadmapData.title || 'Interview Preparation Roadmap'}</h2>
          ${subjectLine ? `<p class="meta-line">${subjectLine}</p>` : ''}
          ${candidateName ? `<p class="meta-line">Prepared for ${candidateName} • ${today}</p>` : `<p class="meta-line">${today}</p>`}
          <p class="sub-title">${roadmapData.overview || ''}</p>
        </div>

        <div class="roadmap-container">
          ${modulesHTML}
        </div>

        <div class="footer">
          Generated by Interview Ready AI • Confidential • Do not distribute
        </div>
      </div>
    </body>
    </html>
  `;
}
