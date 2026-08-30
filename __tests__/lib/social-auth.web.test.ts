import { signInWithGoogle, initializeGoogleSignIn, signOutFromGoogle, GoogleSigninButton, statusCodes } from '../../src/lib/social-auth.web';
import { supabase } from '../../src/lib/supabase';

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
    },
  },
  supabaseUrl: 'https://test.supabase.co',
}));

describe('social-auth.web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides initializeGoogleSignIn as a safe no-op on web', () => {
    expect(() => initializeGoogleSignIn()).not.toThrow();
  });

  it('provides signOutFromGoogle as a safe no-op on web', async () => {
    await expect(signOutFromGoogle()).resolves.toBeUndefined();
  });

  it('renders GoogleSigninButton as null', () => {
    expect(GoogleSigninButton()).toBeNull();
  });

  it('exports statusCodes', () => {
    expect(statusCodes.SIGN_IN_CANCELLED).toBe('SIGN_IN_CANCELLED');
  });

  it('calls supabase.auth.signInWithOAuth with google provider and web redirect', async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValueOnce({
      data: { url: 'https://google.auth.url' },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(result.error).toBeNull();
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/auth/callback'),
      },
    });
  });

  it('returns error message if Supabase OAuth fails', async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'OAuth initialization error' },
    });

    const result = await signInWithGoogle();

    expect(result.error).toBe('OAuth initialization error');
  });
});
