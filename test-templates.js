const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env file manually
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = env['EXPO_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTemplates() {
  console.log('--- Testing Template ID Resolution ---');
  
  const testSlugs = ['executive', 'minimal', 'tech-stack', 'academic', 'invalid-slug', undefined];
  
  for (const templateId of testSlugs) {
    console.log(`\nTesting input.template_id = ${templateId ? `"${templateId}"` : 'undefined'}`);
    
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(templateId || '');
    
    let finalTemplateId = templateId;
    
    if (!templateId || !isUuid) {
      const slugToQuery = templateId && !isUuid ? templateId : 'executive';
      
      const { data: defaultTemplate, error } = await supabase
        .from('resume_templates')
        .select('id')
        .eq('slug', slugToQuery)
        .eq('is_active', true)
        .single();
      
      if (error) {
         console.error(`❌ DB Lookup Failed for slug "${slugToQuery}":`, error.message);
      } else {
         finalTemplateId = defaultTemplate?.id;
         console.log(`✅ DB Lookup Success! Slug "${slugToQuery}" resolved to UUID: ${finalTemplateId}`);
      }
    } else {
      console.log(`✅ Passed directly as valid UUID: ${finalTemplateId}`);
    }
    
    // Simulate what the DB insert receives
    if (!finalTemplateId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(finalTemplateId)) {
        console.error(`🚨 ALERT: finalTemplateId is STILL NOT A VALID UUID! DB Insert will fail! (Value: ${finalTemplateId})`);
    } else {
        console.log(`🎯 DB Insert Ready: The template_id column will safely accept "${finalTemplateId}"`);
    }
  }
}

testTemplates();
