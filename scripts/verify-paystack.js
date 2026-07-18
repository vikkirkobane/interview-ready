const { createClient } = require('@supabase/supabase-js');

// Helper to log with colors
const log = {
  info: (msg) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
};

async function runTests() {
  log.info('Starting Paystack Implementation Verification...');

  const supabaseUrl = 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGN2cWN4Z3ZkZ3Z4dmZraGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTk1MDMsImV4cCI6MjA5NzUzNTUwM30.DlX5eiLs0jnMRu0T89mKYWv_XjzBwwiqufJJyTr7XhM';

  if (!supabaseUrl || !supabaseKey) {
    log.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Verify Plans in Database
  log.info('1. Verifying Database Plans...');
  try {
    const { data: usdPlans, error: usdError } = await supabase
      .from('paystack_plans')
      .select('*')
      .eq('currency', 'USD')
      .eq('is_active', true);

    if (usdError) throw usdError;
    if (usdPlans.length > 0) {
      log.success(`Found ${usdPlans.length} active USD plans.`);
    } else {
      log.warn('No active USD plans found in the database. Ensure migrations are pushed.');
    }

    const { data: kesPlans, error: kesError } = await supabase
      .from('paystack_plans')
      .select('*')
      .eq('currency', 'KES')
      .eq('is_active', true);

    if (kesError) throw kesError;
    if (kesPlans.length > 0) {
      log.success(`Found ${kesPlans.length} active KES plans.`);
    } else {
      log.warn('No active KES plans found in the database. Ensure migrations are pushed.');
    }
  } catch (err) {
    log.error(`Database check failed: ${err.message}`);
  }

  // 2. Test Edge Function: payments-initialize
  log.info('2. Testing payments-initialize Edge Function...');
  try {
    // We need a dummy user session to call the protected endpoint
    const dummyEmail = `test-paystack-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: dummyEmail,
      password: 'testPassword123!',
      options: { data: { first_name: 'Test', last_name: 'User' } },
    });

    if (authError) {
      log.warn(`Could not create test user for Edge Function test: ${JSON.stringify(authError, null, 2)}`);
      log.warn('Ensure your remote database triggers (handle_new_user) are deployed and working.');
    } else {
      log.success(`Created test user: ${authData.user.id}`);

      // We will try to fetch a KES plan to initialize
      const { data: plan } = await supabase
        .from('paystack_plans')
        .select('*')
        .eq('currency', 'KES')
        .limit(1)
        .single();

      if (plan) {
        log.info(`Calling payments-initialize for plan: ${plan.plan_code}`);
        const response = await fetch(`${supabaseUrl}/functions/v1/payments-initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authData.session.access_token}`,
          },
          body: JSON.stringify({
            planCode: plan.plan_code,
            callbackUrl: 'interviewready://payment/callback',
            countryCode: 'KE',
          }),
        });

        const result = await response.json();
        if (response.ok && result.success) {
          log.success(`payments-initialize succeeded! Authorization URL: ${result.data.authorization_url}`);
          log.success('Edge Function is successfully communicating with Paystack API.');
        } else {
          log.error(`payments-initialize failed: ${result.error || JSON.stringify(result)}`);
          log.info('Make sure PAYSTACK_SECRET_KEY is configured in your Supabase Edge Function secrets.');
        }
      } else {
        log.warn('Cannot test payments-initialize without an active plan in the database.');
      }

      // Cleanup test user (if we had admin rights we'd delete, but we just leave it or could test verification)
      log.info('Finished Edge Function tests.');
    }
  } catch (err) {
    log.error(`Edge Function test failed: ${err.message}`);
  }

  log.info('---');
  log.info('Verification Complete.');
  log.info('To fully verify webhooks and verifications, please perform a manual test transaction in the app.');
}

runTests();
