import { config } from 'dotenv';
import { sendWelcomeEmail, isValidRecipientEmail } from '../api/_lib/spaceship.ts';

// One-time backfill: send the welcome email to every Airtable record already
// marked Status='Downloaded' that has no Welcome Sent flag yet.
//
// Usage:
//   npx tsx scripts/welcome-backfill.ts            # dry-run: lists recipients, sends nothing
//   npx tsx scripts/welcome-backfill.ts --send     # real send (marks each record after success)
//   npx tsx scripts/welcome-backfill.ts --send --limit 2   # test on the first 2 only
//   npx tsx scripts/welcome-backfill.ts --send --delay 2000
//   npx tsx scripts/welcome-backfill.ts --env-file .env.production

interface AirtableRecord {
  id: string;
  fields?: Record<string, unknown>;
}

const args = process.argv.slice(2);
const envIdx = args.indexOf('--env-file');
// Shell-exported variables always win over file values (no override).
config({ path: envIdx !== -1 ? args[envIdx + 1] : '.env', override: false });
const DO_SEND = args.includes('--send');
const flagValue = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};
// CLI overrides beat env vars; Airtable accepts table IDs (tbl...) or names.
const BASE_OVERRIDE = flagValue('--base-id');
const TABLE_OVERRIDE = flagValue('--table-id');
const LIMIT = (() => { const v = flagValue('--limit'); return v ? parseInt(v, 10) : 0; })();
const DELAY_MS = (() => { const v = flagValue('--delay'); return v ? parseInt(v, 10) : 1500; })();

function envClean(name: string): string {
  return (process.env[name] || '').trim().replace(/['"]/g, '');
}

async function fetchDownloadedRecords(apiKey: string, baseId: string, tableName: string): Promise<AirtableRecord[]> {
  // Status-only formula: the 'Welcome Sent' field may not exist yet on first
  // run (Airtable rejects formulas referencing unknown fields). Un-welcomed
  // records are filtered client-side below.
  const formula = `{Status}='Downloaded'`;
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('filterByFormula', formula);
    url.searchParams.set('sort[0][field]', 'Submitted At');
    url.searchParams.set('sort[0][direction]', 'asc');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Airtable list failed (${res.status}): ${JSON.stringify(err)}`);
    }
    const data: any = await res.json();
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records.filter(r => !r.fields?.['Welcome Sent']);
}

async function markWelcomeSent(apiKey: string, baseId: string, tableName: string, recordId: string): Promise<boolean> {
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: { 'Welcome Sent': true }, typecast: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`   [FLAG FAILED] ${recordId} (${res.status}): ${JSON.stringify(err)}`);
    return false;
  }
  return true;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const apiKey = envClean('AIRTABLE_API_KEY') || envClean('AIRTABLE_PAT');
  const baseId = BASE_OVERRIDE || envClean('AIRTABLE_BASE_ID');
  const tableName = TABLE_OVERRIDE || envClean('AIRTABLE_TABLE_NAME') || 'Submissions';

  if (!apiKey || !baseId) {
    console.error('Missing AIRTABLE_API_KEY / AIRTABLE_BASE_ID in .env — aborting.');
    process.exit(1);
  }

  console.log(`Querying Airtable base ${baseId} table "${tableName}" for Status='Downloaded' without Welcome Sent...`);
  const records = await fetchDownloadedRecords(apiKey, baseId, tableName);
  const batch = LIMIT > 0 ? records.slice(0, LIMIT) : records;

  const valid = batch.filter(r => isValidRecipientEmail(String(r.fields?.['Email'] ?? '')));
  const invalid = batch.length - valid.length;

  console.log('');
  console.log(`Found ${records.length} record(s) to welcome${LIMIT > 0 ? `, processing first ${batch.length}` : ''}.`);
  console.log(`  Valid recipients:   ${valid.length}`);
  console.log(`  Invalid/missing:    ${invalid}`);
  console.log('');

  if (!DO_SEND) {
    console.log('DRY RUN — no emails will be sent. Recipients:');
    for (const r of batch) {
      const email = String(r.fields?.['Email'] ?? '(no email)');
      const spot = r.fields?.['Waitlist Spot'];
      const ok = isValidRecipientEmail(email);
      console.log(`  ${ok ? 'OK ' : 'BAD'} ${email.padEnd(34)} spot=${spot ?? '-'}`);
    }
    console.log('');
    console.log('Re-run with --send to deliver. Add --limit N to trial a small batch first.');
    return;
  }

  console.log(`SEND MODE — delivering to ${valid.length} recipient(s), ${DELAY_MS}ms pacing.`);
  let sent = 0;
  let failed = 0;
  let flagged = 0;

  for (const [i, r] of valid.entries()) {
    const email = String(r.fields['Email']);
    const spot = r.fields?.['Waitlist Spot'] as number | string | undefined;
    process.stdout.write(`[${i + 1}/${valid.length}] ${email} ... `);

    const result = await sendWelcomeEmail(email, spot);
    if (!result.sent) {
      failed++;
      console.log(`FAILED (${result.error})`);
      continue;
    }
    sent++;
    const okFlag = await markWelcomeSent(apiKey, baseId, tableName, r.id);
    if (okFlag) flagged++;
    console.log(okFlag ? 'sent + flagged' : 'sent (flag write failed - may resend on re-run)');
    if (i < valid.length - 1) await sleep(DELAY_MS);
  }

  console.log('');
  console.log(`Done. sent=${sent} failed=${failed} flagged=${flagged}, skipped=${invalid} invalid.`);
  if (failed > 0) process.exit(2);
}

main().catch(err => {
  console.error('Backfill aborted:', err?.message || err);
  process.exit(1);
});
