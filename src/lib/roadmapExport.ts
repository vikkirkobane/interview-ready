import { Platform } from 'react-native';

declare var window: any;
declare var document: any;

let printToFileAsync: any;
let shareAsync: any;
let FileSystem: any;

try {
  const Print = require('expo-print');
  printToFileAsync = Print.printToFileAsync;
} catch (e) {
  // Ignore
}

try {
  const Sharing = require('expo-sharing');
  shareAsync = Sharing.shareAsync;
} catch (e) {
  // Ignore
}

try {
  FileSystem = require('expo-file-system');
} catch (e) {
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
    const filename = `Interview_Ready_Roadmap_${Date.now()}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.moveAsync({ from: uri, to: newUri });
    
    await shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Download Roadmap PDF' });
  }
}

function buildRoadmapHTML(analysisResult: any): string {
  const missingSkills = analysisResult?.missing_bonus_skills || [];
  const requiredSkills = analysisResult?.required_skills || [];
  
  const skillsListHTML = missingSkills.length > 0 
    ? missingSkills.map((s: any, i: number) => `
      <div class="step">
        <div class="step-number">${i + 1}</div>
        <div class="step-content">
          <h3>Master ${s.skill}</h3>
          <p>This is a critical gap identified in your profile. Allocate time to understand the core concepts, build a small project, and be prepared to discuss it in your interview.</p>
        </div>
      </div>
    `).join('')
    : `<div class="success-box">You have no critical gaps! Continue reviewing your core strengths.</div>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Interview Ready - 14 Day Roadmap</title>
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

        /* Watermark */
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
          font-size: 36px;
          font-weight: 700;
          color: #5221E6;
          margin-bottom: 10px;
        }

        .sub-title {
          font-size: 18px;
          color: #555;
        }

        .roadmap-container {
          margin-top: 30px;
        }

        .step {
          display: flex;
          margin-bottom: 30px;
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
          padding: 20px;
          border-radius: 12px;
          flex-grow: 1;
          border: 1px solid #eee;
        }

        .step-content h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #1a1a1a;
          font-size: 20px;
        }

        .step-content p {
          margin: 0;
          color: #555;
          font-size: 15px;
        }

        .success-box {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          font-weight: 600;
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
          <h2 class="main-title">14-Day Action Plan</h2>
          <p class="sub-title">A step-by-step roadmap to bridge your skill gaps before the interview</p>
        </div>

        <div class="roadmap-container">
          ${skillsListHTML}
        </div>

        <div class="footer">
          Generated by Interview Ready AI • Confidential • Do not distribute
        </div>
      </div>
    </body>
    </html>
  `;
}
