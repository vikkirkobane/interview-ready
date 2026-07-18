const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('[ERROR] Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('[INFO] Starting Automated Domain Tests...');

  // 1. Authenticate with the manually created test user
  console.log('\n[INFO] Authenticating as test user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'testdirect1@example.com',
    password: 'password123'
  });

  if (authError || !authData.user) {
    console.error('[FAIL] Could not sign in:', authError);
    process.exit(1);
  }
  const user = authData.user;
  console.log('[SUCCESS] Signed in as:', user.id);

  // 2. Test Domain 1: Profile & Resumes
  console.log('\n[INFO] Testing Domain 1: Profile & Resumes');
  
  // Check if profile was auto-created by triggers
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  if (profileErr || !profile) {
    console.error('[FAIL] Profile not found or error:', profileErr);
  } else {
    console.log('[SUCCESS] Profile trigger works. Completeness:', profile.profile_completeness);
  }

  // Create Resume
  const { data: resume, error: resumeErr } = await supabase
    .from('resumes')
    .insert({
      user_id: user.id,
      title: 'Automated Test Resume',
      status: 'DRAFT'
    })
    .select('id')
    .single();

  if (resumeErr) {
    console.error('[FAIL] Resume creation failed:', resumeErr);
  } else {
    console.log('[SUCCESS] Resume created successfully:', resume.id);
  }

  // 3. Test Domain 2: Job Applications
  console.log('\n[INFO] Testing Domain 2: Job Applications');
  const { data: jobApp, error: jobAppErr } = await supabase
    .from('job_applications')
    .insert({
      user_id: user.id,
      job_title: 'Software Engineer',
      company: 'Test Corp',
      status: 'SAVED'
    })
    .select('id')
    .single();
    
  if (jobAppErr) {
    console.error('[FAIL] Job application failed:', jobAppErr);
  } else {
    console.log('[SUCCESS] Job application saved:', jobApp.id);
  }

  // 4. Test Domain 3: Credits
  console.log('\n[INFO] Testing Domain 3: Credits');
  const { data: userData, error: userErr } = await supabase
    .from('users')
    .select('ai_credits, credit_balance, referral_code')
    .eq('id', user.id)
    .single();

  if (userErr) {
    console.error('[FAIL] User fetch failed:', userErr);
  } else {
    console.log(`[SUCCESS] Credits OK: ai_credits=${userData.ai_credits}, balance=${userData.credit_balance}, referral_code=${userData.referral_code}`);
  }

  // 5. Test Domain 4: Edge Functions
  console.log('\n[INFO] Testing Domain 4: Edge Functions (Mock Interviews & Payments)');
  
  // Test interviews-start
  console.log('  -> Calling interviews-start...');
  const { data: interviewData, error: interviewErr } = await supabase.functions.invoke('interviews-start', {
    body: { job_application_id: null, interview_type: 'BEHAVIORAL' }
  });

  if (interviewErr) {
    console.error('  [WARN] interviews-start failed (Expected if credits missing or not deployed):', interviewErr);
  } else {
    console.log('  [SUCCESS] interviews-start succeeded:', interviewData);
  }

  // Test payments-initialize
  console.log('  -> Calling payments-initialize...');
  const { data: paymentData, error: paymentErr } = await supabase.functions.invoke('payments-initialize', {
    body: { planSlug: 'PREMIUM', interval: 'MONTHLY', currency: 'USD' }
  });

  if (paymentErr) {
    console.error('  [WARN] payments-initialize failed:', paymentErr);
  } else {
    console.log('  [SUCCESS] payments-initialize succeeded. Ref:', paymentData?.data?.reference || paymentData);
  }

  console.log('\n[INFO] All Domain Tests Completed.');
}

runTests();
