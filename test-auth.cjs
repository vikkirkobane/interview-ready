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

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("❌ Missing Supabase env variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAuthentication() {
  console.log("\n====================================");
  console.log("   TESTING AUTHENTICATION FLOWS     ");
  console.log("====================================\n");

  const testEmail = `test-auth-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const updatedEmail = `test-auth-updated-${Date.now()}@example.com`;

  let userId = null;

  try {
    // 1. SIGN UP (via admin for script test)
    console.log("1. Testing User Creation...");
    const { data: signUpData, error: signUpError } = await adminSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (signUpError) {
      console.error("❌ Sign Up Failed:", signUpError.message);
    } else {
      userId = signUpData.user.id;
      console.log(`✅ User Creation Successful! User ID: ${userId}`);
    }

    // 2. SIGN IN
    console.log("\n2. Testing Sign In...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error("❌ Sign In Failed:", signInError.message);
    } else {
      console.log("✅ Sign In Successful!");
    }

    // 3. FORGOT PASSWORD (Reset Password)
    console.log("\n3. Testing Forgot Password (Password Reset)...");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'interview-ready://reset-password',
    });

    if (resetError) {
      console.error("❌ Forgot Password Failed:", resetError.message);
    } else {
      console.log("✅ Forgot Password Successful! (Email placed in queue / mocked if running locally)");
    }

    // 4. CHANGE EMAIL
    console.log("\n4. Testing Change Email...");
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      email: updatedEmail,
    });

    if (updateError) {
      console.error("❌ Change Email Failed:", updateError.message);
    } else {
      console.log(`✅ Change Email Successful! Pending email change requested to: ${updateData.user.new_email || updatedEmail}`);
    }

    // 5. SIGN OUT
    console.log("\n5. Testing Sign Out...");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("❌ Sign Out Failed:", signOutError.message);
    } else {
      console.log("✅ Sign Out Successful!");
    }

  } catch (err) {
    console.error("Unexpected Error:", err);
  } finally {
    // CLEANUP
    if (userId) {
      console.log("\n--- Cleaning up Test User ---");
      const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("❌ Failed to delete test user:", deleteError.message);
      } else {
        console.log("✅ Test User deleted from database.");
      }
    }
  }
}

testAuthentication().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
