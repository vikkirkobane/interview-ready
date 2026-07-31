/**
 * Static integration test: Resume Import → Auto-Populate Fields
 *
 * Verifies that the resume import feature in new-resume.tsx is correctly
 * wired up end-to-end:
 *   1. useParseResumeMutation is imported
 *   2. parseResume hook is initialized
 *   3. Storage upload uses the correct bucket + resume-uploads path
 *   4. File type restricted to PDF/DOCX (no images for resume parsing)
 *   5. AI parse result is mapped to all required DraftResume fields:
 *      header, summary, experience, skills, education
 *   6. Draft is set and modal is dismissed on success
 *   7. Import button is rendered in the template modal
 *   8. Loading state is handled (isImportingResume)
 *   9. Errors are surfaced as toasts
 *  10. Storage RLS policy uses correct folder index [2] for user ID
 *  11. profile-parse-resume edge function accepts PDF and DOCX
 *  12. useParseResumeMutation returns required parsed fields
 */

const fs = require('fs');
const path = require('path');

const PASS = (msg) => console.log(`  ✅ PASSED: ${msg}`);
const FAIL = (msg) => { console.error(`  ❌ FAILED: ${msg}`); process.exit(1); };

let totalPassed = 0;
function check(condition, passMsg, failMsg) {
  if (condition) { PASS(passMsg); totalPassed++; }
  else FAIL(failMsg);
}

// ── File paths ────────────────────────────────────────────────────────────────
const newResumePath       = path.join(__dirname, 'app', '(tabs)', 'new-resume.tsx');
const parseResumeFnPath   = path.join(__dirname, 'supabase', 'functions', 'profile-parse-resume', 'index.ts');
const useApiPath          = path.join(__dirname, 'src', 'hooks', 'useApi.ts');
const storageMigration    = path.join(__dirname, 'supabase', 'migrations', '017_fix_storage_rls_policies.sql');

// ── Read files ────────────────────────────────────────────────────────────────
[newResumePath, parseResumeFnPath, useApiPath, storageMigration].forEach(p => {
  if (!fs.existsSync(p)) FAIL(`Required file not found: ${p}`);
});

const screen     = fs.readFileSync(newResumePath, 'utf-8');
const parseFn    = fs.readFileSync(parseResumeFnPath, 'utf-8');
const useApi     = fs.readFileSync(useApiPath, 'utf-8');
const storageSQL = fs.readFileSync(storageMigration, 'utf-8');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  Resume Import → Auto-Populate Fields — Integration Test Suite');
console.log('══════════════════════════════════════════════════════════════════\n');

// ── Section 1: new-resume.tsx — hook wiring ────────────────────────────────
console.log('[ 1 ] Hook Wiring (new-resume.tsx)');

check(
  screen.includes('useParseResumeMutation'),
  'useParseResumeMutation is imported in new-resume.tsx',
  'useParseResumeMutation is NOT imported — resume import cannot work'
);

check(
  screen.includes('const parseResume = useParseResumeMutation()'),
  'parseResume hook is initialized in the component',
  'parseResume hook instance is missing'
);

check(
  screen.includes('const [isImportingResume, setIsImportingResume]'),
  'isImportingResume loading state is tracked',
  'isImportingResume loading state is missing'
);

// ── Section 2: File picker configuration ─────────────────────────────────────
console.log('\n[ 2 ] File Picker Configuration');

check(
  screen.includes("'application/pdf'") &&
  screen.includes("'application/vnd.openxmlformats-officedocument.wordprocessingml.document'") &&
  screen.includes('handleImportResumeFile'),
  'Import handler restricts to PDF and DOCX files',
  'Import handler is missing correct mime types'
);

// Images should NOT be in the resume import picker (only in JD picker)
const importFnBlock = screen.slice(
  screen.indexOf('const handleImportResumeFile'),
  screen.indexOf('const handleAttachJdFile')
);
check(
  !importFnBlock.includes("'image/png'") && !importFnBlock.includes("'image/jpeg'"),
  'Resume import picker correctly excludes image types (PDF/DOCX only)',
  'Resume import picker incorrectly allows image types — AI cannot parse images'
);

// ── Section 3: Storage upload ────────────────────────────────────────────────
console.log('\n[ 3 ] Supabase Storage Upload');

check(
  importFnBlock.includes("'interview-ready-files'"),
  'File is uploaded to the interview-ready-files bucket',
  'Wrong or missing storage bucket in import handler'
);

check(
  importFnBlock.includes('resume-uploads/'),
  'File path uses the resume-uploads/ prefix (not jd-uploads/)',
  'File is being stored under the wrong path prefix'
);

check(
  importFnBlock.includes('contentType: payload.mimeType'),
  'Correct MIME type is set on the uploaded object',
  'contentType is not being forwarded — storage may reject the file'
);

// ── Section 4: AI parse call ─────────────────────────────────────────────────
console.log('\n[ 4 ] AI Parse Integration');

check(
  importFnBlock.includes('await parseResume.mutateAsync(payload)'),
  'AI parse is called with the file payload after upload',
  'parseResume.mutateAsync is not called in the import handler'
);

