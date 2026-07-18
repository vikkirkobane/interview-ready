
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGN2cWN4Z3ZkZ3Z4dmZraGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTk1MDMsImV4cCI6MjA5NzUzNTUwM30.DlX5eiLs0jnMRu0T89mKYWv_XjzBwwiqufJJyTr7XhM';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email address as a command line argument.');
    console.error('Example: node test-payments.js your-email@domain.com');
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
  console.log('Authentication successful! Token acquired.');

  console.log('Initializing Paystack Payment (PLN_0jg6lfy4ttw68tj - 5 USD PREMIUM)...');
  
  const response = await fetch(`${supabaseUrl}/functions/v1/payments-initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      planCode: 'PLN_0jg6lfy4ttw68tj', // 5 USD Premium plan
      callbackUrl: 'https://interviewready.app/payment/callback',
      countryCode: null // International
    })
  });

  const responseText = await response.text();
  console.log('Response Status:', response.status);
  
  try {
    const data = JSON.parse(responseText);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n--- SUCCESS ---');
      console.log('Please visit the following URL to complete the test payment:');
      console.log(data.data.authorization_url);
    }
  } catch (e) {
    console.error('Failed to parse JSON response. Raw text:', responseText);
  }

  process.exit(0);
}

run();
