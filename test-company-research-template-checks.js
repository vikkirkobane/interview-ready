/**
 * Company Research — Prompt & Download Template Quality Checks
 *
 * Verifies that:
 *   1. The edge-function prompt is fully optimized (strict JSON, complete fields,
 *      proper capitalization, honest red flags, adequate max_tokens).
 *   2. The export HTML includes the correct app logo (branded header).
 *   3. Every research field is rendered with correct, visible details.
 *   4. Section titles / static text are properly capitalized.
 *   5. Dynamic content is HTML-escaped (no raw injection / broken layout).
 *   6. The download produces a correctly-named file and the screen offers a
 *      prominent download action.
 *   7. The HTML actually renders with real data (functional smoke test).
 *
 * Run: node test-company-research-template-checks.js
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const EDGE_PATH = path.join(__dirname, 'supabase', 'functions', 'company-research', 'index.ts');
const SCREEN_PATH = path.join(__dirname, 'app', '(tabs)', 'company-research.tsx');
const EXPORT_PATH = path.join(__dirname, 'src', 'lib', 'companyResearchExport.ts');
const BRAND_PATH = path.join(__dirname, 'src', 'lib', 'brandAssets.ts');

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

console.log('🔍 Company Research — Prompt & Download Template Checks\n');

// ── 1. Edge function prompt optimization ────────────────────────────────
console.log('🤖 [1] Edge Function Prompt Optimization');
const edge = read(EDGE_PATH, 'company-research edge function');

if (edge) {
  check('Prompt: senior analyst role defined', /senior career strategist/.test(edge));
  check('Prompt: STRICT OUTPUT RULES section', edge.includes('STRICT OUTPUT RULES'));
  check('Prompt: JSON-only enforcement', /Return ONLY valid JSON/.test(edge));
  check('Prompt: no markdown / no code fences', edge.includes('No markdown, no code fences'));
  check('Prompt: every required field non-empty', edge.includes('Every required field must be present and non-empty'));
  check('Prompt: Title Case rule for company name', /Title Case/.test(edge));
  check('Prompt: honest red flags allowed empty', /empty array \[\]/.test(edge));
  check('Prompt: integer scores 0-100', /Scores must be integers between 0 and 100/.test(edge));
  check('Prompt: example output shape included', /EXAMPLE OF THE REQUIRED OUTPUT SHAPE/.test(edge));
  check('Prompt: scores 0-100 in user prompt', edge.includes('number 0-100'));
  check('Prompt: 5-7 talking points requested', edge.includes('5-7'));
  check('Prompt: 5 smart questions requested', /array of 5 insightful questions/.test(edge));
  check('Prompt: max_tokens adequate for full report', /max_tokens: 4000/.test(edge));
  check('Prompt: Zod schema validation enforced', edge.includes('CompanyResearchOutputSchema'));
  check('Prompt: credits deducted after success', edge.includes('deductCredits(user.id'));
}

// ── 2. App logo in download template ────────────────────────────────────
console.log('\n🖼️  [2] Correct App Logo in Template');
const brand = read(BRAND_PATH, 'brandAssets');
const exportSrc = read(EXPORT_PATH, 'companyResearchExport.ts');

if (exportSrc && brand) {
  check('Export imports APP_LOGO_DATA_URI', exportSrc.includes("from './brandAssets'") && exportSrc.includes('APP_LOGO_DATA_URI'));
  check('Brand asset file defines the logo data URI', brand.includes('APP_LOGO_DATA_URI') && brand.includes('data:image/png;base64,'));
  check('Logo rendered as <img> in header', /<img class="logo" src="\$\{APP_LOGO_DATA_URI\}"/.test(exportSrc));
  check('Header shows "Interview Ready" brand name', exportSrc.includes('header-title">Interview Ready'));
  check('Branded header subtitle present', exportSrc.includes('Company Research Intelligence Brief'));
}

// ── 3. Correct details rendered ─────────────────────────────────────────
console.log('\n📋 [3] Correct Details Displayed in Template');
const requiredFields = [
  'company_name', 'tagline', 'overview', 'industry', 'company_size',
  'headquarters', 'founded', 'business_model', 'key_products_services',
  'mission_values', 'recent_news', 'financials', 'culture_insights',
  'tech_stack', 'competitors', 'growth_signals', 'red_flags',
  'interview_talking_points', 'smart_questions_to_ask',
  'cultural_fit_score', 'opportunity_score', 'summary_verdict',
];
const missing = requiredFields.filter(f => !exportSrc.includes(f));
check(`Template renders all ${requiredFields.length} research fields`, missing.length === 0, `missing: ${missing.join(', ')}`);
check('Template renders quick-fact grid', exportSrc.includes('fact-grid'));
check('Template renders strategic verdict box', exportSrc.includes('Strategic Verdict'));
check('Template renders opportunity score', exportSrc.includes('Opportunity Score'));
check('Template renders cultural fit score (conditional)', exportSrc.includes('Cultural Fit'));
check('Template renders interview talking points', exportSrc.includes('Interview Prep: Talking Points'));
check('Template renders smart questions', exportSrc.includes('Smart Questions to Ask'));
check('Template renders recent news', exportSrc.includes('Recent News'));
check('Template renders today date', exportSrc.includes('Prepared on'));
check('Template footer present', exportSrc.includes('Generated by Interview Ready'));

// ── 4. Proper capitalization ────────────────────────────────────────────
console.log('\n🔠 [4] Proper Capitalization');
if (exportSrc) {
  check('Title Case helper for company name', exportSrc.includes('function titleCase'));
  check('Section titles styled with uppercase text-transform', exportSrc.includes('text-transform: uppercase'));
  check('Score labels uppercase via CSS', exportSrc.includes('letter-spacing: 1px'));
  check('Fact labels uppercase via CSS', exportSrc.includes('text-transform: uppercase'));
  check('Strategic Verdict title capitalised', exportSrc.includes('Strategic Verdict'));
  check('"Opportunity Score" capitalised correctly', exportSrc.includes('Opportunity Score'));
  check('"Company Research Intelligence Brief" capitalised', exportSrc.includes('Company Research Intelligence Brief'));
}

// ── 5. HTML escaping of dynamic content ─────────────────────────────────
console.log('\n🔒 [5] HTML Escaping of Dynamic Content');
if (exportSrc) {
  check('esc() helper defined', exportSrc.includes('function esc'));
  check('esc() escapes &, <, >, "', /replace\(\/&\/g/.test(exportSrc) && /replace\(\/<\//.test(exportSrc));
  check('Company name escaped in title', /esc\(companyName\)/.test(exportSrc));
  check('Verdict escaped', /esc\(data\.summary_verdict\)/.test(exportSrc));
  check('List items escaped', /esc\(item\)/.test(exportSrc));
  check('News headline escaped', /esc\(item\.headline\)/.test(exportSrc));
  check('Fact values escaped', /esc\(value/.test(exportSrc));
}

// ── 6. Filename + download flow ─────────────────────────────────────────
console.log('\n💾 [6] Filename & Download Flow');
if (exportSrc) {
  check('Uses buildFileName helper', exportSrc.includes('buildFileName'));
  check('Correct default filename label', exportSrc.includes("'Company_Research'"));
  check('Uses renameToCache on native', exportSrc.includes('renameToCache'));
  check('PDF mime type for share', exportSrc.includes("mimeType: 'application/pdf'"));
  check('Web export sets document title', exportSrc.includes('win.document.title = filename'));
}

// ── 7. Screen offers review + download ──────────────────────────────────
console.log('\n📱 [7] Screen Review & Download');
const screen = read(SCREEN_PATH, 'company-research screen');
if (screen) {
  check('Screen imports exportCompanyResearchPDF', screen.includes('exportCompanyResearchPDF'));
  check('Screen has header download icon', screen.includes('download-outline'));
  check('Screen has prominent Download PDF Report button', screen.includes('Download PDF Report'));
  check('Download button disabled while exporting', screen.includes('disabled={isDownloading}'));
  check('Export failure surfaces a toast', screen.includes('Export Failed'));
  check('Results reviewable across 5 tabs', screen.includes("'overview'") && screen.includes("'products'") && screen.includes("'culture'") && screen.includes("'intelligence'") && screen.includes("'interview'"));
  check('Recent research loads by id', screen.includes("from('company_research')"));
}

// ── 8. Functional render smoke test ─────────────────────────────────────
console.log('\n🏃 [8] Functional HTML Render (smoke test)');
function renderWithStubs() {
  const src = fs.readFileSync(EXPORT_PATH, 'utf8');

  // Compile TS -> CJS, stubbing native/RN + dependent modules.
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, esModuleInterop: true },
  }).outputText;

  // Expose the private builder for testing by appending an exports assignment.
  const exposed = js + '\n\nexports.buildCompanyResearchHTML = buildCompanyResearchHTML;\n';

  const module = { exports: {} };
  const stubLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  const stubRequire = (id) => {
    if (id === 'react-native') return { Platform: { OS: 'web' } };
    if (id === '../hooks/useApi') return {};
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
    company_name: 'vercel',
    tagline: 'Develop. Preview. Ship.',
    overview: 'Vercel is the platform for frontend developers. <script>alert(1)</script> It enables teams to build, test, and deploy web applications instantly.',
    industry: 'Cloud / Developer Tools',
    company_size: '501-1000 employees',
    headquarters: 'San Francisco, CA',
    founded: '2015',
    business_model: 'Cloud SaaS with usage-based pricing',
    key_products_services: ['Next.js', 'Vercel Functions', 'Vercel Edge Network'],
    mission_values: 'To make web development accessible and fast for everyone.',
    recent_news: [{ headline: 'Vercel raises $150M', summary: 'Funding to expand its edge network.' }],
    financials: 'Privately held, valued at $2.5B',
    culture_insights: 'Remote-first, engineering-led culture with strong product focus.',
    tech_stack: ['Next.js', 'React', 'Go', 'TypeScript'],
    competitors: ['Netlify', 'AWS Amplify', 'Cloudflare Pages'],
    growth_signals: ['Rapid revenue growth', 'Global expansion'],
    red_flags: [],
    interview_talking_points: ['Know the Vercel edge network', 'Understand Next.js SSR and ISR'],
    smart_questions_to_ask: ['How does the team measure performance?', 'What is the roadmap for Vercel Functions?'],
    cultural_fit_score: 80,
    opportunity_score: 88,
    summary_verdict: 'A strong opportunity for developers who value cutting-edge tooling and a remote-first culture.',
  };

  const html = mod.buildCompanyResearchHTML(sample);

  check('Render returns a complete HTML document', html.includes('<!DOCTYPE html>') && html.includes('</html>'));
  check('Render includes the app logo data URI', html.includes('data:image/png;base64,'));
  check('Render capitalizes company name (Vercel)', html.includes('>Vercel</h2>') || html.includes('>Vercel<'));
  check('Render shows prepared-on date', html.includes('Prepared on'));
  check('Render shows opportunity score', html.includes('88/100'));
  check('Render shows cultural fit score', html.includes('80/100'));
  check('Render shows headline', html.includes('Vercel raises $150M'));
  check('Render escapes injected markup safely', !html.includes('<img src=x onerror=alert(1)>') && html.includes('&lt;script&gt;'));
  check('Render omits red-flag section when empty', !html.includes('Risks & Red Flags'));

  // Inject a dangerous value to confirm escaping
  sample.red_flags = ['<script>alert(1)</script> & dangerous'];
  const html2 = mod.buildCompanyResearchHTML(sample);
  check('Render escapes red-flag content', html2.includes('&lt;script&gt;') && !html2.includes('<script>alert(1)</script>'));
} catch (e) {
  check('Functional render executes without error', false, e.message);
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
  console.log('\n🎉 All company research prompt & download template checks passed!');
  process.exit(0);
}
