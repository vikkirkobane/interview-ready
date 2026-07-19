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

async function runCompanyResearchTest() {
  console.log('--- Setting up Test User ---');
  const testEmail = `companytest_${Date.now()}@example.com`;
  
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

  try {
    console.log('\n--- 1. Testing Company Research ---');
    const payload = {
      company_url: 'https://vercel.com',
      context: 'Frontend Developer role'
    };

    const res = await fetch(`${supabaseUrl}/functions/v1/company-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error('❌ company-research Failed!');
      const errorText = await res.text();
      throw new Error(`company-research failed: ${errorText}`);
    }

    const responseData = await res.json();
    console.log('✅ company-research Successful!');
    console.log('\n--- RAW RESEARCH DATA ---');
    console.log(JSON.stringify(responseData, null, 2));

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

runCompanyResearchTest();
