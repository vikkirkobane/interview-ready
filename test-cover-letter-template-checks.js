/**
 * Cover Letter Screen — Template & Output Quality Checks
 *
 * Static-analysis audit of the cover letter screen and its output pipeline.
 * Verifies that:
 *   1. Required details are displayed (labels, inputs, result display)
 *   2. Static UI text uses proper capitalization
 *   3. Elements are visible (conditional rendering logic, no hidden-by-default styles)
 *   4. HTML template includes all required letter sections
 *   5. DOCX export preserves all required fields
 *   6. Edge function validates + returns the full letter structure
 *   7. CoverLetter schema covers all required fields
 *
 * Run: node test-cover-letter-template-checks.js
 */

const fs = require('fs');
const path = require('path');

const SCREEN_PATH = path.join(__dirname, 'app', '(tabs)', 'cover-letter.tsx');
const HTML_PATH = path.join(__dirname, 'src', 'lib', 'coverLetterHTML.ts');
const EXPORT_PATH = path.join(__dirname, 'src', 'lib', 'coverLetterExport.ts');
const EDGE_PATH = path.join(__dirname, 'supabase', 'functions', 'cover-letters-create', 'index.ts');
const SCHEMA_PATH = path.join(__dirname, 'src', 'types', 'schemas.ts');

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

console.log('🔍 Cover Letter Screen — Template & Output Quality Checks\n');

// ── 1. Required details displayed on screen ─────────────────────────────
console.log('📋 [1] Required Details Displayed on Screen');
const screen = read(SCREEN_PATH, 'Cover letter screen');

