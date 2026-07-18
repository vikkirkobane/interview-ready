const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGN2cWN4Z3ZkZ3Z4dmZraGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTk1MDMsImV4cCI6MjA5NzUzNTUwM30.DlX5eiLs0jnMRu0T89mKYWv_XjzBwwiqufJJyTr7XhM';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await client
    .from('resume_templates')
    .select('*');

  console.log('Templates:', data);
  console.log('Error:', error);
  process.exit(0);
}

run();
