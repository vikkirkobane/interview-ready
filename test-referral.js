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

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runReferralTests() {
  console.log('--- Setting up Referrer (User A) ---');
  const userAEmail = `referrer_${Date.now()}@example.com`;
  
  const { data: adminDataA, error: createErrorA } = await supabaseAdmin.auth.admin.createUser({
    email: userAEmail,
    password: 'TestPassword123!',
    email_confirm: true
  });
  
  if (createErrorA) {
    console.error('Failed to create User A:', createErrorA);
    return;
  }
  const userAId = adminDataA.user.id;
  
  // Wait a moment for trigger to run and generate referral code
  await sleep(1000);

  // Fetch User A's referral code from the DB
  const { data: userADbData, error: dbErrorA } = await supabaseAdmin
    .from('users')
    .select('referral_code, ai_credits')
    .eq('id', userAId)
    .single();

  if (dbErrorA || !userADbData?.referral_code) {
    console.error('Failed to fetch User A referral code:', dbErrorA || 'No code generated');
    await supabaseAdmin.auth.admin.deleteUser(userAId);
    return;
  }

  const referralCode = userADbData.referral_code;
  const initialCreditsA = userADbData.ai_credits || 0;
  console.log(`✅ User A Created. Referral Code: ${referralCode}`);
  console.log(`✅ User A Initial Credits: ${initialCreditsA}`);

  console.log('\n--- Setting up Referred User (User B) ---');
  const userBEmail = `referred_${Date.now()}@example.com`;
  
  const { data: adminDataB, error: createErrorB } = await supabaseAdmin.auth.admin.createUser({
    email: userBEmail,
    password: 'TestPassword123!',
    email_confirm: true
  });
  
  if (createErrorB) {
    console.error('Failed to create User B:', createErrorB);
    await supabaseAdmin.auth.admin.deleteUser(userAId);
    return;
  }
  const userBId = adminDataB.user.id;

  // Wait for trigger
  await sleep(1000);

  // Fetch User B initial credits
  const { data: userBDbData } = await supabaseAdmin
    .from('users')
    .select('ai_credits')
    .eq('id', userBId)
    .single();
  const initialCreditsB = userBDbData?.ai_credits || 0;
  console.log(`✅ User B Created. Initial Credits: ${initialCreditsB}`);

  // Sign in as User B
  const { data: authDataB, error: signInErrorB } = await supabase.auth.signInWithPassword({
    email: userBEmail,
    password: 'TestPassword123!',
  });

  const tokenB = authDataB.session.access_token;
  console.log('✅ Authorized as User B!');

  console.log(`\n--- User B is Applying Referral Code: ${referralCode} ---`);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/referral-apply`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenB}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ referralCode }),
    });

    if (!response.ok) {
      console.error('❌ referral-apply Failed with status:', response.status);
      console.error('Error Details:', await response.text());
    } else {
      console.log('✅ referral-apply Successful!');
      const data = await response.json();
      console.log('Output:', data);

      // Verify User A and User B received credits!
      console.log('\n--- Verifying Payouts ---');
      const { data: finalUserA } = await supabaseAdmin.from('users').select('ai_credits').eq('id', userAId).single();
      const { data: finalUserB } = await supabaseAdmin.from('users').select('ai_credits').eq('id', userBId).single();

      console.log(`User A (Referrer) Final Credits: ${finalUserA.ai_credits} (Expected: ${initialCreditsA + 10})`);
      console.log(`User B (Referred) Final Credits: ${finalUserB.ai_credits} (Expected: ${initialCreditsB + 10})`);

      if (finalUserA.ai_credits === initialCreditsA + 10 && finalUserB.ai_credits === initialCreditsB + 10) {
        console.log('🏆 END-TO-END REFERRAL SYSTEM PASSED PERFECTLY!');
      } else {
        console.error('❌ CREDIT MISMATCH DETECTED!');
      }
    }
  } catch (err) {
    console.error('❌ Network Error:', err);
  } finally {
    console.log('\n--- Cleaning up Test Users ---');
    await supabaseAdmin.auth.admin.deleteUser(userAId);
    await supabaseAdmin.auth.admin.deleteUser(userBId);
    console.log('✅ Test users deleted successfully!');
  }
}

runReferralTests();
