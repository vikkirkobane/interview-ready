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

  console.log('\n--- Testing cover-letters-create ---');
  const clRes = await fetch(`${supabaseUrl}/functions/v1/cover-letters-create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      job_title: 'Senior Frontend Engineer',
      company_name: 'TechCorp',
      tone: 'PROFESSIONAL',
      job_description: 'Looking for a Senior Frontend Engineer with 5+ years of experience in React, TypeScript, and modern CSS. Must have experience with performance optimization and accessible UI.'
    })
  });
  
  console.log('cover-letters-create Status:', clRes.status);
  const clData = await clRes.json();
  if (!clRes.ok) {
    console.error('Error:', clData);
  } else {
    console.log('Cover Letter ID:', clData.cover_letter_id);
    console.log('Generated Letter Meta:', clData.cover_letter.meta);
    const { data: profileAfter } = await client.from('user_profiles').select('ai_credits').single();
    console.log(`Credits after cover-letters-create (-2 expected): ${profileAfter.ai_credits} (Was ${profile.ai_credits})`);
  }
}

runTests().catch(console.error);
