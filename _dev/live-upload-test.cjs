/**
 * live-upload-test.cjs
 *
 * Live integration test for the mobile resume-upload path against the REAL
 * Supabase project. Simulates exactly what apiUploadFile() in src/lib/api.ts does:
 *   - multipart/form-data POST with a "file" field
 *   - to the /functions/v1/profile-parse-resume Edge Function
 *   - using an authenticated user's access token
 *
 * Run with:
 *   node --env-file=.env _dev/live-upload-test.cjs
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js'); // eslint-disable-line

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars (EXPO_PUBLIC_SUPABASE_URL / ANON / SERVICE_ROLE).');
  process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Load a real, text-embedded PDF fixture so pdf-parse (used by the edge
 * function) can extract text WITHOUT falling back to OCR.
 * Generated with pdf-lib; path: C:\Users\victo\AppData\Local\Temp\opencode\uploadfixture\resume.pdf
 */
function loadTestPdf() {
  return fs.readFileSync('C:/Users/victo/AppData/Local/Temp/opencode/uploadfixture/resume.pdf');
}

let userId = null;
let testEmail = null;

async function main() {
  const results = [];

  try {
    // ── 1. Create a test user (auto-confirmed) ─────────────────────────────
    testEmail = `upload-test-${Date.now()}@example.com`;
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    if (createErr || !created?.user) throw new Error(`createUser: ${createErr?.message}`);
    userId = created.user.id;
    console.log(`✅ Test user created: ${testEmail}`);

    // ── 2. Grant enough credits (PROFILE_ANALYSIS costs 2) ────────────────
    const { error: creditErr } = await adminClient
      .from('users')
      .update({ ai_credits: 100 })
      .eq('id', userId);
    if (creditErr) throw new Error(`grant credits: ${creditErr.message}`);
    console.log('✅ Credits granted (ai_credits=100)');

    // The profile-parse edge function also upserts into user_profiles on this
    // user; ensure no FK/profile trigger blocks it by creating a profile row.
    const { error: profileErr } = await adminClient.from('user_profiles').upsert({
      user_id: userId,
      profile_completeness: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (profileErr) console.warn('⚠️  Could not pre-create profile (may not be needed):', profileErr.message);

    // ── 3. Sign in as the user to get an access token ──────────────────────
    const { data: authData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!',
    });
    if (signInErr || !authData?.session) throw new Error(`signIn: ${signInErr?.message}`);
    const token = authData.session.access_token;
    console.log('✅ Signed in, access token acquired');

    // ── 4. Build a real PDF file and upload via multipart/form-data ────────
    const pdfName = `live-update-${Date.now()}.pdf`;
    const pdfBuffer = loadTestPdf();
    const form = new FormData();
    // Mirror the mobile RN FormData shape: { uri, name, type }
    form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), pdfName);

    const uploadUrl = `${SUPABASE_URL}/functions/v1/profile-parse-resume`;
    console.log(`→ POSTing ${pdfName} (${pdfBuffer.length} bytes) to ${uploadUrl}`);

    const start = Date.now();
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // no manual Content-Type (boundary auto-set)
      body: form,
    });
    const elapsed = Date.now() - start;
    const body = await response.json();

    console.log(`Response ${response.status} in ${elapsed}ms`);

    const ok = response.ok && !body.error;
    results.push(['multipart upload to profile-parse-resume', ok, response.status, body]);

    if (!ok) {
      console.error('Upload failed:', JSON.stringify(body, null, 2));
    } else {
      console.log('✅ Upload + parse succeeded. Extracted current_role =', body.current_role);
      console.log('   skills:', (body.technical_skills || []).slice(0, 5));
    }
  } catch (err) {
    console.error('❌ Live test error:', err.message);
    results.push(['overall', false, 0, { error: err.message }]);
  } finally {
    // ── 5. Teardown ────────────────────────────────────────────────────────
    console.log('\n--- Cleaning up ---');
    if (userId) {
      try {
        await adminClient.auth.admin.deleteUser(userId);
        console.log('✅ Test user deleted.');
      } catch (e) {
        console.warn('⚠️  Could not delete user:', e.message);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n════════════════ SUMMARY ════════════════');
  let allPass = true;
  for (const [label, ok, status, body] of results) {
    console.log(`  ${ok ? '✅ PASS' : '❌ FAIL'}  ${label}  (status ${status})`);
    if (!ok) allPass = false;
  }
  console.log(allPass ? '\n✅ ALL LIVE UPLOAD CHECKS PASSED' : '\n❌ LIVE UPLOAD CHECKS FAILED');
  process.exit(allPass ? 0 : 1);
}

main();