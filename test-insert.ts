import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const serviceClient = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching a user...');
  const { data: users, error: userError } = await serviceClient.auth.admin.listUsers();
  if (userError || !users.users.length) {
    console.error('No users found', userError);
    return;
  }
  const user = users.users[0];
  console.log('User ID:', user.id);

  console.log('Inserting resume...');
  const { data: resume, error: createError } = await serviceClient
    .from('resumes')
    .insert({
      user_id: user.id,
      title: 'AI Tailored Resume',
      template_id: undefined,
      job_application_id: null,
      is_base: false,
      status: 'DRAFT',
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Insert failed:', createError);
  } else {
    console.log('Insert succeeded:', resume);
  }
  process.exit(0);
}

run();
