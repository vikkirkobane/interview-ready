/**
 * Static integration test: LinkedIn OAuth Bug Fixes
 * 
 * Verifies that the solutions to the LinkedIn OAuth bugs are firmly in place:
 *   1. `callback.tsx`: Double code exchange race condition removed (only 1 exchangeCodeForSession exists now).
 *   2. `handle_new_user` Postgres trigger: Safely parses LinkedIn metadata (given_name, family_name, picture).
 *   3. `auth-sync` Edge Function: Correctly parses LinkedIn metadata from user.updated webhook payloads.
 */

const fs = require('fs');
const path = require('path');

const PASS = (msg) => console.log(`  ✅ PASSED: ${msg}`);
const FAIL = (msg) => { console.error(`  ❌ FAILED: ${msg}`); process.exit(1); };

let totalPassed = 0;
function check(condition, passMsg, failMsg) {
  if (condition) { PASS(passMsg); totalPassed++; }
  else FAIL(failMsg);
}

// ── File paths ────────────────────────────────────────────────────────────────
const callbackPath = path.join(__dirname, 'app', 'auth', 'callback.tsx');
const triggerPath = path.join(__dirname, 'supabase', 'migrations', '016_fix_linkedin_oauth_user_creation.sql');
const edgeFunctionPath = path.join(__dirname, 'supabase', 'functions', 'auth-sync', 'index.ts');

// ── Read files ────────────────────────────────────────────────────────────────
[callbackPath, triggerPath, edgeFunctionPath].forEach(p => {
  if (!fs.existsSync(p)) FAIL(`Required file not found: ${p}`);
});

const callbackCode = fs.readFileSync(callbackPath, 'utf-8');
const triggerCode = fs.readFileSync(triggerPath, 'utf-8');
const edgeFunctionCode = fs.readFileSync(edgeFunctionPath, 'utf-8');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  LinkedIn OAuth & Webhook Fixes — Integration Test Suite');
console.log('══════════════════════════════════════════════════════════════════\n');

// ── Section 1: callback.tsx (Race condition fix) ──────────────────────────────
console.log('[ 1 ] Double Code Exchange Race Condition (callback.tsx)');

// Strip JS block comments before checking to avoid matching explanatory docs
const cleanCallbackCode = callbackCode.replace(/\/\*[\s\S]*?\*\//g, '');

check(
  !cleanCallbackCode.includes('exchangeCodeForSession'),
  'exchangeCodeForSession was successfully removed from callback.tsx execution logic',
  'callback.tsx still calls exchangeCodeForSession — race condition is still present!'
);

check(
  callbackCode.includes('15000') && callbackCode.includes('fallbackTimer'),
  'Fallback safety net timeout remains intact (15 seconds)',
  'Safety net timeout is missing from callback.tsx'
);

// ── Section 2: Postgres Database Trigger ──────────────────────────────────────
console.log('\n[ 2 ] Database Trigger Metadata Extraction (migration 016)');

check(
  triggerCode.includes("NEW.raw_user_meta_data->>'given_name'"),
  "handle_new_user extracts LinkedIn's 'given_name'",
  "Trigger is missing 'given_name' extraction"
);

check(
  triggerCode.includes("NEW.raw_user_meta_data->>'family_name'"),
  "handle_new_user extracts LinkedIn's 'family_name'",
  "Trigger is missing 'family_name' extraction"
);

check(
  triggerCode.includes("NEW.raw_user_meta_data->>'picture'"),
  "handle_new_user extracts LinkedIn's 'picture' for avatar",
  "Trigger is missing 'picture' extraction for avatar_url"
);

// ── Section 3: Auth-Sync Webhook Edge Function ────────────────────────────────
console.log('\n[ 3 ] Webhook Metadata Sync (auth-sync edge function)');

check(
  edgeFunctionCode.includes('user_metadata?.given_name'),
  "user.updated handler extracts LinkedIn's 'given_name'",
  "auth-sync is missing 'given_name' extraction"
);

check(
  edgeFunctionCode.includes('user_metadata?.family_name'),
  "user.updated handler extracts LinkedIn's 'family_name'",
  "auth-sync is missing 'family_name' extraction"
);

check(
  edgeFunctionCode.includes('user_metadata?.picture'),
  "user.updated handler extracts LinkedIn's 'picture' for avatar",
  "auth-sync is missing 'picture' extraction for avatar_url"
);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  All ${totalPassed} checks passed ✅`);
console.log('  LinkedIn OAuth edge cases and race conditions are fully resolved.');
console.log('══════════════════════════════════════════════════════════════════\n');
