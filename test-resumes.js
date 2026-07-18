const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email address.');
    process.exit(1);
  }

  console.log(`Authenticating as ${email}...`);
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email,
    password: 'password123',
  });

  if (authError) {
    console.error('Auth Error:', authError.message);
    process.exit(1);
  }

  const token = authData.session.access_token;
  const user = authData.user;
  
  // 1. Check initial credits
  const { data: userData } = await client.from('users').select('ai_credits, credit_balance').eq('id', user.id).single();
  console.log('Initial Credits:', userData);

  console.log('\n--- 1. Testing resumes-create ---');
  
  // Make sure the user profile has some data
  await client.from('user_profiles').update({
    headline: 'Software Engineer',
    bio: 'Test bio',
    location: 'Remote',
    experience_years: 5,
    education_level: 'Bachelors'
  }).eq('user_id', user.id);
  
  const response = await fetch(`${supabaseUrl}/functions/v1/resumes-create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'AI Tailored Resume Test',
      is_base: true
    })
  });

  const responseText = await response.text();
  console.log('resumes-create Status:', response.status);
  
  let resumeId = null;
  try {
    const data = JSON.parse(responseText);
    console.log('Response Data:', data);
    resumeId = data.resume_id;
  } catch (e) {
    console.error('Failed to parse JSON response:', responseText);
    process.exit(1);
  }

  if (!resumeId) {
    console.error('No resume ID returned, aborting.');
    process.exit(1);
  }

  // Check credits after request
  const { data: userDataAfter } = await client.from('users').select('ai_credits, credit_balance').eq('id', user.id).single();
  console.log('Credits after resumes-create (-3 expected):', userDataAfter);

  console.log('\nWaiting for AI generation to complete (15 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  const { data: resumeContent, error: contentError } = await client
    .from('resume_contents')
    .select('*')
    .eq('resume_id', resumeId)
    .single();

  if (contentError || !resumeContent) {
    console.error('Error fetching generated content, or generation failed/timed out:', contentError);
    // Check resume status
    const { data: resumeState } = await client.from('resumes').select('status').eq('id', resumeId).single();
    console.log('Resume status is:', resumeState?.status);
  } else {
    console.log('\n--- AI Generation Success! ---');
    console.log('Summary generated:', resumeContent.summary);
  }

  console.log('\n--- 2. Testing resumes-section-rewrite ---');
  const rewriteResponse = await fetch(`${supabaseUrl}/functions/v1/resumes-section-rewrite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      section_type: 'summary',
      text: 'I write code sometimes',
      jd_context: 'Senior Software Engineer role'
    })
  });

  const rewriteText = await rewriteResponse.text();
  console.log('resumes-section-rewrite Status:', rewriteResponse.status);
  
  try {
    const rewriteData = JSON.parse(rewriteText);
    console.log('Rewritten content:', rewriteData.content);
  } catch(e) {
    console.error('Failed to parse rewrite response:', rewriteText);
  }

  // Check credits after rewrite
  const { data: userDataFinal } = await client.from('users').select('ai_credits, credit_balance').eq('id', user.id).single();
  console.log('\nCredits after rewrite (-1 expected):', userDataFinal);

  process.exit(0);
}

run();
