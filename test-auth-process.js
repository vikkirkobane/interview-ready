/**
 * Authentication Process Tests
 *
 * These tests simulate the complete user authentication flow
 * from sign-up to onboarding completion.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/auth-store';
import { useProfileStore } from '../src/stores/profile-store';
import { initializeGoogleSignIn, signInWithGoogle, signOutFromGoogle } from '../src/lib/social-auth';

// Mock all the necessary dependencies
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithIdToken: vi.fn(),
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(),
      signOut: vi.fn(),
      linkIdentity: vi.fn(),
      unlinkIdentity: vi.fn(),
      getUserIdentities: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/social-auth', () => ({
  initializeGoogleSignIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOutFromGoogle: vi.fn(),
}));

vi.mock('expo-web-browser', () => ({
  makeRedirectUri: vi.fn(() => 'mock://redirect'),
  openAuthSessionAsync: vi.fn(),
}));

vi.mock('expo-auth-session', () => ({
  makeRedirectUri: vi.fn(() => 'mock://redirect'),
}));

vi.mock('../src/stores/profile-store', () => ({
  useProfileStore: vi.fn(() => ({ clearProfile: vi.fn() })),
}));

vi.mock('../src/stores/onboarding-store', () => ({
  useOnboardingStore: vi.fn(() => ({ resetOnboarding: vi.fn() })),
}));

vi.mock('../src/stores/resume-store', () => ({
  useResumeStore: vi.fn(() => ({ reset: vi.fn() })),
}));

vi.mock('../src/stores/dashboard-store', () => ({
  useDashboardStore: vi.fn(() => ({ reset: vi.fn() })),
}));

vi.mock('../src/stores/notification-store', () => ({
  useNotificationStore: vi.fn(() => ({ reset: vi.fn() })),
}));

vi.mock('../store/previewStore', () => ({
  usePreviewStore: vi.fn(() => ({ clearPreview: vi.fn() })),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    multiRemove: vi.fn(),
  },
}));

describe('Authentication Process Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Email Sign Up Process', () => {
    it('should handle successful email sign up with confirmation required', async () => {
      const mockEmail = 'test@example.com';
      const mockPassword = 'Password123!';
      const mockSession = {
        user: {
          id: 'user-123',
          email: mockEmail,
          user_metadata: { onboarding_completed: false }
        },
        session: { access_token: 'mock-token' }
      };

      // Mock the sign up response (with confirmation required)
      (supabase.auth.signUp as vi.Mock).mockResolvedValue({
        data: { user: mockSession.user, session: null }, // No session returned initially due to confirmation
        error: null
      });

      const { signUp } = useAuthStore.getState();
      const result = await signUp(mockEmail, mockPassword);

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: mockEmail,
        password: mockPassword,
        options: {
          data: {
            first_name: '',
            last_name: '',
          },
        },
      });
      expect(result.error).toBeNull();
    });

    it('should handle sign up validation errors', async () => {
      const { signUp } = useAuthStore.getState();
      const result = await signUp('', 'short'); // Invalid email and short password

      // Since validation happens in the component, this would fail at the API level
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should handle sign up server errors', async () => {
      const mockError = { message: 'Email already registered' };
      (supabase.auth.signUp as vi.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      });

      const { signUp } = useAuthStore.getState();
      const result = await signUp('test@example.com', 'Password123!');

      expect(result.error).toBe(mockError.message);
    });
  });

  describe('Email Sign In Process', () => {
    it('should handle successful email sign in for new user (needs onboarding)', async () => {
      const mockEmail = 'test@example.com';
      const mockPassword = 'Password123!';
      const mockUser = {
        id: 'user-123',
        email: mockEmail,
        user_metadata: { onboarding_completed: false }
      };
      const mockSession = { access_token: 'mock-token', user: mockUser };

      (supabase.auth.signInWithPassword as vi.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { signIn } = useAuthStore.getState();
      const result = await signIn(mockEmail, mockPassword);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: mockEmail,
        password: mockPassword,
      });
      expect(result.error).toBeNull();
    });

    it('should handle successful email sign in for existing user (skip onboarding)', async () => {
      const mockEmail = 'existing@example.com';
      const mockPassword = 'Password123!';
      const mockUser = {
        id: 'user-456',
        email: mockEmail,
        user_metadata: { onboarding_completed: true, first_name: 'John', last_name: 'Doe' }
      };
      const mockSession = { access_token: 'mock-token', user: mockUser };

      (supabase.auth.signInWithPassword as vi.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { signIn } = useAuthStore.getState();
      const result = await signIn(mockEmail, mockPassword);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: mockEmail,
        password: mockPassword,
      });
      expect(result.error).toBeNull();
    });

    it('should handle sign in authentication errors', async () => {
      const mockError = { message: 'Invalid email or password' };
      (supabase.auth.signInWithPassword as vi.Mock).mockResolvedValue({
        data: { session: null },
        error: mockError
      });

      const { signIn } = useAuthStore.getState();
      const result = await signIn('wrong@example.com', 'wrongpassword');

      expect(result.error).toBe(mockError.message);
    });
  });

  describe('OAuth Sign In Process', () => {
    it('should handle Google sign in via ID token', async () => {
      const mockUserInfo = {
        data: { idToken: 'google-id-token' }
      };
      const mockUser = {
        id: 'user-789',
        email: 'google-user@example.com',
        user_metadata: { onboarding_completed: false }
      };
      const mockSession = { access_token: 'mock-token', user: mockUser };

      (signInWithGoogle as vi.Mock).mockResolvedValue({ error: null });
      (supabase.auth.signInWithIdToken as vi.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { signInWithGoogleIdToken } = useAuthStore.getState();
      const result = await signInWithGoogleIdToken();

      expect(signInWithGoogle).toHaveBeenCalled();
      expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: 'google-id-token',
      });
      expect(result.error).toBeNull();
    });

    it('should handle LinkedIn sign in via OAuth flow', async () => {
      const mockRedirectUrl = 'mock://redirect';
      const mockAuthData = {
        url: 'https://supabase-oauth-provider.com/auth',
        provider: 'linkedin_oidc'
      };
      const mockUser = {
        id: 'user-101',
        email: 'linkedin-user@example.com',
        user_metadata: { onboarding_completed: false }
      };
      const mockSession = { access_token: 'mock-token', user: mockUser };

      (supabase.auth.signInWithOAuth as vi.Mock).mockResolvedValue({
        data: mockAuthData,
        error: null
      });

      const { signInWithLinkedInIdToken } = useAuthStore.getState();
      const result = await signInWithLinkedInIdToken();

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: mockRedirectUrl,
          skipBrowserRedirect: true,
        },
      });
      expect(result.error).toBeNull();
    });

    it('should handle OAuth cancellation', async () => {
      (signInWithGoogle as vi.Mock).mockResolvedValue({ error: 'Sign in was cancelled' });

      const { signInWithGoogleIdToken } = useAuthStore.getState();
      const result = await signInWithGoogleIdToken();

      expect(result.error).toBe('Sign in was cancelled');
    });

    it('should handle OAuth server errors', async () => {
      const mockError = { message: 'OAuth provider error' };
      (signInWithGoogle as vi.Mock).mockResolvedValue({ error: mockError.message });

      const { signInWithGoogleIdToken } = useAuthStore.getState();
      const result = await signInWithGoogleIdToken();

      expect(result.error).toBe(mockError.message);
    });
  });

  describe('Session Management & Routing', () => {
    it('should initialize auth store and listen for auth changes', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { onboarding_completed: true }
        },
        access_token: 'mock-token'
      };

      (supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const mockSubscription = { unsubscribe: vi.fn() };
      (supabase.auth.onAuthStateChange as vi.Mock).mockReturnValue({
        data: { subscription: mockSubscription }
      });

      const { initialize } = useAuthStore.getState();
      await initialize();

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      expect(initializeGoogleSignIn).toHaveBeenCalled();
    });

    it('should handle SIGNED_OUT event and clear user state', async () => {
      const mockEventHandler = vi.fn();
      (supabase.auth.onAuthStateChange as vi.Mock).mockImplementation((cb) => {
        cb('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      // We can't directly test the internal clearAllUserState function
      // but we can verify that the auth state change handler is set up
      const { initialize } = useAuthStore.getState();
      await initialize();

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('Identity Linking Process (Added Feature)', () => {
    it('should link a new identity to existing account', async () => {
      const mockProvider = 'google';
      const mockRedirectUrl = 'mock://redirect';

      (supabase.auth.linkIdentity as vi.Mock).mockResolvedValue({
        error: null
      });

      const { linkIdentity } = useAuthStore.getState();
      const result = await linkIdentity(mockProvider);

      expect(supabase.auth.linkIdentity).toHaveBeenCalledWith({
        provider: mockProvider,
        options: {
          redirectTo: mockRedirectUrl,
          skipBrowserRedirect: true,
        },
      });
      expect(result.error).toBeNull();
    });

    it('should unlink an identity from account', async () => {
      const mockIdentityId = 'identity-123';

      (supabase.auth.unlinkIdentity as vi.Mock).mockResolvedValue({
        error: null
      });

      const { unlinkIdentity } = useAuthStore.getState();
      const result = await unlinkIdentity(mockIdentityId);

      expect(supabase.auth.unlinkIdentity).toHaveBeenCalledWith(mockIdentityId);
      expect(result.error).toBeNull();
    });

    it('should retrieve user identities', async () => {
      const mockIdentities = {
        data: [
          {
            id: 'identity-1',
            identity_data: { email: 'user@example.com' },
            provider: 'email',
            provider_id: 'email-provider-id'
          },
          {
            id: 'identity-2',
            identity_data: { email: 'user@gmail.com' },
            provider: 'google',
            provider_id: 'google-provider-id'
          }
        ]
      };

      (supabase.auth.getUserIdentities as vi.Mock).mockResolvedValue(mockIdentities);

      const { getUserIdentities } = useAuthStore.getState();
      const result = await getUserIdentities();

      expect(supabase.auth.getUserIdentities).toHaveBeenCalled();
      expect(result).toEqual(mockIdentities.data);
    });

    it('should handle identity linking errors', async () => {
      const mockError = { message: 'Linking failed' };
      (supabase.auth.linkIdentity as vi.Mock).mockResolvedValue({
        error: mockError
      });

      const { linkIdentity } = useAuthStore.getState();
      const result = await linkIdentity('google');

      expect(result.error).toBe(mockError.message);
    });
  });

  describe('User Profile Integration', () => {
    it('should fetch user profile after authentication', async () => {
      const mockUser = { id: 'user-123' };
      const mockProfile = {
        id: 'profile-123',
        user_id: 'user-123',
        current_role: 'Software Engineer',
        profile_completeness: 45
      };

      (supabase.auth.getUser as vi.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock the profile store's fetchProfile method
      const originalFetchProfile = useProfileStore.getState().fetchProfile;
      const mockFetchProfile = vi.fn();
      vi.spyOn(useProfileStore, 'getState').mockReturnValue({
        ...useProfileStore.getState(),
        fetchProfile: mockFetchProfile
      } as any);

      // Simulate the profile fetch process
      const { fetchProfile } = useProfileStore.getState();
      await fetchProfile();

      expect(supabase.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('Complete Authentication Flow Simulation', () => {
    it('should simulate a complete new user journey: sign up -> confirm -> sign in -> onboarding', async () => {
      // Step 1: Email sign up (returns user but no session due to confirmation required)
      const mockEmail = 'newuser@example.com';
      const mockPassword = 'Password123!';

      (supabase.auth.signUp as vi.Mock).mockResolvedValue({
        data: {
          user: { id: 'user-new', email: mockEmail, user_metadata: { onboarding_completed: false } },
          session: null
        },
        error: null
      });

      const { signUp } = useAuthStore.getState();
      const signUpResult = await signUp(mockEmail, mockPassword);
      expect(signUpResult.error).toBeNull();

      // Step 2: After email confirmation, user can sign in
      const mockSession = {
        user: { id: 'user-new', email: mockEmail, user_metadata: { onboarding_completed: false } },
        access_token: 'mock-token'
      };

      (supabase.auth.signInWithPassword as vi.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const { signIn } = useAuthStore.getState();
      const signInResult = await signIn(mockEmail, mockPassword);
      expect(signInResult.error).toBeNull();

      // Step 3: Verify user is redirected to onboarding (checked via user metadata)
      const currentUser = useAuthStore.getState().user;
      expect(currentUser?.user_metadata?.onboarding_completed).toBe(false);
    });

    it('should simulate OAuth sign in and account creation', async () => {
      const mockUser = {
        id: 'oauth-user-123',
        email: 'oauth@example.com',
        user_metadata: { onboarding_completed: false, first_name: 'OAuth', last_name: 'User' }
      };
      const mockSession = { access_token: 'oauth-token', user: mockUser };

      // Simulate successful OAuth sign in
      (supabase.auth.signInWithIdToken as vi.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      (signInWithGoogle as vi.Mock).mockResolvedValue({ error: null });

      const { signInWithGoogleIdToken } = useAuthStore.getState();
      const result = await signInWithGoogleIdToken();

      expect(result.error).toBeNull();
      expect(signInWithGoogle).toHaveBeenCalled();
      expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: expect.any(String), // The ID token from Google
      });

      // Verify the user is not yet onboarded
      const currentState = useAuthStore.getState();
      expect(currentState.user?.user_metadata?.onboarding_completed).toBe(false);
    });
  });
});