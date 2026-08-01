import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/query-client';
import { useProfileStore } from './profile-store';
import { useOnboardingStore } from './onboarding-store';
import { useResumeStore } from './resume-store';
import { useDashboardStore } from './dashboard-store';
import { useNotificationStore } from './notification-store';
import { usePreviewStore } from '../store/previewStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { signInWithGoogle, initializeGoogleSignIn, signOutFromGoogle } from '../lib/social-auth';

WebBrowser.maybeCompleteAuthSession();

// Holds the auth listener subscription so it can be cleaned up on re-initialization
let authSubscription: (() => void) | null = null;

// AsyncStorage keys used by persisted Zustand stores
const PERSISTED_STORE_KEYS = [
  'resume-store',
  'dashboard-store',
  'onboarding-storage',
];

/**
 * Wipes ALL client-side user data to prevent data leakage
 * when a different user signs in on the same device.
 * This covers: in-memory Zustand state, TanStack Query cache,
 * and any data persisted to AsyncStorage.
 */
async function clearAllUserState() {
  // 1. Reset all in-memory Zustand stores
  useProfileStore.getState().clearProfile();
  useOnboardingStore.getState().resetOnboarding();
  useResumeStore.getState().reset();
  useDashboardStore.getState().reset();
  useNotificationStore.getState().reset();
  usePreviewStore.getState().clearPreview();

  // 2. Clear all server-fetched data from the TanStack Query cache
  queryClient.clear();

  // 3. Remove all persisted store data from on-device storage
  await AsyncStorage.multiRemove(PERSISTED_STORE_KEYS);
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: 'google' | 'linkedin_oidc') => Promise<{ error: string | null }>;
  signInWithGoogleIdToken: () => Promise<{ error: string | null }>;
  signInWithLinkedInIdToken: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  linkIdentity: (provider: string) => Promise<{ error: string | null }>;
  unlinkIdentity: (identityId: string) => Promise<{ error: string | null }>;
  getUserIdentities: () => Promise<any>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    // Initialize Google Sign-In on app startup
    initializeGoogleSignIn();

    // Tear down any previous listener (guards against hot-reload double-subscription)
    if (authSubscription) {
      authSubscription();
      authSubscription = null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      });

      // Listen for auth state changes (sign in, sign out, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
        
        if (_event === 'SIGNED_OUT') {
          // Comprehensive cleanup fires on every sign-out event (manual or session expiry)
          clearAllUserState();
        }
      });

      authSubscription = () => subscription.unsubscribe();
    } catch (error) {
      console.error('[Auth] Failed to initialize:', error);
      set({ loading: false, initialized: true });
    }
  },

  signUp: async (email, password, firstName = '', lastName = '') => {
    set({ loading: true });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    set({ loading: false });

    // If a session is returned immediately (email confirmation disabled),
    // store it so callers can route without waiting for onAuthStateChange.
    if (data?.session) {
      set({ session: data.session, user: data.session.user });
    }

    return { error: error?.message ?? null };
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    set({ loading: false });

    // Set the session synchronously so the screen can route immediately
    // instead of depending on async onAuthStateChange timing.
    if (data?.session) {
      set({ session: data.session, user: data.session.user });
    }

    return { error: error?.message ?? null };
  },

  signInWithOAuth: async (provider) => {
    try {
      const redirectTo = makeRedirectUri({
        scheme: 'interviewready',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error: error.message };

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        // User explicitly tapped the back/cancel button — nothing to do.
        if (res.type === 'cancel') {
          return { error: 'Authentication canceled.' };
        }

        // ─── iOS success path ────────────────────────────────────────────────
        // On iOS, openAuthSessionAsync intercepts the redirect and returns the
        // full callback URL in res.url. Exchange the code immediately here.
        if (res.type === 'success' && res.url) {
          try {
            const parsedUrl = new URL(res.url);
            const code = parsedUrl.searchParams.get('code');
            if (code) {
              const { data: sessionData, error: sessionError } =
                await supabase.auth.exchangeCodeForSession(code);
              if (sessionError) {
                console.warn('[OAuth] exchangeCodeForSession error:', sessionError.message);
              } else if (sessionData?.session) {
                // onAuthStateChange will also fire, but we set it here for immediate response
                set({ session: sessionData.session, user: sessionData.session.user });
                return { error: null };
              }
            }
          } catch (parseErr) {
            console.warn('[OAuth] Could not parse redirect URL:', parseErr);
          }
        }

        // ─── Android / fallback path ─────────────────────────────────────────
        // On Android the deep-link Intent closes the Custom Tab and
        // openAuthSessionAsync returns 'dismiss' with no URL. The code was
        // delivered to the Linking listener in _layout.tsx which calls
        // exchangeCodeForSession. onAuthStateChange will fire and set the session.
        // The auth/callback screen will handle navigation once session is set.
        console.log('[OAuth] OAuth initiated, waiting for callback via deep link');
        return { error: null };
      }

      return { error: 'No URL returned from Supabase.' };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  signOut: async () => {
    set({ loading: true });
    
    // Sign out from Google if signed in
    await signOutFromGoogle();
    
    // Eagerly clear all user state before the Supabase network call
    // so the UI transitions immediately and data is never visible again
    await clearAllUserState();
    
    await supabase.auth.signOut();
    set({ session: null, user: null, loading: false });
  },

  signInWithGoogleIdToken: async () => {
    set({ loading: true });
    const { error } = await signInWithGoogle();
    set({ loading: false });

    // Sync the resulting session into the store immediately so callers can
    // route right away (onAuthStateChange is async and may lag behind).
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({ session, user: session.user });
      }
    }

    return { error };
  },

  signInWithLinkedInIdToken: async () => {
    set({ loading: true });
    // We use the built-in Supabase OAuth flow instead of manual ID token fetch.
    // This allows the _layout.tsx deep link handler to properly intercept
    // the Supabase PKCE code on Android.
    const { error } = await get().signInWithOAuth('linkedin_oidc');
    set({ loading: false });
    return { error };
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  linkIdentity: async (provider) => {
    try {
      const redirectTo = makeRedirectUri({
        scheme: 'interviewready',
        path: 'auth/callback',
      });

      const { error } = await supabase.auth.linkIdentity({
        provider: provider as any,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('Error linking identity:', error);
        return { error: error.message };
      }

      // For manual linking, the user needs to complete the OAuth flow
      // We'll handle the completion in the auth callback screen
      return { error: null };
    } catch (err: any) {
      console.error('Error linking identity:', err);
      return { error: err.message };
    }
  },

  unlinkIdentity: async (identityId) => {
    try {
      const { error } = await (supabase.auth.unlinkIdentity as any)(identityId);

      if (error) {
        console.error('Error unlinking identity:', error);
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error unlinking identity:', err);
      return { error: err.message };
    }
  },

  getUserIdentities: async () => {
    try {
      const { data, error } = await supabase.auth.getUserIdentities();

      if (error) {
        console.error('Error getting user identities:', error);
        throw error;
      }

      return data;
    } catch (err: any) {
      console.error('Error getting user identities:', err);
      throw err;
    }
  },
}));
