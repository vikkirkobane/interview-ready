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

export interface InterviewReportContext {
  candidateName?: string;
  role?: string;
  company?: string;
}

/**
 * Export the mock interview feedback as a branded PDF report.
 * Native: expo-print → renameToCache → expo-sharing (correct filename).
 * Web: opens the report in a new window for print/save as PDF.
 */
export async function exportInterviewReportPDF(
  interview: any,
  feedback: any,
  context: InterviewReportContext = {}
): Promise<void> {
  const html = buildInterviewReportHTML(interview, feedback, context);
  const filename = buildFileName(context.candidateName, 'Interview_Report', 'pdf');

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

function recommendationColor(recommendation: string): string {
  switch (recommendation) {
    case 'STRONG_HIRE': return '#16A34A';
    case 'HIRE': return '#22C55E';
    case 'MAYBE': return '#D97706';
    case 'NO_HIRE': return '#DC2626';
    case 'STRONG_NO_HIRE': return '#991B1B';
    default: return '#374151';
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

function dimensionScore(feedback: any, key: string): number {
  return Math.round(feedback?.dimension_scores?.[key] ?? 0);
}

function buildInterviewReportHTML(
  interview: any,
  feedback: any,
  context: InterviewReportContext = {}
): string {
  const candidateName = context.candidateName || '';
  const role = context.role || interview?.role || '';
  const company = context.company || interview?.company || '';
  const overall = Math.round(feedback?.overall_score ?? 0);
  const recommendation = feedback?.recommendation || '';
  const recColor = recommendationColor(recommendation);
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const subjectLine = [role, company].filter(Boolean).join(' @ ');

  const dimensions = [
    { label: 'Communication', score: dimensionScore(feedback, 'communication') },
    { label: 'Technical Knowledge', score: dimensionScore(feedback, 'technical_knowledge') },
    { label: 'Problem Solving', score: dimensionScore(feedback, 'problem_solving') },
    { label: 'Confidence', score: dimensionScore(feedback, 'confidence') },
    { label: 'Cultural Fit', score: dimensionScore(feedback, 'cultural_fit') },
  ];

  const dimensionBars = dimensions.map(d => `
    <div class="dimension-row">
      <div class="dimension-label">${esc(d.label)}</div>
      <div class="dimension-bar-bg">
        <div class="dimension-bar-fill" style="width: ${d.score}%;"></div>
      </div>
      <div class="dimension-value">${d.score}%</div>
    </div>
  `).join('');

  const strengths = Array.isArray(feedback?.strengths) ? feedback.strengths : [];
  const improvements = Array.isArray(feedback?.areas_for_improvement) ? feedback.areas_for_improvement : [];
  const suggested = Array.isArray(feedback?.suggested_follow_up) ? feedback.suggested_follow_up : [];
  const questionFeedback = Array.isArray(feedback?.question_feedback) ? feedback.question_feedback : [];

  const strengthsList = strengths.map((s: string) => `<li>${esc(s)}</li>`).join('');
  const improvementsList = improvements.map((s: string) => `<li>${esc(s)}</li>`).join('');
  const suggestedList = suggested.map((s: string) => `<li>${esc(s)}</li>`).join('');

  const questionBlocks = questionFeedback.map((q: any, i: number) => `
    <div class="q-block">
      <div class="q-header">
        <span class="q-number">Question ${i + 1}</span>
        <span class="q-score" style="color: ${q.score >= 80 ? '#16A34A' : q.score >= 60 ? '#D97706' : '#DC2626'};">${Math.round(q.score ?? 0)}/100</span>
      </div>
      <p class="q-question">${esc(q.question)}</p>
      <p class="q-answer"><strong>Your answer:</strong> ${esc(q.answer)}</p>
      <p class="q-feedback"><strong>Feedback:</strong> ${esc(q.feedback)}</p>
    </div>
  `).join('');

  const messages = Array.isArray(interview?.messages) ? interview.messages : [];
  const transcript = messages.map((m: any) => {
    const isUser = m.role === 'user';
    return `
      <div class="transcript-row">
        <div class="transcript-role ${isUser ? 'role-user' : 'role-ai'}">${isUser ? 'Candidate' : 'Interviewer'}</div>
        <div class="transcript-text">${esc(m.content)}</div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Interview Report - ${esc(role || candidateName || 'Interview')}</title>
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
      background: conic-gradient(#2563EB ${overall}%, #DBEAFE ${overall}% 100%);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }
    .score-ring-inner {
      width: 72px; height: 72px; border-radius: 50%;
      background: #fff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .score-num { font-size: 22px; font-weight: 800; color: #0f172a; }
    .score-cap { font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #64748b; }
    .score-text h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .rec-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 700;
      color: #fff;
      margin-top: 4px;
    }

    .section {
      margin-bottom: 20px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 15px; font-weight: 800; color: #2563EB;
      border-left: 4px solid #2563EB;
      padding-left: 10px; margin-bottom: 12px;
    }

    .dimension-row {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 7px;
    }
    .dimension-label { width: 150px; font-weight: 600; color: #334155; font-size: 12px; }
    .dimension-bar-bg { flex: 1; height: 10px; border-radius: 5px; background: #dbeafe; overflow: hidden; }
    .dimension-bar-fill { height: 100%; border-radius: 5px; background: #2563EB; }
    .dimension-value { width: 40px; text-align: right; font-weight: 700; color: #0f172a; font-size: 12px; }

    .two-col { display: flex; gap: 14px; break-inside: avoid; page-break-inside: avoid; }
    .col { flex: 1; }
    .col-box {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 14px 16px; height: 100%;
    }
    .col-box h4 {
      font-size: 13px; font-weight: 700; margin-bottom: 8px;
      color: #0f172a;
      display: flex; align-items: center; gap: 6px;
    }
    .col-box ul { padding-left: 18px; }
    .col-box li { margin-bottom: 5px; color: #334155; font-size: 12px; line-height: 1.5; }

    .q-block {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 14px 16px; margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .q-number { font-weight: 800; color: #2563EB; font-size: 13px; }
    .q-score { font-weight: 800; font-size: 13px; }
    .q-question { font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 12.5px; }
    .q-answer { color: #334155; margin-bottom: 6px; font-size: 12px; }
    .q-feedback { color: #1e40af; background: #eff6ff; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #2563EB; font-size: 12px; }

    .transcript {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 14px 16px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .transcript-row { display: flex; gap: 12px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; break-inside: avoid; page-break-inside: avoid; }
    .transcript-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .transcript-role { font-weight: 700; width: 90px; flex-shrink: 0; font-size: 11px; text-transform: uppercase; }
    .role-user { color: #2563EB; }
    .role-ai { color: #059669; }
    .transcript-text { flex: 1; color: #334155; font-size: 12px; line-height: 1.5; }

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
      <p class="header-subtitle">Mock Interview Performance Report • appinterviewready.top</p>
    </div>
  </div>

  <div class="title-section">
    <div class="badge-pill">AI INTERVIEW REPORT</div>
    <h2 class="main-title">${esc(role || 'Interview Evaluation')}</h2>
    ${subjectLine ? `<p class="meta-line">${esc(subjectLine)}</p>` : ''}
    ${candidateName ? `<p class="meta-line">Candidate: <strong>${esc(candidateName)}</strong></p>` : ''}
    <p class="date-line">${today}</p>
  </div>

  <div class="score-card">
    <div class="score-ring">
      <div class="score-ring-inner">
        <span class="score-num">${overall}</span>
        <span class="score-cap">OUT OF 100</span>
      </div>
    </div>
    <div class="score-text">
      <h2>Overall Performance: ${overall >= 80 ? 'Exceptional' : overall >= 60 ? 'Strong Potential' : 'Needs Practice'}</h2>
      <p style="color: #64748b; font-size: 12px;">Recommendation Status:</p>
      <span class="rec-badge" style="background: ${recColor};">${esc(recommendation.replace(/_/g, ' ') || 'Evaluation Complete')}</span>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">Core Dimensions Evaluation</h3>
    ${dimensionBars}
  </div>

  <div class="two-col" style="margin-bottom: 20px;">
    <div class="col">
      <div class="col-box">
        <h4 style="color: #166534;">✓ Key Strengths</h4>
        <ul>${strengthsList || '<li>Demonstrated good baseline domain knowledge.</li>'}</ul>
      </div>
    </div>
    <div class="col">
      <div class="col-box">
        <h4 style="color: #b45309;">⚠️ Areas for Growth</h4>
        <ul>${improvementsList || '<li>Practice providing structured STAR method examples.</li>'}</ul>
      </div>
    </div>
  </div>

  ${questionBlocks.length > 0 ? `
    <div class="section">
      <h3 class="section-title">Question by Question Breakdown</h3>
      ${questionBlocks}
    </div>
  ` : ''}

  ${suggestedList ? `
    <div class="section">
      <h3 class="section-title">Suggested Follow-Up Practice</h3>
      <div class="col-box">
        <ul>${suggestedList}</ul>
      </div>
    </div>
  ` : ''}

  ${transcript ? `
    <div class="section">
      <h3 class="section-title">Interview Transcript Excerpt</h3>
      <div class="transcript">
        ${transcript}
      </div>
    </div>
  ` : ''}

  <div class="footer">
    Generated by Interview Ready AI • https://appinterviewready.top • Confidential
  </div>
</body>
</html>`;
}
