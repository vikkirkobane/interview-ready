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

  console.log('\n--- Testing answer-question ---');
  const askRes = await fetch(`${supabaseUrl}/functions/v1/answer-question`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      question: 'Tell me about a time you solved a difficult technical problem under pressure.',
      context_source: 'profile'
    })
  });
  
  console.log('answer-question Status:', askRes.status);
  const askData = await askRes.json();
  if (!askRes.ok) {
    console.error('Error:', askData);
  } else {
    console.log('Generated Answer:\n', askData.answer);
    const { data: profileAfter } = await client.from('user_profiles').select('ai_credits').single();
    console.log(`Credits after answer-question (-2 expected): ${profileAfter.ai_credits} (Was ${profile.ai_credits})`);
  }
}

runTests().catch(console.error);
