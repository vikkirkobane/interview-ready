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
  
  console.log('\n--- 1. Testing applications-crud (POST) ---');
  const createRes = await fetch(`${supabaseUrl}/functions/v1/applications-crud`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      job_title: 'Fullstack Developer',
      company: 'Startup Inc',
      location: 'New York, NY',
      status: 'APPLIED',
      notes: 'Applied through website.'
    })
  });
  
  console.log('Create Status:', createRes.status);
  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error('Error:', createData);
    process.exit(1);
  }
  const appId = createData.application.id;
  console.log('Created Application ID:', appId);

  console.log('\n--- 2. Testing applications-crud (PUT) ---');
  const updateRes = await fetch(`${supabaseUrl}/functions/v1/applications-crud/${appId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      status: 'INTERVIEW',
      notes: 'Scheduled for next week.'
    })
  });
  
  console.log('Update Status:', updateRes.status);
  const updateText = await updateRes.text();
  console.log('Update Text:', updateText);
  let updateData;
  try {
    updateData = JSON.parse(updateText);
    console.log('Updated Application Status:', updateData.application?.status);
  } catch(e) {}

  console.log('\n--- 3. Testing applications-list (GET /list) ---');
  const listRes = await fetch(`${supabaseUrl}/functions/v1/applications-list/list`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('List Status:', listRes.status);
  const listData = await listRes.json();
  console.log('Total Applications in List:', listData.applications?.length);

  console.log('\n--- 4. Testing applications-list (GET /stats) ---');
  const statsRes = await fetch(`${supabaseUrl}/functions/v1/applications-list/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Stats Status:', statsRes.status);
  const statsData = await statsRes.json();
  console.log('Stats:', statsData.funnel);

  console.log('\n--- 5. Testing applications-crud (DELETE) ---');
  const deleteRes = await fetch(`${supabaseUrl}/functions/v1/applications-crud/${appId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Delete Status:', deleteRes.status);
  const deleteData = await deleteRes.json();
  console.log('Delete Message:', deleteData.message);
}

runTests().catch(console.error);
