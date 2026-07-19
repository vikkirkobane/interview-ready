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
  console.error("❌ Missing Supabase env variables. Check your .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOnboardingReferral() {
  console.log("\n--- Setting up Test User for Referral ---");
  const testEmail = `test-onboarding-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  // 1. Create referrer
  const referrerEmail = `referrer-${Date.now()}@example.com`;
  const { data: referrerUser, error: referrerCreateError } = await adminSupabase.auth.admin.createUser({
    email: referrerEmail,
    password: testPassword,
    email_confirm: true,
  });

  if (referrerCreateError) {
    console.error("❌ Failed to create referrer user:", referrerCreateError);
    process.exit(1);
  }
  const referrerId = referrerUser.user.id;
  
  // Wait for trigger
  await new Promise(r => setTimeout(r, 1000));
  
  // Fetch their generated referral code from public.users table
  const { data: referrerData } = await adminSupabase.from('users').select('referral_code').eq('id', referrerId).single();
  const validCode = referrerData.referral_code;
  console.log(`✅ Referrer created. Referral Code: ${validCode}`);

  // 2. Create the referred user (our new onboarding user)
  const { data: adminUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (createError) {
    console.error("❌ Failed to create referred user:", createError);
    process.exit(1);
  }
  const userId = adminUser.user.id;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError) {
    console.error("❌ Failed to sign in:", authError);
    process.exit(1);
  }

  const sessionToken = authData.session.access_token;
  console.log(`✅ Authorized as Test Referred User!`);

  console.log("\n--- 1. Testing Invalid Referral Code ---");
  const invalidResponse = await fetch(`${supabaseUrl}/functions/v1/referral-apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ referralCode: "INVALID123" }),
  });
  
  const invalidResult = await invalidResponse.json();
  if (invalidResponse.ok) {
    console.error("❌ Invalid code succeeded when it shouldn't have!");
  } else {
    console.log(`✅ Failed successfully for invalid code: ${invalidResult.error}`);
  }

  console.log("\n--- 2. Testing Valid Referral Code ---");
  const validResponse = await fetch(`${supabaseUrl}/functions/v1/referral-apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ referralCode: validCode }),
  });

  const validResult = await validResponse.json();
  if (!validResponse.ok) {
    console.error("❌ Valid referral failed:", validResult);
  } else {
    console.log("✅ Valid referral code applied successfully!");
    console.log(validResult);
    
    // Check credits
    const { data: creditsData } = await adminSupabase.from('user_credits').select('resume_credits, linkedin_analysis_credits').eq('user_id', userId).single();
    console.log("✅ New Credits Balance:", creditsData);
  }

  console.log("\n--- Cleaning up ---");
  await adminSupabase.auth.admin.deleteUser(referrerId);
  await adminSupabase.auth.admin.deleteUser(userId);
  console.log("✅ Test users deleted.");
}

testOnboardingReferral();
