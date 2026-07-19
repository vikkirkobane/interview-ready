const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = env['EXPO_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = 'SUPABASE_SERVICE_ROLE_KEY_REDACTED';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTemplates() {
  const { data, error } = await supabase.from('resume_templates').select('*');
  if (error) console.error("Error fetching templates:", error);
  else console.log("Current templates in DB:", data);
}

checkTemplates();
