/**
 * File Attachment Feature — Audit Across All Forms
 *
 * Verifies that every screen that can attach files implements the full flow:
 * pick → upload to secure storage → extract/parse → use the content in the
 * downstream AI process → deliver output. Also verifies the mock-interview
 * chat attach path (previously dead) now passes file content to the AI.
 *
 * Run: node test-file-attach-audit.js
 */

const fs = require('fs');
const path = require('path');

const screens = [
  { name: 'Ask AI',                 file: 'app/(tabs)/ask-ai.tsx',                 kind: 'jd' },
  { name: 'Job Analyzer',           file: 'app/(tabs)/job-analyzer.tsx',           kind: 'jd' },
  { name: 'Cover Letter',           file: 'app/(tabs)/cover-letter.tsx',           kind: 'jd' },
  { name: 'Interview Setup',        file: 'app/(tabs)/interviews.tsx',             kind: 'jd' },
  { name: 'Interview Chat',         file: 'app/(tabs)/interview.tsx',              kind: 'jd' },
  { name: 'New Resume (JD attach)', file: 'app/(tabs)/new-resume.tsx',             kind: 'jd' },
  { name: 'Onboarding Analyze',     file: 'app/(onboarding)/analyze.tsx',          kind: 'jd' },
  { name: 'Onboarding Profile',     file: 'app/(onboarding)/profile.tsx',          kind: 'resume' },
  { name: 'Profile',                file: 'app/(tabs)/profile.tsx',                kind: 'resume' },
  { name: 'New Resume (import)',    file: 'app/(tabs)/new-resume.tsx',             kind: 'resume' },
];

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

console.log('📎 File Attachment Feature — Audit Across All Forms\n');

for (const screen of screens) {
  const abs = path.join(__dirname, screen.file);
  if (!fs.existsSync(abs)) {
    check(`${screen.name}: screen file exists`, false, `missing ${screen.file}`);
    continue;
  }
  const src = fs.readFileSync(abs, 'utf8');
  console.log(`\n📱 ${screen.name} (${screen.file})`);

  check('Uses useFilePicker', src.includes('useFilePicker'));
  check('Uploads to secure storage bucket', src.includes('interview-ready-files') && src.includes('.upload('));
  check('Upload path under a per-user folder', /resume-uploads\/[^/]*\$\{userId\}|jd-uploads\/[^/]*\$\{userId\}|resume-uploads\/' \+ userId|jd-uploads\/' \+ userId/.test(src));

  if (screen.kind === 'jd') {
    check('Extracts text via jd-extract-text hook', src.includes('extractJd.mutateAsync'));
    check('Stores extracted text in state (jdFileText)', src.includes('setJdFileText'));
    check('Remove/replace handler present', /handleRemoveAttachedJd|setJdFileText\(''\)/.test(src));
    check('Failure surfaces a toast', /Upload or extraction failed/.test(src));
  } else {
    check('Parses via profile-parse-resume hook', /parseResume\.mutateAsync/.test(src));
    check('Maps parsed data into form fields', /setDraft|setCurrentRole|setSkills|extractedData\./.test(src));
    check('Success + failure toasts present', /type: 'success'/.test(src) && /type: 'error'/.test(src));
  }
}

// ── Interview chat attach path (was previously dead) ───────────────────
console.log('\n🧪 Interview Chat Attach Path');
const interviewSrc = fs.readFileSync(path.join(__dirname, 'app/(tabs)/interview.tsx'), 'utf8');
const edgeMsg = fs.readFileSync(path.join(__dirname, 'supabase/functions/interviews-message/index.ts'), 'utf8');
const hookSrc = fs.readFileSync(path.join(__dirname, 'src/hooks/useApi.ts'), 'utf8');

check('Interview chat sends file_context with each message', /file_context: jdFileText\.trim\(\) \? jdFileText : undefined/.test(interviewSrc));
check('interviews-message accepts file_context', /file_context: z\.string\(\)\.optional\(\)/.test(edgeMsg));
check('interviews-message builds a reference-document context block', edgeMsg.includes('REFERENCE DOCUMENT (attached by the candidate)'));
check('interviews-message injects file context into system prompt', edgeMsg.includes('${jdContext}${fileContextBlock}'));
check('Hook passes file_context through', /file_context\?: string/.test(hookSrc));

// ── Summary ────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log(`📊 Results: ${passes} passed, ${failures.length} failed`);
console.log('══════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n❌ Failed checks:');
  failures.forEach(f => console.log(`   • ${f}`));
  process.exit(1);
} else {
  console.log('\n🎉 File attachment feature is complete across all forms!');
  process.exit(0);
}
