const fs = require('fs');

// Read .env file manually
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

async function runTests() {
  console.log('--- Testing profile-parse-resume ---');
  const dummyText = 'This is a test resume.\nExperience: Software Engineer at Google.\nSkills: React Native, Supabase, TypeScript.';
  fs.writeFileSync('dummy_resume.pdf', dummyText);
  
  const formData1 = new FormData();
  const blob1 = new Blob([fs.readFileSync('dummy_resume.pdf')], { type: 'application/pdf' });
  formData1.append('file', blob1, 'dummy_resume.pdf');

  try {
    const response1 = await fetch(`${supabaseUrl}/functions/v1/profile-parse-resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supabaseAnonKey}` },
      body: formData1,
    });

    if (!response1.ok) {
      console.error('❌ profile-parse-resume Failed with status:', response1.status);
      console.error('Error Details:', await response1.text());
    } else {
      console.log('✅ profile-parse-resume Successful!');
    }
  } catch (err) {
    console.error('❌ Network Error:', err);
  }

  console.log('\n--- Testing jd-extract-text ---');
  const formData2 = new FormData();
  const blob2 = new Blob([fs.readFileSync('dummy_resume.pdf')], { type: 'application/pdf' });
  formData2.append('file', blob2, 'dummy_resume.pdf');

  try {
    const response2 = await fetch(`${supabaseUrl}/functions/v1/jd-extract-text`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supabaseAnonKey}` },
      body: formData2,
    });

    if (!response2.ok) {
      console.error('❌ jd-extract-text Failed with status:', response2.status);
      console.error('Error Details:', await response2.text());
    } else {
      console.log('✅ jd-extract-text Successful!');
    }
  } catch (err) {
    console.error('❌ Network Error:', err);
  } finally {
    if (fs.existsSync('dummy_resume.pdf')) fs.unlinkSync('dummy_resume.pdf');
  }
}

runTests();
