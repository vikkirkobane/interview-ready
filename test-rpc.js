import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const user1Email = 'victorchoogo37@gmail.com';
const password = 'password123';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: u1Data, error: u1Error } = await supabase.auth.signInWithPassword({
    email: user1Email,
    password
  });
  if (u1Error) throw u1Error;

  const { data, error } = await supabase.rpc('get_referral_stats', {
    p_user_id: u1Data.session.user.id
  });
  console.log('RPC result:', data);
  if (error) console.error('RPC error:', error);
}

run().catch(console.error);
