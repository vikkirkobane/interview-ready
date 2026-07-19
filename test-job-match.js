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

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runJobMatchTest() {
  console.log('--- Setting up Test User ---');
  const testEmail = `jobtest_${Date.now()}@example.com`;
  
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

  // Sign in
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

  // Give credits to the user so they can run analysis and roadmap
  const { error: userError } = await supabaseAdmin
    .from('users')
    .update({ ai_credits: 50 })
    .eq('id', userId);

  if (userError) {
    console.error('Failed to setup user credits:', userError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return;
  }
  
  const userProfile = {
    first_name: "John",
    last_name: "Doe",
    current_role: "Frontend Developer",
    technical_skills: ["React", "JavaScript", "HTML", "CSS"],
    soft_skills: ["Communication", "Teamwork"],
    work_history: [
      {
        company: "Tech Corp",
        title: "Frontend Developer",
        duration: "2 years",
        bullets: ["Built React applications", "Improved performance"]
      }
    ]
  };

  const jobDescription = `
    Job Title: Fullstack Web Developer
    Company: InnovateTech
    Description: We are looking for a highly skilled Fullstack developer.
    Responsibilities: Build out our web platform from end to end.
    Required Skills: React, Node.js, PostgreSQL, TypeScript, AWS.
    Nice to haves: GraphQL, Docker.
  `;

  try {
    console.log('\n--- 1. Testing jobs-analyze ---');
    const analyzePayload = {
      job_description: jobDescription,
      user_profile: userProfile,
      user_role: "Frontend Developer"
    };

    const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/jobs-analyze`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analyzePayload),
    });

    if (!analyzeResponse.ok) {
      console.error('❌ jobs-analyze Failed with status:', analyzeResponse.status);
      console.error('Error Details:', await analyzeResponse.text());
      return;
    }
    
    const analyzeData = await analyzeResponse.json();
    console.log('✅ jobs-analyze Successful!');
    console.log('Match Score:', analyzeData.analysis.fit_score);
    console.log('Missing Skills Identified:', analyzeData.analysis.missing_bonus_skills);
    
    const jobId = analyzeData.job_id;
    if (!jobId) {
       console.error('❌ No job_id returned!');
       return;
    }

    console.log(`\n--- 2. Testing jobs-roadmap-generate (Job ID: ${jobId}) ---`);
    const roadmapPayload = {
      job_id: jobId
    };

    const roadmapResponse = await fetch(`${supabaseUrl}/functions/v1/jobs-roadmap-generate`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(roadmapPayload),
    });

    if (!roadmapResponse.ok) {
      console.error('❌ jobs-roadmap-generate Failed with status:', roadmapResponse.status);
      console.error('Error Details:', await roadmapResponse.text());
    } else {
      console.log('✅ jobs-roadmap-generate Successful!');
      const roadmapData = await roadmapResponse.json();
      console.log('\n--- RAW ROADMAP DATA ---');
      console.log(JSON.stringify(roadmapData, null, 2));
      console.log('------------------------\n');
      console.log('\nGenerated Roadmap Title:', roadmapData.data?.title || "No Title");
      console.log('Duration Days:', roadmapData.data?.duration_days);
      console.log('Modules Count:', roadmapData.data?.modules?.length || 0);
      
      if (roadmapData.data?.modules?.length > 0) {
         console.log('\nSample Module:');
         console.log(`- Title: ${roadmapData.data.modules[0].module_title} (${roadmapData.data.modules[0].days_allocated})`);
         console.log(`  Focus: ${roadmapData.data.modules[0].focus_skill}`);
         console.log(`  Action Items: ${roadmapData.data.modules[0].action_items.length}`);
         console.log(`  Resources: ${roadmapData.data.modules[0].resources_to_use.join(', ')}`);
      }
    }
  } catch (err) {
    console.error('❌ Network Error:', err);
  } finally {
    console.log('\n--- Cleaning up Test User ---');
    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log('✅ Test user deleted successfully!');
  }
}

runJobMatchTest();
