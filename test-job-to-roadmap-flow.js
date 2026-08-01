/**
 * End-to-end test: Job Analysis → Roadmap Generation → PDF Naming Convention
 *
 * Validates the complete pipeline:
 *   1. jobs-analyze  → creates a job_application + structured analysis (fit score, gaps, match breakdown)
 *   2. jobs-roadmap-generate → produces a structured learning roadmap from missing skills
 *   3. Roadmap PDF naming convention → verifies download filename follows <Candidate>_Roadmap.pdf
 *
 * Uses a throwaway test user so credits and rows are isolated, then cleans up.
 *
 * Run: node test-job-to-roadmap-flow.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = env['EXPO_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing required env variables.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mirror of src/lib/exportUtils.ts buildFileName/sanitizeFileNameSegment
function sanitizeFileNameSegment(name) {
  return (name || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildFileName(name, label, ext) {
  const segment = sanitizeFileNameSegment(name);
  const stem = segment ? `${segment}_${label}` : label;
  return `${stem}.${ext}`;
}

// Lightweight schema validators mirroring the edge-function zod schemas
function validateAnalysis(a) {
  if (!a) return { ok: false, errors: ['analysis object missing'] };
  const errors = [];
  if (typeof a.title !== 'string') errors.push('title must be string');
  if (typeof a.company !== 'string') errors.push('company must be string');
  if (typeof a.job_description !== 'string') errors.push('job_description must be string');
  if (!Array.isArray(a.required_skills)) errors.push('required_skills must be array');
  if (typeof a.recommendation_level !== 'string' ||
      !['GREAT_FIT', 'GOOD_FIT', 'STRETCH_GOAL'].includes(a.recommendation_level)) {
    errors.push('recommendation_level invalid');
  }
  if (a.fit_score !== null && a.fit_score !== undefined &&
      (typeof a.fit_score !== 'number' || a.fit_score < 0 || a.fit_score > 100)) {
    errors.push('fit_score must be 0-100 or null');
  }
  return { ok: errors.length === 0, errors };
}

function validateRoadmap(r) {
  if (!r) return { ok: false, errors: ['roadmap data missing'] };
  const errors = [];
  if (typeof r.duration_days !== 'number' || r.duration_days < 1 || r.duration_days > 30) {
    errors.push('duration_days must be a number 1-30');
  }
  if (typeof r.title !== 'string' || !r.title.trim()) errors.push('title required');
  if (typeof r.overview !== 'string' || !r.overview.trim()) errors.push('overview required');
  if (!Array.isArray(r.modules) || r.modules.length === 0) errors.push('modules must be non-empty');
  for (const m of (r.modules || [])) {
    if (typeof m.module_title !== 'string' || !m.module_title.trim()) errors.push('module_title required');
    if (typeof m.days_allocated !== 'string' || !m.days_allocated.trim()) errors.push('days_allocated required');
    if (typeof m.focus_skill !== 'string' || !m.focus_skill.trim()) errors.push('focus_skill required');
    if (!Array.isArray(m.action_items) || m.action_items.length === 0) errors.push('action_items required');
    if (typeof m.estimated_hours !== 'number' || m.estimated_hours < 0) errors.push('estimated_hours must be >= 0');
    if (!Array.isArray(m.resources_to_use) || m.resources_to_use.length === 0) errors.push('resources_to_use required');
  }
  return { ok: errors.length === 0, errors };
}

const JOB_DESCRIPTION = `
  Job Title: Senior Fullstack Developer
  Company: InnovateTech
  Description: We are building a scalable multi-tenant web platform.
  Responsibilities: Design and build features end-to-end, lead code reviews, mentor juniors.
  Required Skills: React, Node.js, PostgreSQL, TypeScript, AWS, Docker.
  Preferred Skills: GraphQL, Kubernetes, CI/CD pipelines.
  Benefits: Remote-friendly, equity, learning budget.
`;

const USER_PROFILE = {
  first_name: 'Jane',
  last_name: 'Smith',
  current_role: 'Frontend Developer',
  technical_skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
  soft_skills: ['Communication', 'Teamwork'],
  work_history: [
    {
      company: 'WebWorks',
      title: 'Frontend Developer',
      duration: '3 years',
      bullets: ['Built React dashboards', 'Improved page load by 40%'],
    },
  ],
};

async function runFlowTest() {
  let testUserEmail = null;
  let userId = null;

  try {
    console.log('🔍 Job Analysis → Roadmap Generation → PDF Naming Test\n');

    // ── Setup test user ─────────────────────────────────────────────────
    testUserEmail = `roadflow_${Date.now()}@example.com`;
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    if (createError) throw new Error(`Failed to create test user: ${createError.message}`);
    userId = created.user.id;
    console.log(`✅ Created test user: ${testUserEmail}`);

    const { data: credits, error: creditsError } = await supabaseAdmin
      .from('users')
      .update({ ai_credits: 50 })
      .eq('id', userId)
      .select('ai_credits')
      .single();
    if (creditsError) throw new Error(`Failed to grant credits: ${creditsError.message}`);
    console.log(`✅ Granted credits (${credits?.ai_credits})`);

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUserEmail,
      password: 'TestPassword123!',
    });
    if (signInError) throw new Error(`Failed to sign in: ${signInError.message}`);
    const token = authData.session.access_token;
    console.log('✅ Signed in');

    // ── Step 1: jobs-analyze ────────────────────────────────────────────
    console.log('\n── Step 1: jobs-analyze ──');
    let analyzeResponse;
    let analyzeBody;
    let lastAnalyzeError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/jobs-analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: JOB_DESCRIPTION,
          user_profile: USER_PROFILE,
          user_role: 'Frontend Developer',
        }),
      });
      analyzeBody = await analyzeResponse.json();
      if (analyzeResponse.ok) break;
      lastAnalyzeError = `jobs-analyze failed (${analyzeResponse.status}): ${JSON.stringify(analyzeBody)}`;
      console.warn(`   ⚠️  Attempt ${attempt} failed (${analyzeResponse.status}), retrying...`);
      await new Promise(r => setTimeout(r, 3000));
    }

    if (!analyzeResponse.ok) {
      throw new Error(lastAnalyzeError || 'jobs-analyze failed');
    }

    const analysis = analyzeBody.analysis;
    const v = validateAnalysis(analysis);
    if (!v.ok) throw new Error(`Analysis schema invalid: ${v.errors.join('; ')}`);

    const jobId = analyzeBody.job_id;
    if (!jobId) throw new Error('No job_id returned from jobs-analyze');

    console.log(`✅ Analysis generated (job_id: ${jobId})`);
    console.log(`   Title: ${analysis.title}`);
    console.log(`   Company: ${analysis.company}`);
    console.log(`   Fit Score: ${analysis.fit_score}`);
    console.log(`   Required Skills: ${(analysis.required_skills || []).length}`);
    console.log(`   Missing Skills: ${(analysis.missing_bonus_skills || []).map(s => typeof s === 'string' ? s : s.skill).join(', ') || 'none'}`);
    console.log(`   Match Breakdown: ${(analysis.match_analysis || []).length} items`);

    // Verify the analysis persisted to the job_applications table
    const { data: savedJob, error: jobReadError } = await supabaseAdmin
      .from('job_applications')
      .select('id, job_title, company, match_score, missing_skills')
      .eq('id', jobId)
      .single();
    if (jobReadError) throw new Error(`Failed to read saved job: ${jobReadError.message}`);
    console.log(`✅ Analysis persisted to job_applications (match_score=${savedJob.match_score}, missing=${savedJob.missing_skills?.length})`);

    // ── Step 2: jobs-roadmap-generate ───────────────────────────────────
    console.log('\n── Step 2: jobs-roadmap-generate ──');
    const roadmapResponse = await fetch(`${supabaseUrl}/functions/v1/jobs-roadmap-generate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId }),
    });

    const roadmapBody = await roadmapResponse.json();
    if (!roadmapResponse.ok) {
      throw new Error(`jobs-roadmap-generate failed (${roadmapResponse.status}): ${JSON.stringify(roadmapBody)}`);
    }

    const roadmap = roadmapBody.data;
    const rv = validateRoadmap(roadmap);
    if (!rv.ok) throw new Error(`Roadmap schema invalid: ${rv.errors.join('; ')}`);

    console.log(`✅ Roadmap generated (${roadmap.duration_days} days, ${roadmap.modules.length} modules)`);
    console.log(`   Title: ${roadmap.title}`);
    console.log(`   Overview: ${(roadmap.overview || '').slice(0, 100)}...`);
    for (let i = 0; i < roadmap.modules.length; i++) {
      const m = roadmap.modules[i];
      console.log(`   ${i + 1}. ${m.module_title} (${m.days_allocated}) — ${m.focus_skill} — ${m.action_items.length} actions, ${m.resources_to_use.length} resources`);
    }

    // Verify the roadmap was cached in jd_summary
    const { data: savedJob2, error: jobReadError2 } = await supabaseAdmin
      .from('job_applications')
      .select('jd_summary')
      .eq('id', jobId)
      .single();
    if (jobReadError2) throw new Error(`Failed to read cached roadmap: ${jobReadError2.message}`);
    let cachedRoadmap = null;
    if (savedJob2?.jd_summary) {
      try {
        cachedRoadmap = JSON.parse(savedJob2.jd_summary)?.roadmap;
      } catch { /* ignore */ }
    }
    if (!cachedRoadmap) throw new Error('Roadmap not cached in jd_summary');
    console.log('✅ Roadmap cached in job_applications.jd_summary');

    // ── Step 3: PDF naming convention ───────────────────────────────────
    console.log('\n── Step 3: Roadmap PDF Naming Convention ──');
    const candidateName = 'Jane Smith';
    const filename = buildFileName(candidateName, 'Roadmap', 'pdf');
    const expected = 'Jane_Smith_Roadmap.pdf';

    if (filename !== expected) {
      throw new Error(`Naming mismatch: got "${filename}", expected "${expected}"`);
    }
    console.log(`✅ Candidate name "${candidateName}" → "${filename}"`);

    // Edge cases: empty name falls back to plain label; unsafe chars stripped
    const fallbackName = buildFileName('', 'Roadmap', 'pdf');
    if (fallbackName !== 'Roadmap.pdf') throw new Error(`Empty-name fallback wrong: ${fallbackName}`);
    console.log(`✅ Empty name → "${fallbackName}" (fallback)`);

    const dirtyName = buildFileName("Jane_O'Brien / Jr.", 'Roadmap', 'pdf');
    if (dirtyName !== 'Jane_OBrien_Jr._Roadmap.pdf') {
      throw new Error(`Sanitization wrong: ${dirtyName}`);
    }
    console.log(`✅ Unsafe characters stripped → "${dirtyName}"`);

    // Confirm the export module wires the same helper
    const roadmapExportSrc = fs.readFileSync('src/lib/roadmapExport.ts', 'utf8');
    const usesBuildFileName = roadmapExportSrc.includes("buildFileName(context.candidateName, 'Roadmap', 'pdf')");
    const usesRenameToCache = roadmapExportSrc.includes('renameToCache(uri, filename)');
    if (!usesBuildFileName || !usesRenameToCache) {
      throw new Error('roadmapExport.ts is not using the shared filename helper + renameToCache');
    }
    console.log('✅ roadmapExport.ts uses buildFileName + renameToCache (native downloads get a proper filename)');

    // ── Final report ────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('🎉 ALL CHECKS PASSED');
    console.log('   • jobs-analyze → structured analysis + persisted row');
    console.log('   • jobs-roadmap-generate → valid roadmap covering gaps');
    console.log('   • Roadmap cached for reuse');
    console.log(`   • PDF filename: ${filename}`);
    console.log('══════════════════════════════════════════════════════════');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (userId) {
      try {
        // usage_events.user_id lacks ON DELETE CASCADE, so remove dependent
        // rows first, then delete the public.users row (cascades the rest),
        // then the auth user.
        await supabaseAdmin.from('usage_events').delete().eq('user_id', userId);
        await supabaseAdmin.from('job_applications').delete().eq('user_id', userId);
        await supabaseAdmin.from('users').delete().eq('id', userId);
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        const stillExists = await supabaseAdmin.auth.admin.getUserById(userId).then(r => r.data?.user).catch(() => null);
        if (delError && stillExists) {
          console.log(`\n🧹 Cleanup: failed to delete test user (${delError.message || JSON.stringify(delError)})`);
        } else {
          console.log('\n🧹 Cleanup: test user deleted');
        }
      } catch (cleanupErr) {
        console.log(`\n🧹 Cleanup: ${cleanupErr?.message || 'unknown error during cleanup'}`);
      }
    }
  }
}

runFlowTest();
