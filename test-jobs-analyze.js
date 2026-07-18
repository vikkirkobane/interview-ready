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

  console.log('\n--- Testing jobs-analyze (Job Match) ---');
  const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/jobs-analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      job_description: 'Looking for a Senior Frontend Engineer with 5+ years of experience in React, TypeScript, and modern CSS. Must have experience with performance optimization and accessible UI.',
      user_role: 'Frontend Developer',
      user_profile: {
        skills: ['React', 'TypeScript', 'CSS', 'Node.js'],
        experience: '4 years of experience building web applications.'
      }
    })
  });
  
  console.log('jobs-analyze Status:', analyzeRes.status);
  const analyzeData = await analyzeRes.json();
  if (!analyzeRes.ok) {
    console.error('Error:', analyzeData);
  } else {
    console.log('Analysis Title:', analyzeData.analysis.title);
    console.log('Analysis Fit Score:', analyzeData.analysis.fit_score);
    console.log('Job ID created:', analyzeData.job_id);
    const { data: profileAfter } = await client.from('user_profiles').select('ai_credits').single();
    console.log(`Credits after jobs-analyze (-1 expected): ${profileAfter.ai_credits} (Was ${profile.ai_credits})`);
  }
}

runTests().catch(console.error);
