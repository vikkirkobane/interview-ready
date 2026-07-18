const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGN2cWN4Z3ZkZ3Z4dmZraGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTk1MDMsImV4cCI6MjA5NzUzNTUwM30.DlX5eiLs0jnMRu0T89mKYWv_XjzBwwiqufJJyTr7XhM';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email address as a command line argument.');
    console.error('Example: node test-insert-auth.js your-email@domain.com');
    process.exit(1);
  }
  const { data: authData, error: authError } = await client.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: {
        first_name: 'Test',
        last_name: 'User'
      }
    }
  });

  if (authError) {
    console.error('Auth Error:', authError);
    process.exit(1);
  }

  const user = authData.user;
  console.log('Created user:', user.id);

  // Try to insert a resume with no template
  const { data: resume, error: insertError } = await client
    .from('resumes')
    .insert({
      user_id: user.id,
      title: 'AI Tailored Resume',
      is_base: false,
      status: 'DRAFT',
    })
    .select('id')
    .single();

  console.log('Insert Error:', insertError);
  console.log('Resume:', resume);
  process.exit(0);
}

run();
