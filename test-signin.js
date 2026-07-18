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
  console.log('Testing Supabase Authentication endpoint...');
  
  // Try to log in with an intentionally bad account
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'nonexistent-user-123@example.com',
    password: 'wrongpassword',
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      console.log('✅ Auth API is working perfectly! Reached the backend and it correctly rejected bad credentials.');
    } else {
      console.error('❌ Received unexpected error from Auth API:', error);
    }
  } else {
    console.log('Signed in?!', data);
  }
}

testAuth();
