const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function cleanAllTemplateNewlines() {
  console.log('Fetching all templates from email_templates...');
  const { data: templates, error } = await supabase.from('email_templates').select('*');
  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  for (const t of templates) {
    let text = t.text_body || '';
    let changed = false;

    if (text.includes('\\n')) {
      text = text.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
      changed = true;
    }

    // Also sanitize any remaining emojis in subjects
    let subject = t.subject || '';
    const cleanSubject = subject.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim();
    if (cleanSubject !== subject) {
      subject = cleanSubject;
      changed = true;
    }

    if (changed) {
      const { error: uErr } = await supabase
        .from('email_templates')
        .update({
          text_body: text,
          subject: subject,
          updated_at: new Date().toISOString()
        })
        .eq('id', t.id);

      if (uErr) {
        console.error(`Failed to update ${t.template_key}:`, uErr);
      } else {
        console.log(`Updated text newlines for: ${t.template_key}`);
      }
    }
  }
  console.log('Finished cleaning all email templates.');
}

cleanAllTemplateNewlines().then(() => process.exit(0));
