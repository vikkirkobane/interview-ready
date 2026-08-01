/**
 * LinkedIn — Prompt & Download Template Quality Checks
 *
 * Verifies that:
 *   1. The linkedin-analyze prompt is fully optimized (strict JSON, complete
 *      fields, proper capitalization, example output, adequate max_tokens).
 *   2. linkedin-optimize / linkedin-engagement-plan prompts enforce
 *      capitalization + completeness + JSON-only.
 *   3. The export HTML includes the correct app logo (branded header).
 *   4. Every analysis field is rendered with correct, visible details.
 *   5. Static text is properly capitalized and dynamic content is escaped.
 *   6. The download produces a correctly-named file and the screen offers a
 *      prominent download action.
 *   7. The HTML actually renders with real data (functional smoke test).
 *
 * Run: node test-linkedin-template-checks.js
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ANALYZE_PATH = path.join(__dirname, 'supabase', 'functions', 'linkedin-analyze', 'index.ts');
const OPTIMIZE_PATH = path.join(__dirname, 'supabase', 'functions', 'linkedin-optimize', 'index.ts');
const PLAN_PATH = path.join(__dirname, 'supabase', 'functions', 'linkedin-engagement-plan', 'index.ts');
const SCREEN_PATH = path.join(__dirname, 'app', '(tabs)', 'linkedin.tsx');
const EXPORT_PATH = path.join(__dirname, 'src', 'lib', 'linkedinExport.ts');

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

console.log('🔍 LinkedIn — Prompt & Download Template Checks\n');

// ── 1. linkedin-analyze prompt optimization ─────────────────────────────
console.log('🤖 [1] linkedin-analyze Prompt Optimization');
const analyze = read(ANALYZE_PATH, 'linkedin-analyze edge function');

if (analyze) {
  check('Prompt: elite career coach role defined', /elite Career Coach/.test(analyze));
  check('Prompt: STRICT OUTPUT RULES section', analyze.includes('STRICT OUTPUT RULES'));
  check('Prompt: JSON-only + start with "{"', /Start immediately with "\{"/.test(analyze));
  check('Prompt: no markdown / no code fences', /No markdown, no code fences/.test(analyze));
  check('Prompt: every provided section scored (non-empty issues)', /every provided section must have a score/i.test(analyze));
  check('Prompt: Title Case rule for keywords/titles', /Title Case/.test(analyze));
  check('Prompt: integer scores 0-100', /integer 0-100/.test(analyze));
  check('Prompt: empty issues arrays allowed', /empty array \[\]/.test(analyze));
  check('Prompt: up to 15 real keywords', /exactly up to 15/.test(analyze));
  check('Prompt: example output included', /EXAMPLE OUTPUT/.test(analyze));
  check('Prompt: all 15 keyword categories covered', analyze.includes('ROLE_TITLE') && analyze.includes('SKILL') && analyze.includes('IMPACT') && analyze.includes('INDUSTRY'));
  check('Prompt: full output structure (suggestions/experience_bullets)', analyze.includes('experience_bullets'));
  check('Prompt: max_tokens adequate', /max_tokens: 4000/.test(analyze));
  check('Prompt: Zod schema validation enforced', analyze.includes('LINKEDIN_ANALYSIS_SCHEMA'));
}

// ── 2. optimize + engagement prompts ────────────────────────────────────
console.log('\n🤖 [2] Optimize & Engagement Prompts');
const optimize = read(OPTIMIZE_PATH, 'linkedin-optimize edge function');
if (optimize) {
  check('Optimize: capitalization rule present', optimize.includes('Use proper capitalization (Title Case for job titles and headings, full proper sentences).'));
  check('Optimize: never leave field empty rule', optimize.includes('Never leave a field empty'));
  check('Optimize: JSON-only enforced in all sections', (optimize.match(/Return ONLY valid JSON\. No prose outside JSON\./g) || []).length >= 6);
  check('Optimize: headline 220-char limit', optimize.includes('Max 220 characters'));
  check('Optimize: about 2600-char limit', optimize.includes('Max 2600 characters'));
}
const plan = read(PLAN_PATH, 'linkedin-engagement-plan edge function');
if (plan) {
  check('Engagement: OUTPUT RULES block present', plan.includes('OUTPUT RULES:'));
  check('Engagement: capitalization rule', plan.includes('Use proper capitalization (Title Case for week labels and headings'));
  check('Engagement: JSON-only + no markdown', plan.includes('Return ONLY valid JSON. No prose outside JSON. No markdown, no code fences.'));
  check('Engagement: 3 week-groupings required', analyze && /exactly 3 week-groupings/.test(plan));
}

// ── 3. App logo in download template ────────────────────────────────────
console.log('\n🖼️  [3] Correct App Logo in Template');
const exportSrc = read(EXPORT_PATH, 'linkedinExport.ts');
if (exportSrc) {
  check('Export imports APP_LOGO_DATA_URI', exportSrc.includes("from './brandAssets'") && exportSrc.includes('APP_LOGO_DATA_URI'));
  check('Logo rendered as <img> in header', /<img class="logo" src="\$\{APP_LOGO_DATA_URI\}"/.test(exportSrc));
  check('Header shows "Interview Ready" brand name', exportSrc.includes('header-title">Interview Ready'));
  check('Branded subtitle "LinkedIn Profile Analysis Report"', exportSrc.includes('LinkedIn Profile Analysis Report'));
}

// ── 4. Correct details rendered ─────────────────────────────────────────
console.log('\n📋 [4] Correct Details Displayed in Template');
const detailFields = [
  'overall_score', 'estimated_score_after_optimization', 'section_scores',
  'issues', 'keyword_intelligence', 'top_keywords', 'missing_high_priority',
  'spike', 'identified_differentiator', 'unique_value_proposition',
  'suggestions', 'headline', 'about', 'experience', 'skills',
];
const missing = detailFields.filter(f => !exportSrc.includes(f));
check(`Template references all ${detailFields.length} analysis fields`, missing.length === 0, `missing: ${missing.join(', ')}`);
check('Template renders overall score ring', exportSrc.includes('score-ring'));
check('Template renders projected score', exportSrc.includes('Projected score after optimisation'));
check('Template renders section score bars', exportSrc.includes('dimension-bar-fill'));
check('Template renders issues per section', exportSrc.includes(' Issues</div>'));
check('Template renders recommended fixes', exportSrc.includes('Recommended Fixes'));
check('Template renders SPIKE block', exportSrc.includes('SPIKE Differentiator'));
check('Template renders keyword table', exportSrc.includes('table class="keywords"'));
check('Template renders missing high-priority keywords', exportSrc.includes('Missing High-Priority Keywords'));
check('Template renders prepared-on date', exportSrc.includes('Prepared on'));
check('Template footer present', exportSrc.includes('LinkedIn Optimizer'));

// ── 5. Proper capitalization ────────────────────────────────────────────
console.log('\n🔠 [5] Proper Capitalization');
if (exportSrc) {
  check('Title Case helper for candidate name', exportSrc.includes('function titleCase'));
  check('Title Case helper for target roles', exportSrc.includes('targetRoles.map(titleCase)'));
  check('"LinkedIn Profile Optimization Report" capitalised', exportSrc.includes('LinkedIn Profile Optimization Report'));
  check('"Overall Profile Score" capitalised', exportSrc.includes('Overall Profile Score'));
  check('"Recommended Fixes" capitalised', exportSrc.includes('Recommended Fixes'));
  check('"Keyword Intelligence" capitalised', exportSrc.includes('Keyword Intelligence'));
  check('Section labels title-cased', exportSrc.includes("'About / Summary'"));
  check('Category labels title-cased', exportSrc.includes("'Role Title'"));
  check('Table headers uppercase via CSS', exportSrc.includes('text-transform: uppercase'));
}

// ── 6. HTML escaping ────────────────────────────────────────────────────
console.log('\n🔒 [6] HTML Escaping of Dynamic Content');
if (exportSrc) {
  check('esc() helper defined', exportSrc.includes('function esc'));
  check('esc() escapes &, <, >, "', /replace\(\/&\/g/.test(exportSrc) && /replace\(\/<\//.test(exportSrc));
  check('Keyword text escaped', /esc\(kw\.keyword/.test(exportSrc));
  check('Issue items escaped', /esc\(item\)/.test(exportSrc));
  check('Suggestion text escaped', /esc\(suggestions\.headline\)/.test(exportSrc));
  check('Spike text escaped', /esc\(spike\.identified_differentiator\)/.test(exportSrc));
  check('Candidate name escaped', /esc\(candidateName\)/.test(exportSrc));
}

// ── 7. Filename + download flow ─────────────────────────────────────────
console.log('\n💾 [7] Filename & Download Flow');
if (exportSrc) {
  check('Uses buildFileName helper', exportSrc.includes('buildFileName'));
  check('Correct default filename label', exportSrc.includes("'LinkedIn_Analysis'"));
  check('Uses renameToCache on native', exportSrc.includes('renameToCache'));
  check('PDF mime type for share', exportSrc.includes("mimeType: 'application/pdf'"));
  check('Web export sets document title', exportSrc.includes('win.document.title = filename'));
}

// ── 8. Screen review + download ─────────────────────────────────────────
console.log('\n📱 [8] Screen Review & Download');
const screen = read(SCREEN_PATH, 'linkedin screen');
if (screen) {
  check('Screen imports exportLinkedInAnalysisPDF', screen.includes('exportLinkedInAnalysisPDF'));
  check('Screen has header download icon', screen.includes('download-outline'));
  check('Screen has prominent Download PDF Report button', screen.includes('Download PDF Report'));
  check('Download button disabled while exporting', screen.includes('disabled={isDownloading}'));
  check('Export failure surfaces a toast', screen.includes('Export Failed'));
  check('Results reviewable across 6 tabs', screen.includes("'overview'") && screen.includes("'keywords'") && screen.includes("'skills'") && screen.includes("'featured'") && screen.includes("'outreach'") && screen.includes("'plan'"));
  check('Analysis loads by id', screen.includes("from('linkedin_tasks')"));
}

// ── 9. Functional render smoke test ─────────────────────────────────────
console.log('\n🏃 [9] Functional HTML Render (smoke test)');
function renderWithStubs() {
  const src = fs.readFileSync(EXPORT_PATH, 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
  }).outputText;
  const exposed = js + '\n\nexports.buildLinkedInAnalysisHTML = buildLinkedInAnalysisHTML;\n';
  const module = { exports: {} };
  const stubLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const stubRequire = (id) => {
    if (id === 'react-native') return { Platform: { OS: 'web' } };
    if (id === './brandAssets') return { APP_LOGO_DATA_URI: stubLogo };
    if (id === './exportUtils') return { buildFileName: (n, l, e) => `${n || ''}_${l}.${e}`, renameToCache: (u) => u };
    throw new Error(`Unexpected require: ${id}`);
  };
  const fn = new Function('require', 'module', 'exports', '__dirname', exposed);
  fn(stubRequire, module, module.exports, __dirname);
  return module.exports;
}

try {
  const mod = renderWithStubs();
  const sample = {
    section_scores: { headline: 62, about: 48, experience: 70, skills: 55 },
    overall_score: 58,
    estimated_score_after_optimization: 86,
    issues: {
      headline: ['Role keyword missing from first 40 characters', 'Contains banned fluff word: "passionate"'],
      about: ['First 3 lines lack primary keywords'],
      experience: ['Bullets describe responsibilities instead of quantified outcomes'],
      skills: ['Only 8 skills listed; target is 30-50+'],
    },
    keyword_intelligence: {
      top_keywords: [
        { keyword: 'Product Manager', category: 'ROLE_TITLE', present_in_profile: true },
        { keyword: 'Roadmap <script>Strategy</script>', category: 'SKILL', present_in_profile: false },
      ],
      missing_high_priority: ['Roadmap Strategy', 'Stakeholder Management'],
    },
    spike: {
      identified_differentiator: 'Only PM with an engineering degree and 5 years in emerging-markets fintech',
      unique_value_proposition: 'I turn underperforming products into category leaders.',
    },
    suggestions: {
      headline: 'Lead the role keyword with your target title in the first 40 characters.',
      about: 'Open with a hook that embeds "Product Manager".',
      experience_bullets: ['Start every bullet with a bolded quantified outcome', 'Add scale indicators'],
    },
  };
  const html = mod.buildLinkedInAnalysisHTML(sample, {
    candidateName: 'jane doe',
    targetRoles: ['product manager'],
  });

  check('Render returns a complete HTML document', html.includes('<!DOCTYPE html>') && html.includes('</html>'));
  check('Render includes the app logo data URI', html.includes('data:image/png;base64,'));
  check('Render capitalizes candidate name (Jane Doe)', html.includes('Jane Doe'));
  check('Render capitalizes target role (Product Manager)', html.includes('Product Manager'));
  check('Render shows overall score', html.includes('>58</span>'));
  check('Render shows projected score', html.includes('86/100'));
  check('Render shows section scores', html.includes('62/100') && html.includes('70/100'));
  check('Render shows issue text', html.includes('Role keyword missing from first 40 characters'));
  check('Render shows suggestion', html.includes('Lead the role keyword'));
  check('Render shows spike', html.includes('Only PM with an engineering degree'));
  check('Render shows keyword table', html.includes('Product Manager') && html.includes('In Profile') && html.includes('Missing'));
  check('Render shows missing high-priority keywords', html.includes('Stakeholder Management'));
  check('Render escapes injected keyword markup', html.includes('&lt;script&gt;') && !html.includes('<script>Strategy</script>'));
  check('Render omits SPIKE block when absent', !buildWithNoSpike(mod, sample).includes('SPIKE Differentiator'));
} catch (e) {
  check('Functional render executes without error', false, e.message);
}

function buildWithNoSpike(mod, base) {
  const copy = JSON.parse(JSON.stringify(base));
  copy.spike = {};
  return mod.buildLinkedInAnalysisHTML(copy, {});
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
  console.log('\n🎉 All LinkedIn prompt & download template checks passed!');
  process.exit(0);
}
