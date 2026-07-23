require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testRecentActivities() {
  console.log('Logging in as a test user...');
  
  // Create a test user or just simulate the query
  const testEmail = 'test_google_existing@example.com';
  const testPassword = 'password123';
  
  // We'll sign up a test user, insert a mock resume, then fetch activities
  let authRes = await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });
  
  if (authRes.error && authRes.error.message.includes('Invalid login credentials')) {
    authRes = await supabase.auth.signUp({ email: testEmail, password: testPassword });
  }

  if (authRes.error) {
    console.error('Failed to auth:', authRes.error);
    return;
  }
  
  const user = authRes.data.user;
  console.log('Logged in as:', user.id);

  // Insert a mock resume to simulate "generated tasks"
  const { error: insertError } = await supabase.from('resumes').insert({
    user_id: user.id,
    title: 'Test Resume ' + Date.now(),
    content: { summary: 'test' },
    target_role: 'tester'
  });

  if (insertError) {
    console.error('Failed to insert resume:', insertError);
  } else {
    console.log('Inserted test resume');
  }

  // Fetch recent activities EXACTLY as useRecentActivitiesQuery does
  console.log('\nFetching activities via Promise.all...');
  try {
    const [
      { data: resumes, error: resumesErr },
      { data: covers, error: coversErr },
      { data: jobs, error: jobsErr },
      { data: interviews, error: interviewsErr },
      { data: research, error: researchErr },
      { data: linkedin, error: linkedinErr }
    ] = await Promise.all([
      supabase.from('resumes').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('cover_letters').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('job_applications').select('id, job_title, company, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('mock_interviews').select('id, role, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('company_research').select('id, company_name, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('linkedin_tasks').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5)
    ]);

    if (resumesErr) console.error('Resumes error:', resumesErr);
    if (coversErr) console.error('Covers error:', coversErr);
    if (jobsErr) console.error('Jobs error:', jobsErr);
    if (interviewsErr) console.error('Interviews error:', interviewsErr);
    if (researchErr) console.error('Research error:', researchErr);
    if (linkedinErr) console.error('Linkedin error:', linkedinErr);

    console.log('Resumes:', resumes);
    
    const activities = [];
    if (resumes) resumes.forEach(r => activities.push({ type: 'resume', title: r.title }));
    
    console.log(`Total activities found: ${activities.length}`);

  } catch (err) {
    console.error('Crash during fetch:', err);
  }
}

testRecentActivities();
