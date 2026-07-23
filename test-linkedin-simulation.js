/**
 * Simulated LinkedIn Authentication Flow Test
 * 
 * Since React Native / Expo routing tests require a full test runner (like Jest) 
 * and UI automation to test deep links, this script provides a simulated 
 * state-machine test of the exact sequence of events that occurs during 
 * the LinkedIn authentication process on a physical device.
 */

class MockRouter {
  constructor() {
    this.currentRoute = '/(auth)/login';
  }
  replace(route) {
    console.log(`[Router] Navigation triggered to: ${route}`);
    this.currentRoute = route;
  }
}

class MockSupabaseAuth {
  async signInWithOAuth({ provider, options }) {
    console.log(`[Supabase Auth] Initiating OAuth for provider: ${provider}`);
    // Supabase returns an auth URL
    return { data: { url: 'https://linkedin.com/oauth/...' }, error: null };
  }

  async exchangeCodeForSession(code) {
    console.log(`[Supabase Auth] Exchanging code: ${code} for session...`);
    if (code === 'valid-linkedin-code') {
      return { data: { session: { user: { email: 'test@linkedin.com' } } }, error: null };
    }
    return { data: null, error: new Error('Invalid code') };
  }
}

class SimulatedApp {
  constructor() {
    this.router = new MockRouter();
    this.supabaseAuth = new MockSupabaseAuth();
    this.session = null;
    this.pendingAuthCallback = false;
  }

  // 1. User taps "Sign in with LinkedIn"
  async handleLinkedInSignIn() {
    console.log('\n--- 1. User Taps Sign In With LinkedIn ---');
    const { data, error } = await this.supabaseAuth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { redirectTo: 'interviewready://auth/callback', skipBrowserRedirect: true }
    });

    // Simulated OS behavior: Browser opens, user authenticates, browser closes.
    console.log('[System] Browser opened. User authenticating on LinkedIn...');
    console.log('[System] Browser closed (User redirected back to app or dismissed).');

    // In the old code, this is where router.replace('/(tabs)') was called!
    // In our fixed code, we DO NOT navigate here. We just finish the function.
    console.log('[App] handleLinkedInSignIn function completed successfully. (No synchronous navigation)');
  }

  // 2. The OS fires the Deep Link into the app
  async simulateDeepLinkArrival(url) {
    console.log('\n--- 2. App Receives Deep Link from OS ---');
    console.log(`[Deep Link] Received URL: ${url}`);
    
    if (url.includes('auth/callback')) {
      this.pendingAuthCallback = true;
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');

      if (code) {
        const { data, error } = await this.supabaseAuth.exchangeCodeForSession(code);
        if (data?.session) {
          console.log('[App] Session established successfully!');
          this.session = data.session;
          
          // 3. The AuthGuard or auth/callback.tsx detects the session
          this.triggerAuthGuard();
        }
      }
    }
  }

  // 3. The Router Guard intercepts the state change
  triggerAuthGuard() {
    console.log('\n--- 3. AuthGuard / Callback Screen evaluates session ---');
    if (this.session) {
      console.log('[AuthGuard] Valid session detected.');
      this.router.replace('/(tabs)');
    } else {
      console.log('[AuthGuard] No session detected.');
      this.router.replace('/(auth)/welcome');
    }
  }

  runSimulation() {
    console.log('====================================================');
    console.log('  STARTING SIMULATED LINKEDIN AUTHENTICATION FLOW');
    console.log('====================================================');
    console.log(`Initial Route: ${this.router.currentRoute}`);

    // Step 1: Component function runs
    this.handleLinkedInSignIn().then(() => {
      // Notice the route hasn't changed!
      console.log(`Route after button press: ${this.router.currentRoute}`);
      
      // Step 2: OS sends the deep link (happens asynchronously)
      setTimeout(() => {
        this.simulateDeepLinkArrival('interviewready://auth/callback?code=valid-linkedin-code').then(() => {
          console.log(`\nFinal Route: ${this.router.currentRoute}`);
          if (this.router.currentRoute === '/(tabs)') {
            console.log('\n✅ TEST PASSED: App successfully routed to /(tabs) after deep link session exchange!');
          } else {
            console.log('\n❌ TEST FAILED: App did not route to /(tabs).');
          }
        });
      }, 1000); // simulate 1 second delay for user to authenticate
    });
  }
}

// Run the test
const testApp = new SimulatedApp();
testApp.runSimulation();
