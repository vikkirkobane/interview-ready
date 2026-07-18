const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGN2cWN4Z3ZkZ3Z4dmZraGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTk1MDMsImV4cCI6MjA5NzUzNTUwM30.DlX5eiLs0jnMRu0T89mKYWv_XjzBwwiqufJJyTr7XhM';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await client
    .rpc('get_table_schema', { table_name: 'resumes' }); // Wait, RPC might not exist.
  // Instead, let's just fetch a single resume to see its shape
  const { data: resumes, error: err } = await client
    .from('resumes')
    .select('*')
    .limit(1);

  console.log('Resumes:', resumes);
  console.log('Error:', err);
  process.exit(0);
}

run();
