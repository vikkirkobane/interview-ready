/**
 * Test suite for Supabase identity linking functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../src/stores/auth-store';
import { supabase } from '../src/lib/supabase';

// Mock the supabase client
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      linkIdentity: vi.fn(),
      unlinkIdentity: vi.fn(),
      getUserIdentities: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  },
}));

// Mock other dependencies
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

describe('Supabase Identity Linking', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Initialize the auth store
    useAuthStore.getState().initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('linkIdentity', () => {
    it('should call supabase linkIdentity with the correct provider', async () => {
      const mockProvider = 'google';

      (supabase.auth.linkIdentity as vi.Mock).mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().linkIdentity(mockProvider);

      expect(supabase.auth.linkIdentity).toHaveBeenCalledWith({
        provider: mockProvider,
        options: {
          redirectTo: 'mock://redirect',
          skipBrowserRedirect: true,
        },
      });
      expect(result.error).toBeNull();
    });

    it('should return error when linkIdentity fails', async () => {
      const mockProvider = 'google';
      const mockError = { message: 'Linking failed' };

      (supabase.auth.linkIdentity as vi.Mock).mockResolvedValue({ error: mockError });

      const result = await useAuthStore.getState().linkIdentity(mockProvider);

      expect(result.error).toBe(mockError.message);
    });

    it('should handle exceptions during linking', async () => {
      const mockProvider = 'google';
      const mockError = new Error('Network error');

      (supabase.auth.linkIdentity as vi.Mock).mockRejectedValue(mockError);

      const result = await useAuthStore.getState().linkIdentity(mockProvider);

      expect(result.error).toBe(mockError.message);
    });
  });

  describe('unlinkIdentity', () => {
    it('should call supabase unlinkIdentity with the correct identityId', async () => {
      const mockIdentityId = 'test-identity-id';

      (supabase.auth.unlinkIdentity as vi.Mock).mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().unlinkIdentity(mockIdentityId);

      expect(supabase.auth.unlinkIdentity).toHaveBeenCalledWith(mockIdentityId);
      expect(result.error).toBeNull();
    });

    it('should return error when unlinkIdentity fails', async () => {
      const mockIdentityId = 'test-identity-id';
      const mockError = { message: 'Unlinking failed' };

      (supabase.auth.unlinkIdentity as vi.Mock).mockResolvedValue({ error: mockError });

      const result = await useAuthStore.getState().unlinkIdentity(mockIdentityId);

      expect(result.error).toBe(mockError.message);
    });

    it('should handle exceptions during unlinking', async () => {
      const mockIdentityId = 'test-identity-id';
      const mockError = new Error('Network error');

      (supabase.auth.unlinkIdentity as vi.Mock).mockRejectedValue(mockError);

      const result = await useAuthStore.getState().unlinkIdentity(mockIdentityId);

      expect(result.error).toBe(mockError.message);
    });
  });

  describe('getUserIdentities', () => {
    it('should call supabase getUserIdentities and return data', async () => {
      const mockIdentities = {
        data: [
          {
            id: 'identity-1',
            identity_data: { email: 'test@example.com', full_name: 'Test User' },
            provider: 'email',
            provider_id: 'email-provider-id',
          },
          {
            id: 'identity-2',
            identity_data: { email: 'test@gmail.com', full_name: 'Test User' },
            provider: 'google',
            provider_id: 'google-provider-id',
          },
        ],
      };

      (supabase.auth.getUserIdentities as vi.Mock).mockResolvedValue(mockIdentities);

      const result = await useAuthStore.getState().getUserIdentities();

      expect(supabase.auth.getUserIdentities).toHaveBeenCalled();
      expect(result).toEqual(mockIdentities.data);
    });

    it('should throw error when getUserIdentities fails', async () => {
      const mockError = { message: 'Failed to get identities' };

      (supabase.auth.getUserIdentities as vi.Mock).mockResolvedValue({ error: mockError });

      await expect(useAuthStore.getState().getUserIdentities()).rejects.toThrow(mockError.message);
    });

    it('should handle exceptions during identity retrieval', async () => {
      const mockError = new Error('Network error');

      (supabase.auth.getUserIdentities as vi.Mock).mockRejectedValue(mockError);

      await expect(useAuthStore.getState().getUserIdentities()).rejects.toThrow(mockError.message);
    });
  });

  describe('integration', () => {
    it('should allow linking, retrieving, and unlinking identities in sequence', async () => {
      const provider = 'google';
      const mockIdentityId = 'new-identity-id';

      // Mock the linking operation
      (supabase.auth.linkIdentity as vi.Mock).mockResolvedValue({ error: null });

      // Mock the retrieval operation
      (supabase.auth.getUserIdentities as vi.Mock).mockResolvedValue({
        data: [
          { id: 'existing-identity', provider: 'email', identity_data: {}, provider_id: 'email-id' },
          { id: mockIdentityId, provider: provider, identity_data: {}, provider_id: 'google-id' },
        ],
      });

      // Mock the unlinking operation
      (supabase.auth.unlinkIdentity as vi.Mock).mockResolvedValue({ error: null });

      // Link an identity
      const linkResult = await useAuthStore.getState().linkIdentity(provider);
      expect(linkResult.error).toBeNull();

      // Retrieve identities
      const identities = await useAuthStore.getState().getUserIdentities();
      expect(identities).toHaveLength(2);
      expect(identities.some(id => id.provider === provider)).toBe(true);

      // Unlink the identity
      const unlinkResult = await useAuthStore.getState().unlinkIdentity(mockIdentityId);
      expect(unlinkResult.error).toBeNull();
    });
  });
});