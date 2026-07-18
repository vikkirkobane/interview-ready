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

  console.log('\n--- 1. Testing linkedin-analyze ---');
  const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/linkedin-analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      target_roles: ['Software Engineer', 'Fullstack Developer'],
      headline: 'Software Engineer',
      about: 'I am a software engineer looking for new opportunities.',
      experience: [{
        title: 'Software Engineer',
        company: 'Tech Corp',
        description: 'I wrote code and fixed bugs.'
      }],
      skills: ['JavaScript', 'React', 'Node.js']
    })
  });
  
  console.log('linkedin-analyze Status:', analyzeRes.status);
  const analyzeData = await analyzeRes.json();
  if (!analyzeRes.ok) {
    console.error('Error:', analyzeData);
  } else {
    console.log('Analysis Overall Score:', analyzeData.analysis?.overall_score);
  }

  console.log('\n--- 2. Testing linkedin-optimize (HEADLINE) ---');
  const optimizeRes = await fetch(`${supabaseUrl}/functions/v1/linkedin-optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      section: 'HEADLINE',
      current_content: 'Software Engineer',
      target_roles: ['Software Engineer', 'Fullstack Developer']
    })
  });

  console.log('linkedin-optimize Status:', optimizeRes.status);
  const optimizeData = await optimizeRes.json();
  if (!optimizeRes.ok) {
    console.error('Error:', optimizeData);
  } else {
    console.log('Optimized Headlines Data:', JSON.stringify(optimizeData.result, null, 2));
  }

  console.log('\n--- 3. Testing linkedin-engagement-plan ---');
  const planRes = await fetch(`${supabaseUrl}/functions/v1/linkedin-engagement-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      target_roles: ['Software Engineer'],
      industry: 'Technology'
    })
  });

  console.log('linkedin-engagement-plan Status:', planRes.status);
  const planData = await planRes.json();
  if (!planRes.ok) {
    console.error('Error:', planData);
  } else {
    console.log('Engagement Plan Data:', JSON.stringify(planData.plan, null, 2));
  }

  const { data: profileAfter } = await client.from('user_profiles').select('ai_credits').single();
  console.log(`\nCredits after linkedin operations (-5 expected): ${profileAfter.ai_credits} (Was ${profile.ai_credits})`);
}

runTests().catch(console.error);
