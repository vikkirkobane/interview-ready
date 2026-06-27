const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkConnection() {
  console.log(`Connecting to: ${url}`);
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error("Connection failed or table doesn't exist:", error.message);
      process.exit(1);
    }
    
    console.log("Connection successful! Table 'users' exists and is responding.");
    console.log("Data returned (should be empty due to RLS):", data);
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

checkConnection();
