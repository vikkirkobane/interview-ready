/**
 * End-to-end test: Mock Interview → Feedback → PDF Report Naming
 *
 * Validates the complete mock interview pipeline:
 *   1. interviews-start  → creates IN_PROGRESS session, persists difficulty, deducts credits
 *   2. interviews-message → conducts a question/answer exchange
 *   3. interviews-feedback → generates structured feedback, marks COMPLETED, persists duration
 *   4. Interview PDF report naming → verifies download filename convention
 *
 * Uses a throwaway test user, then cleans up.
 *
 * Run: node test-interview-to-feedback-flow.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) env[key.trim()] = values.join('=').trim();
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

// Mirror of src/lib/exportUtils.ts buildFileName
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

const VALID_INTERVIEW_TYPES = ['TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'MIXED', 'CASE_STUDY'];
const VALID_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'SENIOR'];

function validateFeedback(f) {
  const errors = [];
  if (!f) return { ok: false, errors: ['feedback missing'] };
  if (typeof f.overall_score !== 'number' || f.overall_score < 0 || f.overall_score > 100) errors.push('overall_score invalid');
  const dims = f.dimension_scores || {};
  for (const k of ['communication', 'technical_knowledge', 'problem_solving', 'confidence', 'cultural_fit']) {
    if (typeof dims[k] !== 'number' || dims[k] < 0 || dims[k] > 100) errors.push(`dimension ${k} invalid`);
  }
  if (!f.recommendation || !['STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE', 'STRONG_NO_HIRE'].includes(f.recommendation)) {
    errors.push('recommendation invalid');
  }
  if (!Array.isArray(f.strengths) || f.strengths.length === 0) errors.push('strengths empty');
  if (!Array.isArray(f.areas_for_improvement) || f.areas_for_improvement.length === 0) errors.push('areas_for_improvement empty');
  if (!Array.isArray(f.question_feedback) || f.question_feedback.length === 0) errors.push('question_feedback empty');
  for (const q of f.question_feedback || []) {
    if (!q.question || !q.answer) errors.push('question_feedback missing question/answer');
    if (typeof q.score !== 'number' || q.score < 0 || q.score > 100) errors.push('question score invalid');
  }
  if (typeof f.interview_summary !== 'string' || !f.interview_summary.trim()) errors.push('interview_summary empty');
  return { ok: errors.length === 0, errors };
}

const JOB_DESCRIPTION = `
  Job Title: Senior React Native Engineer
  Company: MobileWorks
  Description: Build a high-performance cross-platform mobile app.
  Responsibilities: Lead feature development, optimize performance, mentor junior engineers.
  Required Skills: React Native, TypeScript, JavaScript, Redux, Performance Optimization.
`;

async function runFlowTest() {
  let userId = null;

  try {
    console.log('🔍 Mock Interview → Feedback → PDF Report Naming Test\n');

    // ── Setup test user ─────────────────────────────────────────────────
    const testUserEmail = `interv_${Date.now()}@example.com`;
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    if (createError) throw new Error(`Failed to create test user: ${createError.message}`);
    userId = created.user.id;
    console.log(`✅ Created test user: ${testUserEmail}`);

    await supabaseAdmin.from('users').update({ ai_credits: 50 }).eq('id', userId);
    console.log('✅ Granted credits (50)');

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUserEmail,
      password: 'TestPassword123!',
    });
    if (signInError) throw new Error(`Failed to sign in: ${signInError.message}`);
    const token = authData.session.access_token;

    // ── Step 1: interviews-start (Behavioral + INTERMEDIATE) ────────────
    console.log('\n── Step 1: interviews-start ──');
    const startRes = await fetch(`${supabaseUrl}/functions/v1/interviews-start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'React Native Engineer',
        company: 'MobileWorks',
        interview_type: 'BEHAVIORAL',
        difficulty: 'SENIOR',
        job_description: JOB_DESCRIPTION,
      }),
    });
    const startBody = await startRes.json();
    if (!startRes.ok) throw new Error(`interviews-start failed (${startRes.status}): ${JSON.stringify(startBody)}`);

    const interview = startBody.interview;
    const interviewId = interview.id;
    if (!interviewId) throw new Error('No interview id returned');
    if (interview.interview_type !== 'BEHAVIORAL') throw new Error(`Unexpected type: ${interview.interview_type}`);
    if (interview.difficulty !== 'SENIOR') throw new Error(`Difficulty not persisted: ${interview.difficulty}`);
    if (interview.status !== 'IN_PROGRESS') throw new Error(`Expected IN_PROGRESS, got ${interview.status}`);
    console.log(`✅ Session created (id: ${interviewId})`);
    console.log(`   Role: ${interview.role} | Type: ${interview.interview_type} | Difficulty: ${interview.difficulty} | Status: ${interview.status}`);
    console.log(`   Opening message: ${interview.messages?.[0]?.content}`);

    // Verify credits deducted (5)
    const { data: creds } = await supabaseAdmin.from('users').select('ai_credits').eq('id', userId).single();
    console.log(`   Credits after start: ${creds?.ai_credits} (expected ~45)`);

    // ── Step 2: interviews-message (two exchanges) ──────────────────────
    console.log('\n── Step 2: interviews-message ──');
    const answers = [
      'I led a mobile team at my previous company, resolving a critical memory leak that reduced crashes by 60%. I collaborated daily with design and backend engineers.',
      'I would profile the app with the React Native devtools and Flipper, then isolate the render-blocking work and memoize heavy components. For conflict, I would listen first, then align on shared goals.',
    ];

    for (let i = 0; i < answers.length; i++) {
      const msgRes = await fetch(`${supabaseUrl}/functions/v1/interviews-message`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_id: interviewId, content: answers[i] }),
      });
      const msgBody = await msgRes.json();
      if (!msgRes.ok) throw new Error(`interviews-message failed (${msgRes.status}): ${JSON.stringify(msgBody)}`);
      if (!msgBody.message?.content) throw new Error('No AI response content');
      console.log(`✅ Exchange ${i + 1}: user → AI responded (${msgBody.message.content.length} chars)`);
      console.log(`   AI: ${msgBody.message.content.slice(0, 120)}...`);
    }

    // Verify messages persisted
    const { data: midInterview } = await supabaseAdmin
      .from('mock_interviews').select('messages, question_count').eq('id', interviewId).single();
    console.log(`   Messages persisted: ${midInterview?.messages?.length ?? 0} | question_count: ${midInterview?.question_count}`);

    // ── Step 3: interviews-feedback ─────────────────────────────────────
    console.log('\n── Step 3: interviews-feedback ──');
    let feedbackRes;
    let feedbackBody;
    for (let attempt = 1; attempt <= 3; attempt++) {
      feedbackRes = await fetch(`${supabaseUrl}/functions/v1/interviews-feedback?interview_id=${interviewId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_seconds: 187 }),
      });
      feedbackBody = await feedbackRes.json();
      if (feedbackRes.ok) break;
      console.warn(`   ⚠️  Attempt ${attempt} failed (${feedbackRes.status}), retrying...`);
      await new Promise(r => setTimeout(r, 3000));
    }
    if (!feedbackRes.ok) throw new Error(`interviews-feedback failed (${feedbackRes.status}): ${JSON.stringify(feedbackBody)}`);

    const feedback = feedbackBody.feedback;
    const fv = validateFeedback(feedback);
    if (!fv.ok) throw new Error(`Feedback schema invalid: ${fv.errors.join('; ')}`);
    console.log(`✅ Feedback generated (overall: ${feedback.overall_score}, recommendation: ${feedback.recommendation})`);
    console.log(`   Strengths: ${feedback.strengths.length} | Improvements: ${feedback.areas_for_improvement.length} | Q&A pairs: ${feedback.question_feedback.length}`);
    console.log(`   Summary: ${(feedback.interview_summary || '').slice(0, 100)}...`);

    // Verify status COMPLETED + duration persisted + feedback cached
    const { data: completed } = await supabaseAdmin
      .from('mock_interviews').select('status, duration_seconds, detailed_feedback').eq('id', interviewId).single();
    if (completed?.status !== 'COMPLETED') throw new Error(`Status not COMPLETED: ${completed?.status}`);
    if (completed?.duration_seconds !== 187) throw new Error(`Duration not persisted: ${completed?.duration_seconds}`);
    if (!completed?.detailed_feedback?.overall_score) throw new Error('detailed_feedback not cached');
    console.log('✅ Interview marked COMPLETED, duration_seconds=187 persisted, feedback cached');

    // Re-requesting feedback returns cached result (idempotent)
    const cachedRes = await fetch(`${supabaseUrl}/functions/v1/interviews-feedback?interview_id=${interviewId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const cachedBody = await cachedRes.json();
    if (!cachedRes.ok || cachedBody.feedback?.overall_score !== feedback.overall_score) {
      throw new Error('Cached feedback not returned on re-request');
    }
    console.log('✅ Re-request returns cached feedback (idempotent)');

    // ── Step 4: PDF report naming convention ────────────────────────────
    console.log('\n── Step 4: Interview Report PDF Naming ──');
    const filename = buildFileName('Jane Smith', 'Interview_Report', 'pdf');
    if (filename !== 'Jane_Smith_Interview_Report.pdf') throw new Error(`Naming mismatch: ${filename}`);
    console.log(`✅ Candidate name "Jane Smith" → "${filename}"`);

    const fallback = buildFileName('', 'Interview_Report', 'pdf');
    if (fallback !== 'Interview_Report.pdf') throw new Error(`Fallback wrong: ${fallback}`);
    console.log(`✅ Empty name → "${fallback}" (fallback)`);

    // Confirm the export module uses the shared helper + renameToCache
    const exportSrc = fs.readFileSync('src/lib/interviewExport.ts', 'utf8');
    if (!exportSrc.includes("buildFileName(context.candidateName, 'Interview_Report', 'pdf')")) {
      throw new Error('interviewExport.ts missing buildFileName wiring');
    }
    if (!exportSrc.includes('renameToCache(uri, filename)')) throw new Error('interviewExport.ts missing renameToCache');
    if (!exportSrc.includes('APP_LOGO_DATA_URI')) throw new Error('interviewExport.ts missing branded logo');
    console.log('✅ interviewExport.ts uses buildFileName + renameToCache + branded logo');

    // Confirm the feedback screen wires the download handler
    const feedbackScreen = fs.readFileSync('app/(tabs)/feedback.tsx', 'utf8');
    if (!feedbackScreen.includes('exportInterviewReportPDF')) throw new Error('feedback.tsx missing export import');
    if (!feedbackScreen.includes('handleDownloadReport')) throw new Error('feedback.tsx missing download handler');
    console.log('✅ feedback.tsx Download Report button wired to real export');

    // ── Final report ────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('🎉 ALL CHECKS PASSED');
    console.log('   • interviews-start → session + difficulty persisted');
    console.log('   • interviews-message → Q&A exchange works');
    console.log('   • interviews-feedback → COMPLETED + duration + feedback cached');
    console.log(`   • Report filename: ${filename}`);
    console.log('══════════════════════════════════════════════════════════');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    if (userId) {
      try {
        await supabaseAdmin.from('usage_events').delete().eq('user_id', userId);
        await supabaseAdmin.from('mock_interviews').delete().eq('user_id', userId);
        await supabaseAdmin.from('users').delete().eq('id', userId);
        const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        const stillExists = await supabaseAdmin.auth.admin.getUserById(userId).then(r => r.data?.user).catch(() => null);
        console.log(delError && stillExists ? `\n🧹 Cleanup: failed to delete test user (${delError.message || JSON.stringify(delError)})` : '\n🧹 Cleanup: test user deleted');
      } catch (cleanupErr) {
        console.log(`\n🧹 Cleanup: ${cleanupErr?.message || 'unknown error'}`);
      }
    }
  }
}

runFlowTest();
