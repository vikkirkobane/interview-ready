const fs = require('fs');
const path = require('path');

// 1. Load .env
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

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'app5axaWoe4MblFFS';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

console.log('Airtable Key present:', !!AIRTABLE_API_KEY);
console.log('Airtable Base ID:', AIRTABLE_BASE_ID);
console.log('Resend Key present:', !!RESEND_API_KEY);

async function inspectAirtable() {
  if (!AIRTABLE_API_KEY) {
    console.error('No AIRTABLE_API_KEY found in .env');
    return;
  }

  // Check tables: Try common table names: "Email Subscribers", "Submissions", "tbl0y0reK4q7PvA1t"
  const candidateTables = ['Email Subscribers', 'Submissions', 'tbl0y0reK4q7PvA1t', 'Waitlist', 'Users'];
  
  for (const table of candidateTables) {
    try {
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}?maxRecords=10`, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`\n=== Found table: "${table}" (${data.records?.length || 0} records sample) ===`);
        if (data.records && data.records.length > 0) {
          console.log('Fields on first record:', Object.keys(data.records[0].fields));
          console.log('Sample record fields:', JSON.stringify(data.records.slice(0, 3).map(r => r.fields), null, 2));
        }
      } else {
        const errText = await res.text();
        console.log(`Table "${table}" returned status ${res.status}`);
      }
    } catch (e) {
      console.log(`Error checking table "${table}":`, e.message);
    }
  }
}

inspectAirtable();
