import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const user1Email = 'victorchoogo37@gmail.com';
const user2Email = 'testdirect1@example.com';
const password = 'password123';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log(`Authenticating as User 1 (${user1Email})...`);
  const { data: u1Data, error: u1Error } = await supabase.auth.signInWithPassword({
    email: user1Email,
    password
  });
  if (u1Error) throw u1Error;
  const u1Token = u1Data.session.access_token;

  console.log('\n--- 1. Testing referral-stats (User 1) ---');
  const statsRes1 = await fetch(`${supabaseUrl}/functions/v1/referral-stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${u1Token}`
    }
  });

  const statsText1 = await statsRes1.text();
  if (!statsRes1.ok) {
    console.error('Error fetching stats:', statsRes1.status, statsText1);
    process.exit(1);
  }
  const statsData1 = JSON.parse(statsText1);
  
  const referralCode = statsData1.data?.referral_code;
  console.log('User 1 Stats:', statsData1);
  console.log(`User 1 Referral Code: ${referralCode}`);

  if (!referralCode) {
    console.error('No referral code generated for User 1!');
    process.exit(1);
  }

  console.log(`\nAuthenticating as User 2 (${user2Email})...`);
  const { data: u2Data, error: u2Error } = await supabase.auth.signInWithPassword({
    email: user2Email,
    password
  });
  if (u2Error) throw u2Error;
  const u2Token = u2Data.session.access_token;

  console.log(`\n--- 2. Testing referral-apply (User 2 applies User 1's code) ---`);
  const applyRes = await fetch(`${supabaseUrl}/functions/v1/referral-apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${u2Token}`
    },
    body: JSON.stringify({
      referralCode: referralCode
    })
  });

  const applyText = await applyRes.text();
  console.log(`referral-apply Status: ${applyRes.status}`);
  if (!applyRes.ok) {
    console.log('Apply Error:', applyText);
  } else {
    const applyData = JSON.parse(applyText);
    console.log('Apply Result:', applyData);
  }

  console.log('\n--- 3. Testing referral-stats (User 1 after referral) ---');
  const statsRes2 = await fetch(`${supabaseUrl}/functions/v1/referral-stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${u1Token}`
    }
  });

  const statsData2 = await statsRes2.json();
  console.log('User 1 Stats (After):', statsData2);
}

runTests().catch(console.error);
