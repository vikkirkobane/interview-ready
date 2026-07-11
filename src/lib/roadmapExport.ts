import { Platform } from 'react-native';

declare let window: any;

let printToFileAsync: any;
let shareAsync: any;
let FileSystem: any;

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

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  FileSystem = require('expo-file-system');
} catch {
  // Ignore
}

export async function exportRoadmapPDF(analysisResult: any): Promise<void> {
  const html = buildRoadmapHTML(analysisResult);

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  } else {
    // Native PDF generation
    if (!printToFileAsync || !shareAsync || !FileSystem) {
      throw new Error('PDF export requires expo-print, expo-sharing, and expo-file-system.');
    }
    const { uri } = await printToFileAsync({ html });
    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Download Roadmap PDF' });
  }
}

function buildRoadmapHTML(roadmapData: any): string {
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
        <h3>${m.module_title} (${m.days_allocated})</h3>
        <p style="margin-bottom: 15px; color: #5221E6; font-weight: 600; font-size: 14px;">Focus: ${m.focus_skill} • Estimated Time: ${m.estimated_hours}h</p>
        <ul style="margin-top: 0; padding-left: 20px; color: #555;">
          ${m.action_items.map((item: string) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
        </ul>
        ${m.resources_to_use && m.resources_to_use.length > 0 ? `
          <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ddd;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #333;">Recommended Resources:</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #666;">${m.resources_to_use.join(', ')}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

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
          width: 40px;
          height: 40px;
          background: #5221E6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 20px;
          margin-right: 15px;
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

        .sub-title {
          font-size: 16px;
          color: #555;
          max-width: 600px;
          margin: 0 auto;
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

        .step-content p {
          margin: 0;
          color: #555;
          font-size: 15px;
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
          <div class="logo">IR</div>
          <div>
            <h1 class="header-title">Interview Ready</h1>
            <p class="header-subtitle">Your Personal AI Career Coach</p>
          </div>
        </div>

        <div class="title-section">
          <h2 class="main-title">${roadmapData.title}</h2>
          <p class="sub-title">${roadmapData.overview}</p>
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
