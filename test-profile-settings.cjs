const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runTests() {
  console.log("\n--- Setting up Test User for Profile & Settings ---");
  const email = `test-profile-${Date.now()}@example.com`;
  const password = "TestPassword123!";

  // Create via admin to skip email verification
  const { data: adminUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Initial Name" }
  });

  if (createError) {
    console.error("❌ Failed to create user:", createError);
    process.exit(1);
  }

  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error("❌ Failed to sign in:", authError);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ User authenticated: ${userId}`);

  // Test 1: Settings logic (Update User Metadata)
  console.log("\n--- Testing Settings Screen (User Metadata) ---");
  const { data: updatedUser, error: updateAuthError } = await supabase.auth.updateUser({
    data: { full_name: "Updated Name" }
  });

  if (updateAuthError) {
    console.error("❌ Failed to update settings:", updateAuthError);
  } else {
    console.log("✅ Successfully updated settings (full_name):", updatedUser.user.user_metadata.full_name);
  }

  // Test 2: Profile Logic & Completeness Trigger
  console.log("\n--- Testing Profile Screen & Completeness Trigger ---");
  
  // Fetch initial profile
  let { data: initialProfile, error: fetchErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchErr) {
    console.error("❌ Failed to fetch initial profile:", fetchErr);
  } else {
    console.log("✅ Initial Profile fetched. Completeness:", initialProfile.profile_completeness);
  }

  // Update profile with some details
  console.log("Updating profile with summary, skills, and target_roles...");
  const { error: profileUpdateErr } = await supabase
    .from('user_profiles')
    .update({
      summary: "I am a test software engineer.",
      technical_skills: ["JavaScript", "React", "Node.js"],
      target_roles: ["Software Engineer", "Fullstack Developer"]
    })
    .eq('user_id', userId);

  if (profileUpdateErr) {
    console.error("❌ Failed to update profile:", profileUpdateErr);
  } else {
    // Re-fetch to check if completeness trigger fired
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    console.log("✅ Profile updated.");
    console.log("✅ New Completeness Score (Trigger computed):", updatedProfile.profile_completeness);
    
    if (updatedProfile.profile_completeness > initialProfile.profile_completeness) {
      console.log("✅ SUCCESS: Profile completeness trigger works dynamically!");
    } else {
      console.log("⚠️ WARNING: Profile completeness score did not increase. Ensure trigger logic evaluates these fields.");
    }
  }

  // Cleanup
  console.log("\n--- Cleaning up ---");
  try {
    await adminSupabase.auth.admin.deleteUser(userId);
    console.log("✅ Test user deleted.");
  } catch (e) {
    console.log("⚠️ Could not delete user.");
  }
}

runTests();
