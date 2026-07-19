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
  console.error("❌ Missing Supabase env variables. Check your .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function runLinkedinTest() {
  console.log("\n--- Setting up Test User ---");
  const testEmail = `test-linkedin-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  const { data: adminUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  });

  if (createError) {
    console.error("❌ Failed to create user via admin:", createError);
    process.exit(1);
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError) {
    console.error("❌ Failed to sign in:", authError);
    process.exit(1);
  }

  const userId = authData.user.id;
  const sessionToken = authData.session.access_token;

  console.log("✅ Authorized as Test User!");

  try {
    // 2. Grant credits
    await adminSupabase.from('user_credits').upsert({
      user_id: userId,
      linkedin_analysis_credits: 5,
    });

    console.log("\n--- 1. Testing LinkedIn Analyze ---");

    const payload = {
      headline: "Frontend Developer | React Enthusiast",
      about: "I build responsive web apps.",
      experience: [
        {
          title: "Frontend Developer",
          company: "Tech Corp",
          description: "Built UI components."
        }
      ],
      skills: ["React", "JavaScript", "CSS"],
      target_roles: ["Senior Frontend Developer"],
      years_experience: 3,
      tone: "PROFESSIONAL",
      spike: {
        differentiator: "Performance optimization",
        praised_for: "Writing clean code",
        problems_solved: "Reducing bundle size by 50%"
      }
    };

    const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/linkedin-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    const analyzeResult = await analyzeResponse.json();

    if (!analyzeResponse.ok) {
      console.error("❌ linkedin-analyze failed:", analyzeResult);
    } else {
      console.log("✅ linkedin-analyze Successful!\n");
      console.log("--- RAW ANALYSIS DATA ---");
      console.log(JSON.stringify(analyzeResult, null, 2));
    }

  } catch (error) {
    console.error("❌ Test crashed:", error);
  } finally {
    console.log("\n--- Cleaning up Test User ---");
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete test user:", deleteError);
    } else {
      console.log("✅ Test user deleted successfully.");
    }
  }
}

runLinkedinTest();