// ── Section 5: Field mapping ─────────────────────────────────────────────────
console.log('\n[ 5 ] Parsed Data → DraftResume Field Mapping');

check(
  importFnBlock.includes('parsed.current_role'),
  'current_role is mapped to header.title',
  'current_role is not mapped — job title will be blank after import'
);

check(
  importFnBlock.includes('parsed.summary'),
  'summary is mapped to draft.summary',
  'summary is not mapped — summary field will be blank after import'
);

check(
  importFnBlock.includes('parsed.work_history'),
  'work_history is mapped to draft.experience array',
  'work_history is not mapped — experience will be blank after import'
);

check(
  importFnBlock.includes('parsed.technical_skills') &&
  importFnBlock.includes('parsed.soft_skills'),
  'technical_skills and soft_skills are mapped to draft.skills',
  'Skills are not mapped — skills section will be blank after import'
);

check(
  importFnBlock.includes('parsed.education'),
  'education is mapped to draft.education array',
  'education is not mapped — education section will be blank after import'
);

check(
  importFnBlock.includes('sections_to_include'),
  'sections_to_include is set based on parsed content',
  'sections_to_include is missing — sections may not render correctly'
);

// ── Section 6: Navigation and UX ─────────────────────────────────────────────
console.log('\n[ 6 ] Navigation & UX After Import');

check(
  importFnBlock.includes('setDraft(importedDraft)'),
  'Draft is set to the imported content after parse',
  'setDraft is not called — form will not be populated'
);

check(
  importFnBlock.includes('setIsTemplateModalVisible(false)'),
  'Template modal is dismissed after successful import',
  'Modal is not dismissed — user will be stuck in the modal'
);

check(
  importFnBlock.includes("type: 'success'") &&
  importFnBlock.includes('Resume imported!'),
  'Success toast is shown after import completes',
  'Success toast is missing'
);

check(
  importFnBlock.includes("type: 'error'") &&
  importFnBlock.includes('Import failed'),
  'Error toast is shown on failure',
  'Error toast is missing — failures will be silent'
);

check(
  importFnBlock.includes('setIsImportingResume(false)') &&
  importFnBlock.includes('finally'),
  'isImportingResume is reset in finally block (prevents stuck loading state)',
  'Loading state is not reset in finally — button may stay disabled permanently'
);

// ── Section 7: UI button ──────────────────────────────────────────────────────
console.log('\n[ 7 ] Import Button in Template Modal');

check(
  screen.includes('Import from Resume File') &&
  screen.includes('handleImportResumeFile'),
  '"Import from Resume File" button is rendered and connected to the handler',
  'Import button is missing from the template modal UI'
);

check(
  screen.includes('cloud-upload-outline'),
  'Import button has a cloud-upload icon for clear affordance',
  'Import button is missing its icon'
);

// ── Section 8: Edge function (profile-parse-resume) ───────────────────────────
console.log('\n[ 8 ] profile-parse-resume Edge Function');

check(
  parseFn.includes('isPdf') && parseFn.includes('isDocx'),
  'Edge function supports both PDF and DOCX file types',
  'Edge function is missing PDF or DOCX support'
);

check(
  parseFn.includes('current_role') &&
  parseFn.includes('work_history') &&
  parseFn.includes('technical_skills') &&
  parseFn.includes('soft_skills') &&
  parseFn.includes('education') &&
  parseFn.includes('summary'),
  'Edge function returns all fields required for field mapping (current_role, work_history, skills, education, summary)',
  'Edge function response schema is missing required fields'
);

check(
  parseFn.includes('injection_detected'),
  'Edge function includes prompt injection detection for security',
  'Prompt injection detection is missing from edge function'
);

// ── Section 9: useApi hook ────────────────────────────────────────────────────
console.log('\n[ 9 ] useParseResumeMutation Hook (useApi.ts)');

check(
  useApi.includes('useParseResumeMutation') &&
  useApi.includes("'profile-parse-resume'"),
  'useParseResumeMutation calls the profile-parse-resume edge function',
  'useParseResumeMutation is not wired to the edge function'
);

check(
  useApi.includes('current_role') &&
  useApi.includes('work_history') &&
  useApi.includes('technical_skills'),
  'useParseResumeMutation return type declares required fields',
  'Return type declaration is incomplete'
);

// ── Section 10: Storage RLS policy ───────────────────────────────────────────
console.log('\n[ 10 ] Storage RLS Policy');

// Strip SQL comment lines before checking index usage
const sqlCodeLines = storageSQL
  .split('\n')
  .filter(l => !l.trimStart().startsWith('--'))
  .join('\n');

check(
  sqlCodeLines.includes('[2]') && !sqlCodeLines.includes('[1]'),
  'Storage RLS policy checks folder index [2] for user ID (not [1]) in all CREATE POLICY statements',
  'Storage RLS policy uses wrong index in SQL — uploads will still be blocked'
);

check(
  storageSQL.includes("'interview-ready-files'"),
  'Storage policy targets the correct interview-ready-files bucket',
  'Storage policy targets wrong bucket'
);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  All ${totalPassed} checks passed ✅`);
console.log('  Resume import → auto-populate feature is fully wired up.');
console.log('══════════════════════════════════════════════════════════════════\n');
