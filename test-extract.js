const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('--- Setting up Test User ---');
  const testEmail = `test_extract_${Date.now()}@example.com`;
  
  // Create test user using admin API (bypasses email confirmation)
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

  // Sign in to get a valid session token
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

  console.log('\n--- Testing profile-parse-resume ---');
  // Minimal valid PDF containing the text "This is a test PDF document."
  const pdfBase64 = "JVBERi0xLjQKJdPr6eEKMSAwIG9iaiAKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqIAoyIDAgb2JqIAo8PC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxPj4KZW5kb2JqIAozIDAgb2JqIAo8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDQgMCBSPj4+PiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqIAo0IDAgb2JqIAo8PC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYT4+CmVuZG9iaiAKNSAwIG9iaiAKPDwvTGVuZ3RoIDYgMCBSID4+CnN0cmVhbQpCVAovRjEgMjQgVGYKMTAwIDcwMCBUZAooVGhpcyBpcyBhIHRlc3QgUERGIGRvY3VtZW50LikgVGoKRVQNCmVuZHN0cmVhbQplbmRvYmogCjYgMCBvYmogCjU3CmVuZG9iaiAKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTM3IDAwMDAwIG4gCjAwMDAwMDAxODUgMDAwMDAgbiAKMDAwMDAwMDI0NCAwMDAwMCBuIAowMDAwMDAwMzM0IDAwMDAwIG4gCjAwMDAwMDA0MTYgMDAwMDAgbiAKMDAwMDAwMDUyMSAwMDAwMCBuIAp0cmFpbGVyIAo8PC9TaXplIDcgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjU0MgolJUVPRgo=";
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  fs.writeFileSync('dummy_resume.pdf', pdfBuffer);
  
  const formData1 = new FormData();
  const blob1 = new Blob([pdfBuffer], { type: 'application/pdf' });
  formData1.append('file', blob1, 'dummy_resume.pdf');

  try {
    const response1 = await fetch(`${supabaseUrl}/functions/v1/profile-parse-resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData1,
    });

    if (!response1.ok) {
      console.error('❌ profile-parse-resume Failed with status:', response1.status);
      console.error('Error Details:', await response1.text());
    } else {
      console.log('✅ profile-parse-resume Successful!');
      console.log('Output:', await response1.json());
    }
  } catch (err) {
    console.error('❌ Network Error:', err);
  }

  console.log('\n--- Testing jd-extract-text with IMAGE ---');
  // 1x1 PNG Image
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const imageBuffer = Buffer.from(pngBase64, 'base64');
  
  const formData3 = new FormData();
  const blob3 = new Blob([imageBuffer], { type: 'image/png' });
  formData3.append('file', blob3, 'dummy_job.png');

  try {
    const response3 = await fetch(`${supabaseUrl}/functions/v1/jd-extract-text`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData3,
    });

    if (!response3.ok) {
      console.error('❌ jd-extract-text (Image) Failed with status:', response3.status);
      console.error('Error Details:', await response3.text());
    } else {
      console.log('✅ jd-extract-text (Image) Successful!');
      console.log('Output:', await response3.json());
    }
  } catch (err) {
    console.error('❌ Network Error:', err);
  } finally {
    if (fs.existsSync('dummy_resume.pdf')) fs.unlinkSync('dummy_resume.pdf');
    
    console.log('\n--- Cleaning up Test User ---');
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log('✅ Test user deleted successfully!');
  }
}

runTests();
