/**
 * auth-store.oauth-race.test.ts
 *
 * Verifies that the pendingOAuthCallback flag in the auth store correctly
 * blocks AuthGuard from redirecting to the welcome screen during the
 * LinkedIn (and any OAuth) code-exchange flow.
 *
 * These are pure unit tests — no React Native renderer needed.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Holds the onAuthStateChange listener callback so tests can fire auth events
// through the REAL store handler (specific to the Fix 2 behavior under test).
let authStateListener: ((event: string, session: any) => void) | null = null;

// Mock Supabase so we control what getSession / onAuthStateChange / exchangeCodeForSession return
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn((callback) => {
        authStateListener = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      }),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      linkIdentity: jest.fn(),
      unlinkIdentity: jest.fn(),
      getUserIdentities: jest.fn(),
    },
  },
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'interviewready://auth/callback'),
}));

// Mock every store that auth-store imports (avoids transitive dep issues)
jest.mock('../src/lib/social-auth', () => ({
  signInWithGoogle: jest.fn(),
  initializeGoogleSignIn: jest.fn(),
  signOutFromGoogle: jest.fn(),
}));

jest.mock('../src/stores/profile-store', () => ({
  useProfileStore: { getState: () => ({ clearProfile: jest.fn() }) },
}));
jest.mock('../src/stores/onboarding-store', () => ({
  useOnboardingStore: { getState: () => ({ resetOnboarding: jest.fn() }) },
}));
jest.mock('../src/stores/resume-store', () => ({
  useResumeStore: { getState: () => ({ reset: jest.fn() }) },
}));
jest.mock('../src/stores/dashboard-store', () => ({
  useDashboardStore: { getState: () => ({ reset: jest.fn() }) },
}));
jest.mock('../src/stores/notification-store', () => ({
  useNotificationStore: { getState: () => ({ reset: jest.fn(), addNotification: jest.fn() }) },
}));
jest.mock('../src/store/previewStore', () => ({
  usePreviewStore: { getState: () => ({ clearPreview: jest.fn() }) },
}));
jest.mock('../src/lib/query-client', () => ({
  queryClient: { clear: jest.fn() },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { useAuthStore } from '../src/stores/auth-store';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../src/lib/supabase';

// Convenience typed references
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;
const mockSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;
const mockExchangeCode = supabase.auth.exchangeCodeForSession as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Reset the store to its initial state between tests */
function resetStore() {
  useAuthStore.setState({
    session: null,
    user: null,
    loading: false,
    initialized: true,
    pendingOAuthCallback: false,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthStore — pendingOAuthCallback race condition fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateListener = null;
    resetStore();
  });

  // ── 1. Flag is set BEFORE the browser opens ──────────────────────────────

  it('sets pendingOAuthCallback=true before openAuthSessionAsync is called', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.linkedin.com/oauth/...' },
      error: null,
    });

    // Capture the flag value at the moment the browser opens
    let flagWhenBrowserOpened: boolean | undefined;
    mockOpenAuthSession.mockImplementation(async () => {
      flagWhenBrowserOpened = useAuthStore.getState().pendingOAuthCallback;
      // Simulate Android: browser closes, returns 'dismiss'
      return { type: 'dismiss' };
    });

    await useAuthStore.getState().signInWithOAuth('linkedin_oidc');

    expect(flagWhenBrowserOpened).toBe(true);
  });

  // ── 2. Android path: flag stays true until deep link handler clears it ───

  it('leaves pendingOAuthCallback=true after Android dismiss (deep link still pending)', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.linkedin.com/oauth/...' },
      error: null,
    });
    // Android: openAuthSessionAsync returns 'dismiss' (no URL, no code)
    mockOpenAuthSession.mockResolvedValue({ type: 'dismiss' });

    await useAuthStore.getState().signInWithOAuth('linkedin_oidc');

    // After signInWithOAuth returns on Android, the flag must STILL be true
    // because the deep link handler in _layout.tsx hasn't run yet —
    // that handler is responsible for clearing it once code exchange completes.
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(true);
  });

  // ── 3. Deep link handler clears the flag after successful exchange ────────

  it('setPendingOAuthCallback(false) clears the flag (simulating _layout.tsx deep link handler)', async () => {
    useAuthStore.setState({ pendingOAuthCallback: true });

    // Simulate _layout.tsx completing the code exchange
    useAuthStore.getState().setPendingOAuthCallback(false);

    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  // ── 4. iOS path: flag is cleared after successful in-place exchange ───────

  it('clears pendingOAuthCallback after successful iOS code exchange', async () => {
    const fakeSession = { user: { id: 'user-1', user_metadata: { onboarding_completed: true } }, access_token: 'tok' };

    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.linkedin.com/oauth/...' },
      error: null,
    });
    // iOS: openAuthSessionAsync returns the full callback URL
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'interviewready://auth/callback?code=abc123',
    });
    mockExchangeCode.mockResolvedValue({
      data: { session: fakeSession },
      error: null,
    });

    await useAuthStore.getState().signInWithOAuth('linkedin_oidc');

    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
    expect(useAuthStore.getState().session).toEqual(fakeSession);
  });

  // ── 5. Flag cleared on cancel ─────────────────────────────────────────────

  it('clears pendingOAuthCallback when user cancels the browser', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.linkedin.com/oauth/...' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });

    const result = await useAuthStore.getState().signInWithOAuth('linkedin_oidc');

    expect(result.error).toBe('Sign-in was cancelled. Please try again.');
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  // ── 6. Flag cleared when Supabase returns no URL ──────────────────────────

  it('clears pendingOAuthCallback when Supabase returns no URL', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });

    const result = await useAuthStore.getState().signInWithOAuth('linkedin_oidc');

    expect(result.error).toBe('Unable to start sign-in. Please try again.');
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  // ── 7. Flag cleared when Supabase itself errors ───────────────────────────

  it('clears pendingOAuthCallback when Supabase signInWithOAuth errors', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'Provider not configured' },
    });

    const result = await useAuthStore.getState().signInWithOAuth('linkedin_oidc');

    expect(result.error).toBe('Provider not configured');
    // Flag was never set because we errored before the browser opened
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  // ── 8. AuthGuard simulation: no redirect while flag is true ──────────────

  it('AuthGuard should NOT redirect when pendingOAuthCallback is true and session is null', () => {
    useAuthStore.setState({
      session: null,
      initialized: true,
      pendingOAuthCallback: true,
    });

    const { session, initialized, pendingOAuthCallback } = useAuthStore.getState();

    // Replicate the AuthGuard decision logic from _layout.tsx
    const shouldRedirectToWelcome =
      initialized && !session && !pendingOAuthCallback;

    expect(shouldRedirectToWelcome).toBe(false);
  });

  // ── 9. AuthGuard simulation: redirect AFTER flag is cleared and still no session ──

  it('AuthGuard SHOULD redirect to welcome after flag is cleared with no session', () => {
    useAuthStore.setState({
      session: null,
      initialized: true,
      pendingOAuthCallback: false,
    });

    const { session, initialized, pendingOAuthCallback } = useAuthStore.getState();

    const shouldRedirectToWelcome =
      initialized && !session && !pendingOAuthCallback;

    expect(shouldRedirectToWelcome).toBe(true);
  });

  // ── 10. Fix 2: onAuthStateChange clears the flag on SIGNED_IN ─────────────

  it('clears pendingOAuthCallback when onAuthStateChange fires SIGNED_IN with a session', async () => {
    useAuthStore.setState({ pendingOAuthCallback: true });
    await useAuthStore.getState().initialize();

    const session = { user: { id: 'u1' }, access_token: 'at' } as any;
    authStateListener!('SIGNED_IN', session);

    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
    expect(useAuthStore.getState().session).toEqual(session);
  });

  // ── 11. Fix 2: onAuthStateChange clears the flag on TOKEN_REFRESHED ──────

  it('clears pendingOAuthCallback when onAuthStateChange fires TOKEN_REFRESHED with a session', async () => {
    useAuthStore.setState({ pendingOAuthCallback: true });
    await useAuthStore.getState().initialize();

    const session = { user: { id: 'u1' }, access_token: 'at' } as any;
    authStateListener!('TOKEN_REFRESHED', session);

    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  // ── 12. Fix 2: SIGNED_IN without a session must NOT clear the flag ──────

  it('does NOT clear pendingOAuthCallback when SIGNED_IN arrives without a session', async () => {
    useAuthStore.setState({ pendingOAuthCallback: true });
    await useAuthStore.getState().initialize();

    // Edge case: event fires but no session yet → flag must stay true so
    // AuthGuard remains blocked while the callback is still being processed.
    authStateListener!('SIGNED_IN', null);

    expect(useAuthStore.getState().pendingOAuthCallback).toBe(true);
  });

  // ── 13. Fix 1: cold-start auth/callback URL sets the flag BEFORE initialize ──

  it('sets pendingOAuthCallback=true when the cold-start URL is an auth callback (race prevention)', () => {
    useAuthStore.setState({ pendingOAuthCallback: false });

    // Replicate the pre-initialize gate from _layout.tsx: getInitialURL() returns
    // an auth/callback URL on Android cold-start. The flag must be set so that
    // when initialize() later unblocks AuthGuard, it never sees an unprotected null.
    const initialUrl = 'interviewready://auth/callback?code=PKCE_CODE';
    if (initialUrl && initialUrl.includes('auth/callback')) {
      useAuthStore.getState().setPendingOAuthCallback(true);
    }

    expect(useAuthStore.getState().pendingOAuthCallback).toBe(true);
  });

  // ── 14. Fix 1: a non-auth URL must NOT set the flag ──────────────────────

  it('does NOT set pendingOAuthCallback when the cold-start URL is not an auth callback', () => {
    useAuthStore.setState({ pendingOAuthCallback: false });

    const initialUrl = 'interviewready://referral?code=ABC123';
    if (initialUrl && initialUrl.includes('auth/callback')) {
      useAuthStore.getState().setPendingOAuthCallback(true);
    }

    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  // ── 15. setSession works correctly ───────────────────────────────────────

  it('setSession populates both session and user fields', () => {
    const fakeSession = {
      user: { id: 'u1', user_metadata: {} },
      access_token: 'at',
    } as any;

    useAuthStore.getState().setSession(fakeSession);

    const state = useAuthStore.getState();
    expect(state.session).toEqual(fakeSession);
    expect(state.user).toEqual(fakeSession.user);
  });
});

describe('AuthStore — linkIdentity OAuth flow', () => {
  const mockLinkIdentity = supabase.auth.linkIdentity as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  it('opens the browser and completes linking via iOS code exchange', async () => {
    const fakeSession = { user: { id: 'user-1', user_metadata: {} }, access_token: 'tok' };

    mockLinkIdentity.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/...' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'interviewready://auth/callback?code=link123',
    });
    mockExchangeCode.mockResolvedValue({ data: { session: fakeSession }, error: null });

    const result = await useAuthStore.getState().linkIdentity('google');

    expect(result.error).toBeNull();
    expect(mockOpenAuthSession).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/...',
      'interviewready://auth/callback'
    );
    expect(mockExchangeCode).toHaveBeenCalledWith('link123');
    expect(useAuthStore.getState().session).toEqual(fakeSession);
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  it('leaves pendingOAuthCallback true on Android dismiss (deep link pending)', async () => {
    mockLinkIdentity.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/...' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: 'dismiss' });

    const result = await useAuthStore.getState().linkIdentity('google');

    expect(result.error).toBeNull();
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(true);
  });

  it('clears the flag and returns an error when the user cancels', async () => {
    mockLinkIdentity.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/...' },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });

    const result = await useAuthStore.getState().linkIdentity('google');

    expect(result.error).toBe('Sign-in was cancelled. Please try again.');
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  it('returns the provider error when Supabase rejects the link', async () => {
    mockLinkIdentity.mockResolvedValue({
      data: null,
      error: { message: 'Provider not configured' },
    });

    const result = await useAuthStore.getState().linkIdentity('google');

    expect(result.error).toBeTruthy();
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });

  it('returns an error when no URL is returned', async () => {
    mockLinkIdentity.mockResolvedValue({ data: { url: null }, error: null });

    const result = await useAuthStore.getState().linkIdentity('google');

    expect(result.error).toBe('Unable to start account linking. Please try again.');
    expect(useAuthStore.getState().pendingOAuthCallback).toBe(false);
  });
});
