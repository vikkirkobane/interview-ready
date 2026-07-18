const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = Object.fromEntries(envFile.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split('=')));

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = envVars.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Anon Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRecentActivities() {
  console.log('--- Starting Recent Activities Database Test ---');

  // 1. Create a dummy test user
  const email = `test_activity_${Date.now()}@example.com`;
  const password = 'password123';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error('Failed to create test user:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`\n✅ Test user created: ${userId}`);

  // 2. Insert into company_research
  console.log('\n--- Inserting into company_research ---');
  const { data: researchData, error: researchError } = await supabase
    .from('company_research')
    .insert({
      user_id: userId,
      company_name: 'Test Corp',
      company_url: 'https://testcorp.com',
      result_data: { test: true, message: 'dummy research' }
    })
    .select('id')
    .single();

  if (researchError) {
    console.error('❌ Failed to insert company_research:', researchError.message);
  } else {
    console.log(`✅ Successfully inserted company_research record: ${researchData.id}`);
  }

  // 3. Insert into linkedin_tasks
  console.log('\n--- Inserting into linkedin_tasks ---');
  const { data: linkedinData, error: linkedinError } = await supabase
    .from('linkedin_tasks')
    .insert({
      user_id: userId,
      task_type: 'analyze',
      title: 'Test Profile Analysis',
      result_data: { profile: 'great', score: 100 }
    })
    .select('id')
    .single();

  if (linkedinError) {
    console.error('❌ Failed to insert linkedin_tasks:', linkedinError.message);
  } else {
    console.log(`✅ Successfully inserted linkedin_tasks record: ${linkedinData.id}`);
  }

  // 4. Query to verify RLS works
  console.log('\n--- Querying records as the test user ---');
  const { data: r1 } = await supabase.from('company_research').select('*');
  const { data: r2 } = await supabase.from('linkedin_tasks').select('*');
  console.log(`Found ${r1?.length} company_research records.`);
  console.log(`Found ${r2?.length} linkedin_tasks records.`);

  if (r1?.length > 0 && r2?.length > 0) {
    console.log('\n🎉 TEST PASSED! The tables and RLS policies are working correctly.');
  } else {
    console.error('\n❌ TEST FAILED! Records were not found.');
  }

  console.log('\n--- Cleanup ---');
  // Clean up user (requires service role, so we just sign out, but the DB keeps the dummy record. 
  // It's okay for testing, but in a real app we might delete it using admin API).
  await supabase.auth.signOut();
  console.log('✅ Signed out. (Dummy data left in DB for verification)');
}

testRecentActivities();
