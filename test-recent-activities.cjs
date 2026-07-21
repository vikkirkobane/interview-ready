const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testRecentActivities() {
  console.log("Fetching recent activities globally using service role key...");
  
  // Fetch exactly like the hook
  const [
    { data: resumes },
    { data: covers },
    { data: jobs },
    { data: interviews },
    { data: research },
    { data: linkedin }
  ] = await Promise.all([
    supabase.from('resumes').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('cover_letters').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('job_applications').select('id, job_title, company, updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('mock_interviews').select('id, role, updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('company_research').select('id, company_name, updated_at').order('updated_at', { ascending: false }).limit(5),
    supabase.from('linkedin_tasks').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5)
  ]);

  const activities = [];
  
  if (resumes) resumes.forEach(r => activities.push({ type: 'resume', title: r.title || 'Untitled Resume', date: r.updated_at }));
  if (covers) covers.forEach(c => activities.push({ type: 'cover_letter', title: c.title || 'Untitled Cover Letter', date: c.updated_at }));
  if (jobs) jobs.forEach(j => activities.push({ type: 'job_match', title: `${j.job_title || 'Unknown Role'} at ${j.company || 'Unknown Company'}`, date: j.updated_at }));
  if (interviews) interviews.forEach(i => activities.push({ type: 'interview', title: `Mock Interview: ${i.role || 'General'}`, date: i.updated_at }));
  if (research) research.forEach(r => activities.push({ type: 'company_research', title: `Company Research: ${r.company_name}`, date: r.updated_at }));
  if (linkedin) linkedin.forEach(l => activities.push({ type: 'linkedin', title: l.title || 'LinkedIn Task', date: l.updated_at }));

  const sorted = activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  
  console.log("Recent Activities Global Database Check:");
  console.log(JSON.stringify(sorted, null, 2));
}

testRecentActivities().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
