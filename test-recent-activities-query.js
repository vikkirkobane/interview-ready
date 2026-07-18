const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = Object.fromEntries(envFile.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split('=')));

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars.EXPO_PUBLIC_SUPABASE_URL, envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  try {
    const results = await Promise.all([
      supabase.from('resumes').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('cover_letters').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('job_applications').select('id, job_title, company, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('mock_interviews').select('id, role, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('company_research').select('id, company_name, updated_at').order('updated_at', { ascending: false }).limit(5),
      supabase.from('linkedin_tasks').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5)
    ]);
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Caught error:", err);
  }
}
run();
