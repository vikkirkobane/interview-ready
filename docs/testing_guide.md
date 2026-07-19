# Interview Ready V2: Backend Integration Testing Guide

This guide formalises the testing approach we use to validate backend logic, Edge Functions, Auth workflows, and database triggers without relying solely on the React Native frontend. 

By writing isolated Node.js scripts, we can simulate exact frontend payloads and strictly test the Supabase backend in a clean, reproducible manner.

---

## 1. Environment & Setup

Testing directly against your Supabase instance requires loading your `.env` variables into a local Node.js context. 

### Best Practice for Environment Variables
Instead of relying on third-party libraries like `dotenv`, use native Node.js features (Node v20+) or a simple manual parser to ingest `EXPO_PUBLIC_` variables.

**Run scripts using Node's built-in env flag:**
```bash
node --env-file=.env test-script.cjs
```

**Alternative (Manual Fallback within the script):**
```javascript
const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) env[key.trim()] = values.join('=').trim();
});

const SUPABASE_URL = env['EXPO_PUBLIC_SUPABASE_URL'];
const SUPABASE_ANON_KEY = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
```

> [!TIP]
> Always use `.cjs` extensions or pure CommonJS for test scripts to avoid ES Module resolution errors with local React Native packages.

---

## 2. Setting Up Test Clients

You need two distinct Supabase clients to conduct proper integration tests:
1. **Anon Client**: Simulates the mobile app environment and restricted RLS policies.
2. **Admin Client**: Uses the `Service Role Key` to bypass RLS, create fake users quickly, verify database side-effects, and perform teardowns.

```javascript
const { createClient } = require('@supabase/supabase-js');

// 1. Simulates the user's app
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Simulates backend/admin overrides
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

---

## 3. The Test User Lifecycle (Critical)

Testing workflows like Onboarding, Profiles, and Edge Functions requires an authenticated user. 

### DO NOT use `supabase.auth.signUp` directly in scripts
In a local Node environment, raw `signUp` calls often fail or trigger empty JSON responses due to rate limits or missing SMTP configurations. 

### ALWAYS use Admin User Creation
Create the user via `adminSupabase`, then sign them in with the `anon` client to grab their session token.

```javascript
// 1. Create the user instantly with auto-confirmation
const { data: adminUser } = await adminSupabase.auth.admin.createUser({
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  email_confirm: true // Bypasses email verification requirements
});

const userId = adminUser.user.id;

// 2. Sign in to get the JWT Access Token
const { data: authData } = await supabase.auth.signInWithPassword({
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!'
});

const sessionToken = authData.session.access_token;
```

---

## 4. Testing Edge Functions

Once you have the `sessionToken`, you can test any Edge Function exactly as the React Native app would via `fetch`.

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/your-edge-function`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`, // Auth validation
  },
  body: JSON.stringify({ 
    // ... exact payload expected by the frontend
  }),
});

const result = await response.json();
if (!response.ok) {
  console.error("❌ Edge Function Failed:", result);
} else {
  console.log("✅ Edge Function Succeeded:", result);
}
```

> [!IMPORTANT]
> If testing logic requires AI credits (e.g., `linkedin-analyze` or `profile-parse-resume`), always use the `adminSupabase` client to upsert fake credits into the `user_credits` table *before* calling the Edge Function.

---

## 5. Verifying Database Side-Effects

Never assume a function worked just because it returned a `200 OK`. You must query the database to verify that triggers, aggregations, or inserts fired correctly.

**Example: Verifying Profile Completeness Trigger**
```javascript
// The user updated their summary via edge function...

// Let's verify the postgres trigger actually re-calculated their completeness!
const { data: profile } = await adminSupabase
  .from('user_profiles')
  .select('profile_completeness')
  .eq('user_id', userId)
  .single();

console.log("Profile completeness is now:", profile.profile_completeness);
```

---

## 6. Teardown and Cleanup

Every test script should leave the database exactly as it found it to prevent bloat and collisions on subsequent runs.

```javascript
// Run inside a try/finally block at the end of the script
console.log("\n--- Cleaning up ---");
try {
  await adminSupabase.auth.admin.deleteUser(userId);
  console.log("✅ Test user deleted cleanly.");
} catch (e) {
  console.log("⚠️ Could not delete user.");
}
```

---

## 7. Manual Frontend Verification

Automated backend scripts prove the logic works, but UI bugs can still hide. After a script succeeds, always conduct a manual "Sanity Check" on the UI:

1. Look for **Missing Loaders** (does the screen freeze while waiting?).
2. Verify **Error Toasts** (if you input bad data, does the UI show a red toast?).
3. Check **Data Re-fetching** (after saving, does the screen update immediately or require a hard refresh?).
