const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Environment Variables from .env
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
const RESEND_KEY = process.env.RESEND_API_KEY;

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runUserStoryLiveAudit() {
  console.log('====================================================');
  console.log('  STARTING LIVE USER STORY & EMAIL SYSTEM AUDIT     ');
  console.log('====================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  function assert(condition, message) {
    totalChecks++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedChecks++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // CHECK 1: Email Templates Integrity & Anti-Spam Hygiene
  console.log('\n--- 1. Auditing DB Email Templates (No Spam Triggers) ---');
  const { data: templates, error: tErr } = await supabase
    .from('email_templates')
    .select('template_key, subject, text_body, is_active')
    .eq('is_active', true);

  assert(!tErr && templates && templates.length > 0, 'Email templates queried successfully');

  const bannedEmojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const bannedKeywords = ['free ai credits', 'vip waitlist', 'check your spam folder', 'queue position'];

  for (const t of templates || []) {
    const hasEmoji = bannedEmojiRegex.test(t.subject);
    const subjectLower = t.subject.toLowerCase();
    const textLower = (t.text_body || '').toLowerCase();
    
    assert(!hasEmoji, `Template [${t.template_key}] subject has NO emojis: "${t.subject}"`);
    
    let keywordFound = null;
    for (const kw of bannedKeywords) {
      if (subjectLower.includes(kw) || textLower.includes(kw)) {
        keywordFound = kw;
        break;
      }
    }
    assert(!keywordFound, `Template [${t.template_key}] contains NO spam buzzwords (Checked: "${keywordFound || 'None'}")`);

    // Verify text_body has NO literal double-escaped \\n
    const hasLiteralDoubleEscape = (t.text_body || '').includes('\\n');
    assert(!hasLiteralDoubleEscape, `Template [${t.template_key}] plain text uses genuine CRLF newlines (No literal \\n)`);
  }

  // CHECK 2: Promo Code LINKEDIN20 in Database
  console.log('\n--- 2. Checking Promo Code & Credit Balance System ---');
  const { data: promoCode, error: pErr } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', 'LINKEDIN20')
    .single();

  assert(!pErr && promoCode, 'Promo code LINKEDIN20 exists and is active');
  if (promoCode) {
    const credits = promoCode.credits_granted ?? promoCode.credits;
    assert(credits === 20, `LINKEDIN20 grants 20 credits (Found: ${credits})`);
    assert(promoCode.is_active === true, 'LINKEDIN20 is currently active for onboarding users');
  }

  // CHECK 3: Resume Generation Storage & Snapshots Configuration
  console.log('\n--- 3. Auditing Resume Generation & Storage Bucket ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  assert(!bErr && buckets, 'Storage service accessible');
  
  const snapshotBucket = buckets?.find(b => b.name === 'resume-snapshots' || b.name === 'resumes' || b.name === 'interview-ready-files');
  assert(!!snapshotBucket, `Resume storage bucket exists (Found: ${snapshotBucket?.name})`);

  // CHECK 4: Resume & Content Schema Verification
  const { data: resumeSample, error: rErr } = await supabase
    .from('resumes')
    .select('id, template_id, ats_score, created_at')
    .limit(1);

  assert(!rErr && resumeSample, 'resumes schema supports template selection, ATS scoring, and tracking');

  const { data: contentSample, error: cErr } = await supabase
    .from('resume_contents')
    .select('id, resume_id, name, title, contact, summary, experience, skills')
    .limit(1);

  assert(!cErr && contentSample, 'resume_contents schema supports full structured ATS resume content');

  // CHECK 5: Live Email Delivery & Deliverability Check
  console.log('\n--- 4. Live Deliverability Test to Approved Test Address ---');
  const testRecipient = 'victorchogo37@gmail.com';
  
  if (RESEND_KEY) {
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Interview Ready <welcome@noreply.appinterviewready.top>',
          to: [testRecipient],
          subject: 'Interview Ready Deliverability & User Story Test',
          html: '<p>This is an automated user story verification test confirming 100% deliverability.</p>',
          text: 'This is an automated user story verification test confirming 100% deliverability.',
          reply_to: 'info@appinterviewready.top',
        }),
      });

      const resData = await resendResponse.json();
      assert(resendResponse.ok && resData?.id, `Resend direct API dispatch succeeded (ID: ${resData?.id})`);
    } catch (e) {
      assert(false, `Resend dispatch error: ${e.message}`);
    }
  } else {
    console.log('[SKIP] RESEND_API_KEY not configured in environment.');
  }

  console.log('\n====================================================');
  console.log(`  AUDIT COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED `);
  console.log('====================================================\n');

  if (passedChecks === totalChecks) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runUserStoryLiveAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
