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
    await shareAsync(namedUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: `Download ${filename}` });
  }
}

const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_HIRE: 'Strong Hire',
  HIRE: 'Hire',
  MAYBE: 'Maybe',
  NO_HIRE: 'No Hire',
  STRONG_NO_HIRE: 'Strong No Hire',
};

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
        <span class="q-number">Q${i + 1}</span>
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    @page { size: A4; margin: 18mm 16mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      color: #1A1A1A;
      line-height: 1.55;
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
    .header-subtitle { font-size: 12px; color: #666; }
    .title-section { text-align: center; margin-bottom: 24px; }
    .main-title { font-size: 26px; font-weight: 800; color: #6B46FE; margin-bottom: 6px; }
    .meta-line { font-size: 13px; color: #333; font-weight: 600; margin: 2px 0; }
    .date-line { font-size: 12px; color: #666; }

    .score-card {
      display: flex;
      align-items: center;
      gap: 24px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    .score-ring {
      width: 96px; height: 96px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: conic-gradient(#6B46FE ${overall}%, #EDE9FE ${overall}% 100%);
    }
    .score-ring-inner {
      width: 76px; height: 76px; border-radius: 50%;
      background: #fff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .score-num { font-size: 24px; font-weight: 800; color: #1A1A1A; }
    .score-cap { font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #6B7280; }
    .score-text h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .rec-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      margin-top: 6px;
    }

    .section { margin-bottom: 22px; }
    .section-title {
      font-size: 16px; font-weight: 800; color: #6B46FE;
      border-left: 4px solid #6B46FE;
      padding-left: 10px; margin-bottom: 12px;
    }

    .dimension-row {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 8px;
    }
    .dimension-label { width: 150px; font-weight: 600; color: #333; }
    .dimension-bar-bg { flex: 1; height: 10px; border-radius: 5px; background: #EDE9FE; overflow: hidden; }
    .dimension-bar-fill { height: 100%; border-radius: 5px; background: #6B46FE; }
    .dimension-value { width: 40px; text-align: right; font-weight: 700; color: #1A1A1A; }

    .two-col { display: flex; gap: 16px; }
    .col { flex: 1; }
    .col-box {
      background: #F9FAFB; border: 1px solid #E5E7EB;
      border-radius: 12px; padding: 14px 16px; height: 100%;
    }
    .col-box h4 {
      font-size: 13px; font-weight: 700; margin-bottom: 8px;
      display: flex; align-items: center; gap: 6px;
    }
    .col-box ul { padding-left: 18px; }
    .col-box li { margin-bottom: 6px; color: #374151; }

    .q-block {
      background: #F9FAFB; border: 1px solid #E5E7EB;
      border-radius: 12px; padding: 14px 16px; margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .q-number { font-weight: 800; color: #6B46FE; font-size: 13px; }
    .q-score { font-weight: 800; font-size: 13px; }
    .q-question { font-weight: 600; color: #1A1A1A; margin-bottom: 6px; }
    .q-answer { color: #374151; margin-bottom: 6px; }
    .q-feedback { color: #6B46FE; }

    .transcript {
      background: #F9FAFB; border: 1px solid #E5E7EB;
      border-radius: 12px; padding: 14px 16px;
    }
    .transcript-row { margin-bottom: 10px; }
    .transcript-role {
      display: inline-block; font-size: 10px; font-weight: 700;
      letter-spacing: 0.5px; padding: 2px 8px; border-radius: 4px;
      margin-bottom: 3px;
    }
    .role-ai { background: #EDE9FE; color: #6B46FE; }
    .role-user { background: #DCFCE7; color: #166534; }
    .transcript-text { color: #374151; }

    .footer {
      margin-top: 24px; text-align: center;
      font-size: 11px; color: #9CA3AF;
      border-top: 1px solid #E5E7EB; padding-top: 12px;
    }
    .summary-box {
      background: #F9FAFB; border: 1px solid #E5E7EB;
      border-radius: 12px; padding: 14px 16px; color: #374151;
    }
  </style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${APP_LOGO_DATA_URI}" alt="Interview Ready Logo" />
    <div>
      <h1 class="header-title">Interview Ready</h1>
      <p class="header-subtitle">Mock Interview Performance Report</p>
    </div>
  </div>

  <div class="title-section">
    <h2 class="main-title">${esc(role || 'Mock Interview')}${company ? ` at ${esc(company)}` : ''}</h2>
    ${candidateName ? `<p class="meta-line">Prepared for ${esc(candidateName)}</p>` : ''}
    <p class="meta-line">${esc(subjectLine || 'Interview Report')}</p>
    <p class="date-line">${today}</p>
  </div>

  <div class="score-card">
    <div class="score-ring">
      <div class="score-ring-inner">
        <span class="score-num">${overall}</span>
        <span class="score-cap">SCORE</span>
      </div>
    </div>
    <div class="score-text">
      <h2>Interview Complete</h2>
      <p>${esc(feedback?.interview_summary || '')}</p>
      ${recommendation ? `<span class="rec-badge" style="background: ${recColor};">${esc(RECOMMENDATION_LABEL[recommendation] || recommendation)}</span>` : ''}
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">Score Breakdown</h3>
    ${dimensionBars}
  </div>

  <div class="section">
    <div class="two-col">
      <div class="col">
        <div class="col-box">
          <h4>✅ Core Strengths</h4>
          <ul>${strengthsList || '<li>No strengths recorded.</li>'}</ul>
        </div>
      </div>
      <div class="col">
        <div class="col-box">
          <h4>⚠️ Improvement Areas</h4>
          <ul>${improvementsList || '<li>No improvement areas recorded.</li>'}</ul>
        </div>
      </div>
    </div>
  </div>

  ${questionBlocks ? `
  <div class="section">
    <h3 class="section-title">Question-by-Question Feedback</h3>
    ${questionBlocks}
  </div>
  ` : ''}

  ${suggestedList ? `
  <div class="section">
    <h3 class="section-title">Suggested Follow-Up Topics</h3>
    <div class="col-box">
      <ul>${suggestedList}</ul>
    </div>
  </div>
  ` : ''}

  ${transcript ? `
  <div class="section">
    <h3 class="section-title">Interview Transcript</h3>
    <div class="transcript">${transcript}</div>
  </div>
  ` : ''}

  <div class="footer">
    Generated by Interview Ready AI • Confidential • Do not distribute
  </div>
</body>
</html>`;
}
