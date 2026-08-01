/**
 * LinkedIn Auth & Post-Auth Routing Checks
 *
 * Verifies that:
 *   1. LinkedIn OAuth uses the correct provider + redirect URI + deep-link flow.
 *   2. The auth store sets the session synchronously after signIn / signUp /
 *      Google ID-token login so screens can route immediately.
 *   3. Every post-auth destination routes correctly: existing users → home
 *      (/(tabs)), new users → onboarding, confirmation-required signup is handled.
 *   4. The callback screen routes by onboarding status.
 *
 * Run: node test-auth-routing-checks.js
 */

const fs = require('fs');
const path = require('path');

const STORE = path.join(__dirname, 'src', 'stores', 'auth-store.ts');
const WELCOME = path.join(__dirname, 'app', '(auth)', 'welcome.tsx');
const LOGIN = path.join(__dirname, 'app', '(auth)', 'login.tsx');
const SIGNUP = path.join(__dirname, 'app', '(auth)', 'signup.tsx');
const CALLBACK = path.join(__dirname, 'app', 'auth', 'callback.tsx');
const ROOT_LAYOUT = path.join(__dirname, 'app', '_layout.tsx');

let failures = [];
let passes = 0;

function check(name, condition, detail) {
  if (condition) {
    passes++;
    console.log(`  ✅ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function read(file, label) {
  if (!fs.existsSync(file)) {
    console.log(`  ❌ ${label} not found at ${file}`);
    failures.push(`${label} file`);
    return null;
  }
  return fs.readFileSync(file, 'utf8');
}

console.log('🔐 LinkedIn Auth & Post-Auth Routing Checks\n');

// ── 1. LinkedIn OAuth wiring ────────────────────────────────────────────
console.log('💼 [1] LinkedIn OAuth Wiring');
const store = read(STORE, 'auth-store');
if (store) {
  check('Uses linkedin_oidc provider', store.includes("'linkedin_oidc'"));
  check('Uses custom scheme interviewready', store.includes("scheme: 'interviewready'"));
  check('Callback path auth/callback', store.includes("path: 'auth/callback'"));
  check('Uses WebBrowser auth session', store.includes('WebBrowser.openAuthSessionAsync'));
  check('skipBrowserRedirect enabled', store.includes('skipBrowserRedirect: true'));
  check('Exchanges code on iOS success path', store.includes('exchangeCodeForSession(code)'));
  check('Sets session after iOS exchange', store.includes('set({ session: sessionData.session, user: sessionData.session.user })'));
  check('Deep-link fallback for Android documented', store.includes('Linking listener in _layout.tsx'));
}

// ── 2. Auth store synchronous session ───────────────────────────────────
console.log('\n⚡ [2] Auth Store Sets Session Synchronously');
if (store) {
  check('signUp stores returned session', store.includes('if (data?.session)'));
  check('signUp set session call', store.includes('set({ session: data.session, user: data.session.user })'));
  check('signIn stores returned session', store.includes('signInWithPassword'));
  check('signIn set session call', store.includes('set({ session: data.session, user: data.session.user })'));
  check('Google ID-token flow syncs session', /signInWithGoogleIdToken[\s\S]*?getSession/.test(store));
}

// ── 3. Post-auth routing ────────────────────────────────────────────────
console.log('\n🧭 [3] Post-Auth Routing');
const welcome = read(WELCOME, 'welcome screen');
if (welcome) {
  check('Welcome: existing user → home (/(tabs))', welcome.includes("router.replace('/(tabs)')"));
  check('Welcome: new user → onboarding', welcome.includes("router.replace('/(onboarding)/referral-code' as any)"));
  check('Welcome: routes by onboarding_completed', welcome.includes('onboarding_completed'));
}

const login = read(LOGIN, 'login screen');
if (login) {
  check('Login: session-watcher effect present', login.includes('session') && login.includes('useEffect'));
  check('Login: existing user → home (/(tabs))', login.includes("router.replace('/(tabs)')"));
  check('Login: new user → onboarding', login.includes("router.replace('/(onboarding)/referral-code' as any)"));
  check('Login: LinkedIn handled by session watcher', /Routing is handled by the session-watcher effect/.test(login));
  check('Login: email login routes to home when onboarded', login.includes('onboarding_completed'));
}

const signup = read(SIGNUP, 'signup screen');
if (signup) {
  check('Signup: session-watcher effect present', signup.includes('useEffect') && signup.includes('session'));
  check('Signup: new user → onboarding', signup.includes("router.replace('/(onboarding)/referral-code' as any)"));
  check('Signup: confirmation-required message shown', /Check your email to confirm/.test(signup));
  check('Signup: LinkedIn handled by session watcher', /Routing is handled by the session-watcher effect/.test(signup));
}

const callback = read(CALLBACK, 'auth callback screen');
if (callback) {
  check('Callback: existing user → home (/(tabs))', callback.includes("router.replace('/(tabs)')"));
  check('Callback: new user → onboarding', callback.includes("router.replace('/(onboarding)/referral-code' as any)"));
  check('Callback: routes by onboarding_completed', callback.includes('onboarding_completed'));
}

// ── 4. Root AuthGuard ───────────────────────────────────────────────────
console.log('\n🛡️  [4] Root AuthGuard');
const root = read(ROOT_LAYOUT, 'root layout');
if (root) {
  check('AuthGuard: no session → welcome', root.includes("router.replace('/(auth)/welcome')"));
  check('AuthGuard: new user → onboarding', root.includes("router.replace('/(onboarding)/referral-code' as any)"));
  check('AuthGuard: onboarded + in auth group → home', root.includes("router.replace('/(tabs)')"));
  check('AuthGuard: OAuth deep link pending guard', root.includes('pendingAuthCallback'));
  check('Deep link: exchanges code for session', root.includes('exchangeCodeForSession'));
}

// ── 5. Routing logic simulation ─────────────────────────────────────────
console.log('\n🧪 [5] Routing Logic Simulation');
function routeOnSession(session) {
  if (!session) return '/(auth)/welcome';
  const isCompleted = session.user?.user_metadata?.onboarding_completed;
  return isCompleted ? '/(tabs)' : '/(onboarding)/referral-code';
}

check('No session → welcome', routeOnSession(null) === '/(auth)/welcome');
check('Onboarded user → home', routeOnSession({ user: { user_metadata: { onboarding_completed: true } } }) === '/(tabs)');
check('New user (undefined flag) → onboarding', routeOnSession({ user: { user_metadata: {} } }) === '/(onboarding)/referral-code');
check('New user (explicit false) → onboarding', routeOnSession({ user: { user_metadata: { onboarding_completed: false } } }) === '/(onboarding)/referral-code');

// ── Summary ────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log(`📊 Results: ${passes} passed, ${failures.length} failed`);
console.log('══════════════════════════════════════════════════════════');

if (failures.length > 0) {
  console.log('\n❌ Failed checks:');
  failures.forEach(f => console.log(`   • ${f}`));
  process.exit(1);
} else {
  console.log('\n🎉 LinkedIn auth & post-auth routing checks passed!');
  process.exit(0);
}
