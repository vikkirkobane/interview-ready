import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = 'victorchoogo37@gmail.com';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log(`Authenticating as ${email}...`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123'
  });

  if (signInError) {
    console.error('Auth error:', signInError.message);
    process.exit(1);
  }

  const token = signInData.session.access_token;
  const client = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: profile } = await client.from('user_profiles').select('ai_credits, credit_balance').single();
  console.log('Initial Credits:', profile);

  console.log('\n--- Testing company-research ---');
  const crRes = await fetch(`${supabaseUrl}/functions/v1/company-research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      company_url: 'https://openai.com'
    })
  });
  
  console.log('company-research Status:', crRes.status);
  const crData = await crRes.json();
  if (!crRes.ok) {
    console.error('Error:', crData);
  } else {
    console.log('Company Name:', crData.data.company_name);
    console.log('Verdict:', crData.data.summary_verdict);
    const { data: profileAfter } = await client.from('user_profiles').select('ai_credits').single();
    console.log(`Credits after company-research (-2 expected): ${profileAfter.ai_credits} (Was ${profile.ai_credits})`);
  }
}

runTests().catch(console.error);
