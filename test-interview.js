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

async function runInterviewTest() {
  console.log('--- Setting up Test User ---');
  const testEmail = `interviewtest_${Date.now()}@example.com`;
  
  const { data: adminData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: 'TestPassword123!',
    email_confirm: true
  });
  
  if (createError) {
    console.error('Failed to create test user:', createError);
    return;
  }
  
  const userId = adminData.user.id;

  // Sign in
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'TestPassword123!',
  });

  if (signInError) {
    console.error('Failed to sign in:', signInError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return;
  }
  
  const token = authData.session.access_token;
  console.log('✅ Authorized as Test User!');

  // Give credits to the user
  await supabaseAdmin.from('users').update({ ai_credits: 50 }).eq('id', userId);

  let sessionId = null;

  try {
    // 1. Start Interview
    console.log('\n--- 1. Starting Interview ---');
    const startPayload = {
      role: 'Frontend Developer',
      interview_type: 'BEHAVIORAL',
      difficulty: 'INTERMEDIATE',
      company: 'TechCorp'
    };

    const startRes = await fetch(`${supabaseUrl}/functions/v1/interviews-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(startPayload)
    });

    if (!startRes.ok) {
      console.error('❌ interviews-start Failed!');
      const errorText = await startRes.text();
      throw new Error(`interviews-start failed: ${errorText}`);
    }

    const startData = await startRes.json();
    console.log('Start Data:', JSON.stringify(startData, null, 2));
    sessionId = startData.data?.session_id || startData.data?.interview?.id || startData.session_id || startData.interview?.id;
    console.log('✅ interviews-start Successful! Session ID:', sessionId);
    console.log('Initial Message:', startData.data?.initial_message || startData.data?.interview?.messages?.[0]?.content || startData.initial_message || startData.interview?.messages?.[0]?.content);

    // 2. Send Message
    console.log('\n--- 2. Sending Interview Message ---');
    const msgPayload = {
      interview_id: sessionId,
      content: 'I have 3 years of experience in React and Node.js. In my previous role at TechCorp, I led a team of 3 developers.'
    };

    const msgRes = await fetch(`${supabaseUrl}/functions/v1/interviews-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(msgPayload)
    });

    if (!msgRes.ok) {
      console.error('❌ interviews-message Failed!');
      const errorText = await msgRes.text();
      throw new Error(`interviews-message failed: ${errorText}`);
    }

    const msgData = await msgRes.json();
    console.log('✅ interviews-message Successful!');
    console.log('AI Response:', msgData.data?.message?.content || msgData.data?.content || msgData.message?.content || msgData.content);

    // 3. Get Feedback
    console.log('\n--- 3. Getting Interview Feedback ---');
    const feedbackRes = await fetch(`${supabaseUrl}/functions/v1/interviews-feedback?interview_id=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    if (!feedbackRes.ok) {
      console.error('❌ interviews-feedback Failed!');
      const errorText = await feedbackRes.text();
      throw new Error(`interviews-feedback failed: ${errorText}`);
    }

    const feedbackData = await feedbackRes.json();
    console.log('✅ interviews-feedback Successful!');
    console.log('\n--- RAW FEEDBACK DATA ---');
    console.log(JSON.stringify(feedbackData, null, 2));

  } catch (error) {
    console.error('\nTest Failed with Error:', error);
  } finally {
    console.log('\n--- Cleaning up Test User ---');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete test user:', deleteError);
    } else {
      console.log('✅ Test user deleted successfully!');
    }
  }
}

runInterviewTest();
