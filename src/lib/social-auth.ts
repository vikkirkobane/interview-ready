
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

/**
 * Initialize Google Sign-In with configuration
 * Call this once at app startup (e.g., in _layout.tsx or App.tsx)
 */
export function initializeGoogleSignIn() {
  GoogleSignin.configure({
    // Get these from Google Cloud Console
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true, // Required for refresh tokens
  });
}

/**
 * Sign in with Google using native SDK and exchange ID token with Supabase
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    // Check if device supports Google Play Services
    await GoogleSignin.hasPlayServices();

    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();
    
    // Get the ID token from the user info
    // v16+ returns { type: 'success', data: { idToken, ... } }, older versions return { idToken, ... }
    const idToken = (userInfo as any)?.data?.idToken || (userInfo as any)?.idToken;
    
    if (!idToken) {
      return { error: 'Failed to get Google ID token' };
    }

    // Exchange ID token with Supabase (don't need nonce for Google ID token auth)
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('[Google Sign-In] Supabase error:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    console.error('[Google Sign-In] Error:', error);
    
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { error: 'Sign in was cancelled' };
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return { error: 'Sign in is already in progress' };
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { error: 'Google Play Services not available' };
    }
    
    return { error: error.message || 'Google sign-in failed' };
  }
}

/**
 * Sign out from Google (optional, clears local Google state)
 */
export async function signOutFromGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn('[Google Sign-Out] Error:', error);
  }
}

export { GoogleSigninButton, statusCodes };
