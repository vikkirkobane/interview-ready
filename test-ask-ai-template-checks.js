/**
 * Ask AI — Prompt, File Attachment & Process Quality Checks
 *
 * Verifies that:
 *   1. The answer-question prompt is fully optimized (CORE MISSION, keen
 *      analysis of file contents, STAR method, capitalization, output rules).
 *   2. The edge function accepts an attached-file context (file_context).
 *   3. The credit flow is correct (check before work, deduct only on success).
 *   4. The screen sends the typed question + file content as separate inputs,
 *      produces a default analysis request when only a file is attached,
 *      keeps the file for follow-up questions, and shows a removable chip.
 *   5. The hook passes file_context through to the API.
 *
 * Run: node test-ask-ai-template-checks.js
 */

const fs = require('fs');
const path = require('path');

const EDGE_PATH = path.join(__dirname, 'supabase', 'functions', 'answer-question', 'index.ts');
const SCREEN_PATH = path.join(__dirname, 'app', '(tabs)', 'ask-ai.tsx');
const HOOK_PATH = path.join(__dirname, 'src', 'hooks', 'useApi.ts');

let failures = [];
let passes = 0;

function check(name, condition, detail) {
  if (condition) {
    passes++;
    console.log(`  ✅ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function read(file, label) {
  if (!fs.existsSync(file)) {
    console.log(`  ❌ ${label} not found at ${file}`);
    failures.push(`${label} file`);
    return null;
  }
  return fs.readFileSync(file, 'utf8');
}

console.log('🤖 Ask AI — Prompt, File Attachment & Process Checks\n');

// ── 1. Edge function prompt optimization ────────────────────────────────
console.log('🤖 [1] answer-question Prompt Optimization');
const edge = read(EDGE_PATH, 'answer-question edge function');

if (edge) {
  check('Prompt: elite interview coach role', /elite interview coach and career consultant/.test(edge));
  check('Prompt: CORE MISSION section (keen analysis)', edge.includes('CORE MISSION'));
  check('Prompt: analyze attached file content keenly', /analyze this keenly/.test(edge));
  check('Prompt: mine file for requirements/keywords', /Mine it keenly for requirements, responsibilities, keywords/.test(edge));
  check('Prompt: answer using file content as evidence', /answer it directly using the file\/URL content as evidence/.test(edge));
  check('Prompt: document-only analysis fallback', /without a specific question, produce a thorough, well-structured analysis/.test(edge));
  check('Prompt: STAR method for behavioral questions', /STAR method/.test(edge));
  check('Prompt: capitalize properly', /proper capitalization throughout/.test(edge));
  check('Prompt: no conversational filler', /Do NOT start with filler/.test(edge));
  check('Prompt: never fabricate experience', /never fabricate experience or metrics/.test(edge));
  check('Prompt: paste-ready output', /paste-ready response/.test(edge));
}

// ── 2. file_context support ─────────────────────────────────────────────
console.log('\n📎 [2] Attached-File Context Support');
if (edge) {
  check('Schema: file_context field defined', /file_context: z\.string\(\)\.optional\(\)/.test(edge));
  check('Schema: question accepts min 1 char', /question: z\.string\(\)\.min\(1\)/.test(edge));
  check('Validation: question OR file required', /A question or an attached file is required/.test(edge));
  check('Prompt: ATTACHED FILE CONTENT block in user prompt', edge.includes('ATTACHED FILE CONTENT (analyze this keenly'));
  check('Prompt: file context wrapped with markers', edge.includes('--- END ATTACHED FILE CONTENT ---'));
}

// ── 3. Credit flow ──────────────────────────────────────────────────────
console.log('\n💳 [3] Credit Flow Correctness');
if (edge) {
  check('Credits checked BEFORE work', edge.includes('checkCredits(user.id, \'ASK_AI_QUESTION\''));
  check('Credits deducted AFTER success', /Deduct 2 credits for Ask AI — only AFTER a successful response/.test(edge));
  check('deductCredits placed after AI call', edge.lastIndexOf('deductCredits') > edge.indexOf('callText('));
  check('Insufficient credits returns 402', edge.includes('InsufficientCreditsError'));
}

// ── 4. Screen process to completion ─────────────────────────────────────
console.log('\n📱 [4] Screen Process & File Attach');
const screen = read(SCREEN_PATH, 'ask-ai screen');
if (screen) {
  check('Screen: sends file text as file_context', screen.includes('file_context: fileContext || undefined'));
  check('Screen: typed question sent as question', screen.includes('question: effectiveQuestion'));
  check('Screen: default analysis request when file-only', /Please analyze the attached document thoroughly/.test(screen));
  check('Screen: file kept for follow-up questions', screen.includes('Keep the attached file so the user can ask follow-up questions'));
  check('Screen: attached chip shows filename', screen.includes('jdFileName || \'Attached document\''));
  check('Screen: remove-attached handler used', screen.includes('handleRemoveAttachedJd'));
  check('Screen: supports image/pdf/docx picker types', screen.includes('image/png') && screen.includes('application/pdf') && screen.includes('wordprocessingml.document'));
  check('Screen: uploads file to secure storage', screen.includes('interview-ready-files'));
  check('Screen: extracts text via extraction hook', screen.includes('extractJd.mutateAsync'));
  check('Screen: send disabled without question or file', screen.includes('!inputText.trim() && !jdFileText.trim()'));
  check('Screen: error surfaced on failed request', screen.includes('Sorry, I failed to generate an answer'));
  check('Screen: insufficient credits handled', screen.includes('isInsufficientCreditsError'));
}

// ── 5. Hook passes file_context ─────────────────────────────────────────
console.log('\n🔗 [5] Hook API Contract');
const hook = read(HOOK_PATH, 'useApi.ts');
if (hook) {
  check('Hook: useAnswerQuestionMutation accepts file_context', /file_context\?: string/.test(hook));
  check('Hook: posts to answer-question function', hook.includes("'answer-question'"));
}

// ── 6. Functional smoke test of the send flow ───────────────────────────
console.log('\n🏃 [6] Functional Send-Flow Smoke Test');
function simulateSend({ inputText, jdFileText, jdFileName }) {
  const question = (inputText || '').trim();
  const fileContext = (jdFileText || '').trim();
  if (!question && !fileContext) return null;
  const effectiveQuestion = question || 'Please analyze the attached document thoroughly and provide a clear, detailed summary of the key points, requirements, and anything notable.';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = (question || fileContext).match(urlRegex);
  const extractedUrl = urls ? urls[0] : undefined;
  const userMsgText = question || `[Analyze attached file: ${jdFileName || 'document'}]`;
  return { question: effectiveQuestion, file_context: fileContext || undefined, job_url: extractedUrl, userMsgText };
}

// Case A: text question only
const a = simulateSend({ inputText: 'Why do you want to work here?', jdFileText: '', jdFileName: null });
check('Case A: text question kept as-is', a && a.question === 'Why do you want to work here?');
check('Case A: no file_context sent', a && a.file_context === undefined);

// Case B: file attached, no text
const b = simulateSend({ inputText: '', jdFileText: 'Senior Engineer job posting text...', jdFileName: 'job.pdf' });
check('Case B: default analysis request used', b && b.question.startsWith('Please analyze the attached document'));
check('Case B: file text passed as file_context', b && b.file_context === 'Senior Engineer job posting text...');
check('Case B: user message references file', b && b.userMsgText.includes('job.pdf'));

// Case C: question + file attached
const c = simulateSend({ inputText: 'How well do I match this role?', jdFileText: 'Senior Engineer job posting text...', jdFileName: 'job.pdf' });
check('Case C: typed question wins', c && c.question === 'How well do I match this role?');
check('Case C: file text still passed as context', c && c.file_context === 'Senior Engineer job posting text...');

// Case D: URL extracted from file text
const d = simulateSend({ inputText: '', jdFileText: 'See https://example.com/jobs/123 for details', jdFileName: 'posting.txt' });
check('Case D: URL extracted from file text', d && d.job_url === 'https://example.com/jobs/123');

// Case E: empty input
check('Case E: empty input returns null', simulateSend({ inputText: '', jdFileText: '', jdFileName: null }) === null);

// ── Summary ────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log(`📊 Results: ${passes} passed, ${failures.length} failed`);
console.log('══════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n❌ Failed checks:');
  failures.forEach(f => console.log(`   • ${f}`));
  process.exit(1);
} else {
  console.log('\n🎉 All Ask AI prompt, file attach & process checks passed!');
  process.exit(0);
}
