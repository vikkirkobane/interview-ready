const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read .env file manually since dotenv is not installed
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('Testing Supabase Authentication connection...');
  console.log(`Connecting to: ${supabaseUrl}`);

  // 1. Try to sign up a dummy user
  const email = `test-user-${Date.now()}@example.com`;
  const password = 'securepassword123';
  
  console.log(`\n1. Attempting to sign up with ${email}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error('❌ Sign Up Failed:', signUpError.message);
  } else {
    console.log('✅ Sign Up Successful! User ID:', signUpData.user?.id);
    
    // 2. Try to log in with the same user
    console.log(`\n2. Attempting to sign in with ${email}...`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('❌ Sign In Failed:', signInError.message);
    } else {
      console.log('✅ Sign In Successful! Access Token received.');
      
      // 3. Verify session
      console.log('\n3. Verifying session...');
      const { data: userData, error: userError } = await supabase.auth.getUser(signInData.session.access_token);
      
      if (userError) {
         console.error('❌ Get User Failed:', userError.message);
      } else {
         console.log('✅ User successfully authenticated! Verified email:', userData.user?.email);
      }
    }
  }
}

testAuth();