if (screen) {
  // Page header
  check("Page title 'Cover Letter'", screen.includes('Cover Letter'));

  // Input labels (required fields)
  check("Company Name input label", screen.includes('Company Name *'), 'look for "Company Name *"');
  check("Role / Job Title input label", screen.includes('Role / Job Title *'), 'look for "Role / Job Title *"');
  check("Job URL input label", screen.includes('Job URL (Optional)'), 'look for "Job URL (Optional)"');
  check("Job Description input label", screen.includes('Job Description (Optional if URL Provided)'));

  // Tone selection
  const tonesPresent = ['Professional', 'Enthusiastic', 'Concise', 'Storytelling', 'Formal']
    .every(t => screen.includes(`'${t}'`));
  check("All 5 tone options present", tonesPresent);

  // Generate action
  check("Generate Cover Letter button", screen.includes('Generate Cover Letter'));

  // Result display elements
  check("Result label 'Your Cover Letter'", screen.includes('Your Cover Letter'));
  check("Copy-to-clipboard action", screen.includes('copy-outline'));
  check("Preview action", screen.includes('eye-outline'));
  check("Email Letter action", screen.includes('Email Letter'));
  check("Try Another Tone action", screen.includes('Try Another Tone'));
  check("Delete Cover Letter action", screen.includes('Delete Cover Letter'));

  // Loading state
  check("Loading state message", screen.includes('Crafting the perfect letter'));

  // ── 2. Proper capitalization of static text ──────────────────────────
  console.log('\n📝 [2] Proper Capitalization of Static Text');

  // Collect visible static strings and verify casing rules
  const visibleStrings = [
    // [text, rule, caseMode] — caseMode: 'title' or 'sentence'
    ['Generate a highly-tailored cover letter using AI.', 'sentence-case subtitle', 'sentence'],
    ['Target Job', 'Title Case section label', 'title'],
    ['Company Name *', 'Title Case label', 'title'],
    ['Role / Job Title *', 'Title Case label', 'title'],
    ['Job URL (Optional)', 'Title Case label', 'title'],
    ['Job Description (Optional if URL Provided)', 'Title Case label', 'title'],
    ['Select Tone', 'Title Case section label', 'title'],
    ['Generate Cover Letter', 'Title Case button label', 'title'],
    ['Your Cover Letter', 'Title Case result label', 'title'],
    ['Try Another Tone', 'Title Case button label', 'title'],
    ['Email Letter', 'Title Case button label', 'title'],
    ['Delete Cover Letter', 'Title Case button label', 'title'],
  ];

  const lowercaseWords = ['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'with', 'at', 'if'];
  for (const [text, rule, caseMode] of visibleStrings) {
    const present = screen.includes(text);
    if (!present) {
      check(`Static text "${text}" present`, false, 'string not found in screen');
      continue;
    }
    const words = text.split(/[\s()]/).filter(Boolean);
    let badWords = [];
    if (caseMode === 'title') {
      // Title Case: every word starts with a capital letter except known small words
      badWords = words.filter(w => {
        const bare = w.replace(/[^A-Za-z]/g, '');
        if (!bare) return false;
        if (lowercaseWords.includes(bare.toLowerCase())) return false;
        return bare[0] !== bare[0].toUpperCase();
      });
    } else {
      // Sentence case: only first word capitalised, remainder lowercase (allow proper nouns)
      const [first, ...rest] = words;
      const firstBare = first.replace(/[^A-Za-z]/g, '');
      if (firstBare && firstBare[0] !== firstBare[0].toUpperCase()) {
        badWords.push(`${first} (first word must be capitalised)`);
      }
      rest.forEach(w => {
        const bare = w.replace(/[^A-Za-z]/g, '');
        if (bare && bare.length > 1 && bare === bare[0].toUpperCase() + bare.slice(1).toLowerCase() && bare[0] === bare[0].toUpperCase()) {
          // Allow 'AI.' acronym; otherwise mid-sentence capitals beyond proper nouns are a warning
          if (bare !== 'AI' && bare !== 'ATS') badWords.push(`${w} (unexpected mid-sentence capital)`);
        }
      });
    }
    check(`Capitalization OK: "${text}" (${rule})`, badWords.length === 0, badWords.join(', '));
  }

  // ── 3. Element visibility ─────────────────────────────────────────────
  console.log('\n👁️  [3] Element Visibility');

  // No hard-hidden styles on core containers
  check("No `display: 'none'` on setup/result containers",
    !screen.includes("display: 'none'") && !screen.includes('display: "none"'));
  check("No `opacity: 0` on core UI",
    !screen.includes('opacity: 0') && !screen.includes('opacity: 0.0'));

  // Conditional rendering states are correct
  check("Setup card shown only when no letter & not generating",
    screen.includes('!generatedLetter && !generating'));
  check("Loading shown while generating",
    screen.includes('{generating &&'));
  check("Result shown only when letter exists & not generating",
    screen.includes('generatedLetter && !generating'));
  check("URL error surfaced inline",
    screen.includes('urlError'));

  // Icon buttons must have proper hit area and visible color
  check("Copy button uses visible primary color",
    screen.includes('color={colors.primary}'));
  check("Document text is editable (multiline TextInput)",
    screen.includes('multiline'));

  // ── 4. HTML template completeness ─────────────────────────────────────
  console.log('\n🌐 [4] HTML Template Completeness');
  const html = read(HTML_PATH, 'coverLetterHTML.ts');

  if (html) {
    check("HTML: candidate name block", html.includes('candidate_name'), 'header name rendered');
    check("HTML: contact line (phone/email/linkedin/portfolio)", html.includes('contactParts'));
    check("HTML: date block", html.includes('h.date'));
    check("HTML: hiring manager block", html.includes('hiring_manager'));
    check("HTML: company name block", html.includes('company_name'));
    check("HTML: company address block", html.includes('company_address'));
    check("HTML: salutation block", html.includes('cl.salutation'));
    check("HTML: all 4 body paragraphs", ['opening', 'body_1', 'body_2', 'closing'].every(k => html.includes(k)));
    check("HTML: sign-off closing phrase", html.includes('closing_phrase'));
    check("HTML: sign-off name", html.includes('sign_off?.name'));
    check("HTML: A4 print layout", html.includes('A4'));
  }

  // ── 5. DOCX export completeness ───────────────────────────────────────
  console.log('\n📄 [5] DOCX Export Completeness');
  const docx = read(EXPORT_PATH, 'coverLetterExport.ts');

  if (docx) {
    check("DOCX: candidate name", docx.includes('h.candidate_name'));
    check("DOCX: contact parts", docx.includes('contactParts'));
    check("DOCX: date", docx.includes('h.date'));
    check("DOCX: hiring manager", docx.includes('hiring_manager'));
    check("DOCX: company name", docx.includes('h.company_name'));
    check("DOCX: company address", docx.includes('company_address'));
    check("DOCX: salutation", docx.includes('cl.salutation'));
    check("DOCX: body paragraphs", ['p.opening', 'p.body_1', 'p.body_2', 'p.closing'].every(k => docx.includes(k)));
    check("DOCX: sign-off", docx.includes('closing_phrase') && docx.includes('sign_off.name'));
  }

  // ── 6. Edge function validation + return shape ────────────────────────
  console.log('\n🛠️  [6] Edge Function (cover-letters-create)');
  const edge = read(EDGE_PATH, 'cover-letters-create index.ts');

  if (edge) {
    check("Edge: requires job_title", edge.includes("job_title: z.string().min(1)"));
    check("Edge: requires company_name", edge.includes("company_name: z.string().min(1)"));
    check("Edge: tone enum enforced", edge.includes("tone: z.enum"));
    check("Edge: URL validated", edge.includes("job_url: z.string().url()"));
    check("Edge: credits checked", edge.includes('checkCredits'));
    check("Edge: credits deducted", edge.includes('deductCredits'));
    check("Edge: returns cover_letter", edge.includes('cover_letter: generatedLetter'));
    check("Edge: full JSON structure in prompt", edge.includes('"paragraphs"') && edge.includes('"sign_off"'));
    check("Edge: salutation default in prompt", edge.includes("Dear [Name],") || edge.includes("Dear Hiring Manager,"));
  }

  // ── 7. CoverLetter schema completeness ────────────────────────────────
  console.log('\n📐 [7] CoverLetter Schema Completeness');
  const schema = read(SCHEMA_PATH, 'schemas.ts');

  if (schema) {
    const headerFields = ['candidate_name', 'phone', 'email', 'linkedin', 'portfolio', 'date', 'hiring_manager', 'company_name', 'company_address'];
    check("Schema: all 9 header fields", headerFields.every(f => schema.includes(f)));
    check("Schema: 4 body paragraphs", ['opening', 'body_1', 'body_2', 'closing'].every(k => schema.includes(k)));
    check("Schema: sign_off with closing_phrase & name",
      schema.includes('closing_phrase') && schema.includes('name'));
    check("Schema: salutation field", schema.includes('salutation'));
  }
}

// ── Summary ────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log(`📊 Results: ${passes} passed, ${failures.length} failed`);
console.log('══════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n❌ Failed checks:');
  failures.forEach(f => console.log(`   • ${f}`));
  process.exit(1);
} else {
  console.log('\n🎉 All cover letter screen template & output checks passed!');
  process.exit(0);
}
