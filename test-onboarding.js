import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const client = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  console.log('\n--- 1. Testing profile-parse-resume ---');
  // Create a dummy resume PDF for testing
  const dummyResumePath = path.join(__dirname, 'dummy-resume.pdf');
  if (!fs.existsSync(dummyResumePath)) {
    fs.writeFileSync(dummyResumePath, 'Dummy PDF content - this would normally be a real PDF');
  }

  const fileData = fs.readFileSync(dummyResumePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileData], { type: 'application/pdf' }), 'dummy-resume.pdf');

  const parseRes = await fetch(`${supabaseUrl}/functions/v1/profile-parse-resume`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  console.log('profile-parse-resume Status:', parseRes.status);
  const parseData = await parseRes.json();
  if (!parseRes.ok) {
    console.error('Error:', parseData);
  } else {
    console.log('Parsed Profile Data:', JSON.stringify(parseData.profile, null, 2));
  }

  console.log('\n--- 2. Testing profile-update ---');
  const updateRes = await fetch(`${supabaseUrl}/functions/v1/profile-update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      first_name: 'Victor',
      last_name: 'Choogo',
      target_roles: ['Senior Full Stack Engineer'],
      years_experience: 5
    })
  });

  console.log('profile-update Status:', updateRes.status);
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    console.error('Error:', updateData);
  } else {
    console.log('Profile updated successfully');
  }

  console.log('\n--- 3. Testing profile-get ---');
  const getRes = await fetch(`${supabaseUrl}/functions/v1/profile-get`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('profile-get Status:', getRes.status);
  const getData = await getRes.json();
  if (!getRes.ok) {
    console.error('Error:', getData);
  } else {
    console.log('Target Roles:', getData.profile?.target_roles);
  }
}

runTests().catch(console.error);
