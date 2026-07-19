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

async function runCoreTests() {
  console.log('--- Setting up Test User ---');
  const testEmail = `test_core_${Date.now()}@example.com`;
  
  // 1. Create dummy user
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

  // 2. Sign in
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

  // 3. Inject dummy profile data & credits using Service Key
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .update({ 
      resume_raw_text: 'Experienced Software Engineer with 5 years of experience in React and Node.js. Built high-scale applications for tech startups.'
    })
    .eq('user_id', userId);
    
  if (profileError) {
    console.error('Failed to setup dummy profile:', profileError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return;
  }

  const { error: userError } = await supabaseAdmin
    .from('users')
    .update({ ai_credits: 100 })
    .eq('id', userId);

  if (userError) {
    console.error('Failed to setup user credits:', userError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return;
  }
  
  console.log('✅ Injected dummy profile data & credits!');

  // 4. Test Cover Letters Create
  console.log('\n--- Testing cover-letters-create ---');
  const payload = {
    job_title: "Senior Frontend Developer",
    company_name: "TechNova Solutions",
    tone: "PROFESSIONAL",
    job_description: "We are looking for an experienced frontend developer proficient in React.js and modern JavaScript to build out our next-generation web application. The ideal candidate cares about web performance and UX."
  };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/cover-letters-create`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('❌ cover-letters-create Failed with status:', response.status);
      console.error('Error Details:', await response.text());
    } else {
      console.log('✅ cover-letters-create Successful!');
      const data = await response.json();
      console.log('\nGenerated Cover Letter Snippet:');
      console.log(data.cover_letter?.paragraphs?.opening?.text || "No text generated");
    }
  } catch (err) {
    console.error('❌ Network Error:', err);
  } finally {
    console.log('\n--- Cleaning up Test User ---');
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log('✅ Test user deleted successfully!');
  }
}

runCoreTests();
