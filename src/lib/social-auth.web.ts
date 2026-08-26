import { supabase } from './supabase';

/**
 * Web implementation of Google Sign-In using Supabase OAuth redirect flow.
 */
export function initializeGoogleSignIn() {
  // No initialization needed on web (handled via standard OAuth redirect)
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = origin ? `${origin}/auth/callback` : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error?.message || 'Google sign-in failed' };
  }
}

export async function signOutFromGoogle() {
  // Supabase auth handles session clearance
}

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

export const GoogleSigninButton = () => null;
