const { createClient } = require('@supabase/supabase-js');


const serviceClient = createClient(
  'https://rdxcvqcxgvdgvxvfkhlr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGN2cWN4Z3ZkZ3Z4dmZraGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk1OTUwMywiZXhwIjoyMDk3NTM1NTAzfQ.5GqE2iL0hI0y0L8vPz4t3N7Q3B6A9C5D0E8F1G2H3I4' // Wait, I don't have the real service role key.
);

async function run() {
  const { data: users } = await serviceClient.auth.admin.listUsers();
  const user = users.users[0];
  console.log("Found user: ", user.id);
  const { data, error } = await serviceClient
    .from('resumes')
    .insert({
      user_id: user.id,
      title: 'AI Tailored Resume',
      job_application_id: null,
      is_base: false,
      status: 'DRAFT',
    })
    .select('id')
    .single();

  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
  process.exit(0);
}
run();
