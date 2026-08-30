import { create } from 'zustand';
import { Platform } from 'react-native';
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
import { exchangeAuthCodeSafely } from '../lib/auth-code-exchange';
import { getUserFriendlyErrorMessage } from '../lib/errorHandler';

WebBrowser.maybeCompleteAuthSession();

// Holds the auth listener subscription so it can be cleaned up on re-initialization
let authSubscription: (() => void) | null = null;

// AsyncStorage keys used by persisted Zustand stores
const PERSISTED_STORE_KEYS = [
  'resume-store',
  'dashboard-store',
  'onboarding-storage',
  'notification-storage',
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
  pendingOAuthCallback: boolean; // true while a code exchange is in flight

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: 'google' | 'linkedin_oidc') => Promise<{ error: string | null }>;
  signInWithGoogleIdToken: () => Promise<{ error: string | null }>;
  signInWithLinkedInIdToken: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setPendingOAuthCallback: (pending: boolean) => void;
  linkIdentity: (provider: string) => Promise<{ error: string | null }>;
  unlinkIdentity: (identityId: string) => Promise<{ error: string | null }>;
  getUserIdentities: () => Promise<any>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,
  pendingOAuthCallback: false,

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
          // Clear the OAuth pending flag whenever a session is established so
          // AuthGuard is never stuck if the deep-link handler races with this event.
          ...((_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') && session
            ? { pendingOAuthCallback: false }
            : {}),
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

    // 1. Dispatch via high-deliverability auth-signup Edge Function (Spaceship TLS + Airtable Sync)
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

      const resp = await fetch(`${supabaseUrl}/functions/v1/auth-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
      });

      if (resp.ok) {
        const resData = await resp.json();
        set({ loading: false });
        return { error: null, user: resData?.user };
      } else {
        const errData = await resp.json().catch(() => ({}));
        if (errData?.error) {
          set({ loading: false });
          return { error: getUserFriendlyErrorMessage(errData.error) };
        }
      }
    } catch {
      // Fallback to standard Supabase auth client if network error occurs
    }

    const origin = typeof globalThis !== 'undefined' && (globalThis as any).location?.origin
      ? (globalThis as any).location.origin
      : 'https://appinterviewready.top';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
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

    return { error: error ? getUserFriendlyErrorMessage(error.message) : null };
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

    return { error: error ? getUserFriendlyErrorMessage(error.message) : null };
  },

  signInWithOAuth: async (provider) => {
    if (get().pendingOAuthCallback) {
      console.warn('[OAuth] OAuth already in progress — ignoring concurrent request');
      return { error: null };
    }

    try {
      set({ pendingOAuthCallback: true });

      if (Platform.OS === 'web') {
        const origin = typeof globalThis !== 'undefined' && (globalThis as any).location?.origin
          ? (globalThis as any).location.origin
          : 'https://appinterviewready.top';
        const { error: webOAuthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: origin ? `${origin}/auth/callback` : undefined,
          },
        });
        if (webOAuthError) {
          set({ pendingOAuthCallback: false });
          return { error: getUserFriendlyErrorMessage(webOAuthError.message) };
        }
        return { error: null };
      }

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

      if (error) {
        set({ pendingOAuthCallback: false });
        return { error: getUserFriendlyErrorMessage(error.message) };
      }

      if (data?.url) {


        // Safety timeout: if the deep link never arrives (app killed, provider
        // error page, etc.), clear the flag so AuthGuard isn't stuck forever.
        const oauthTimeoutId = setTimeout(() => {
          if (useAuthStore.getState().pendingOAuthCallback) {
            console.warn('[OAuth] Callback timeout — clearing pending flag');
            useAuthStore.getState().setPendingOAuthCallback(false);
          }
        }, 30_000);

        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        // User explicitly tapped the back/cancel button — nothing to do.
        if (res.type === 'cancel') {
          clearTimeout(oauthTimeoutId);
          set({ pendingOAuthCallback: false });
          return { error: 'Sign-in was cancelled. Please try again.' };
        }

        // ─── iOS success path ────────────────────────────────────────────────
        // On iOS, openAuthSessionAsync intercepts the redirect and returns the
        // full callback URL in res.url. Exchange the code immediately here.
        if (res.type === 'success' && res.url) {
          try {
            const parsedUrl = new URL(res.url);
            const code = parsedUrl.searchParams.get('code');
            if (code) {
              const { session: sessionData, error: sessionError } =
                await exchangeAuthCodeSafely(code);
              if (sessionError) {
                console.warn('[OAuth] exchangeCodeForSession error:', sessionError.message);
                clearTimeout(oauthTimeoutId);
                set({ pendingOAuthCallback: false });
              } else if (sessionData) {
                // onAuthStateChange will also fire, but we set it here for immediate response
                clearTimeout(oauthTimeoutId);
                set({ session: sessionData, user: sessionData.user, pendingOAuthCallback: false });
                return { error: null };
              }
            }
          } catch (parseErr) {
            console.warn('[OAuth] Could not parse redirect URL:', parseErr);
            clearTimeout(oauthTimeoutId);
            set({ pendingOAuthCallback: false });
          }
        }

        // ─── Android / fallback path ─────────────────────────────────────────
        // On Android the deep-link Intent closes the Custom Tab and
        // openAuthSessionAsync returns 'dismiss' with no URL. The code was
        // delivered to the Linking listener in _layout.tsx which calls
        // exchangeCodeForSession. onAuthStateChange will fire and set the session.
        // pendingOAuthCallback stays true here — _layout.tsx clears it after
        // the code exchange completes (success or failure).
        // The 30s timeout above acts as the final safety net.
        console.log('[OAuth] OAuth initiated, waiting for callback via deep link');
        return { error: null };
      }

      set({ pendingOAuthCallback: false });
      return { error: 'Unable to start sign-in. Please try again.' };
    } catch (err: any) {
      set({ pendingOAuthCallback: false });
      return { error: getUserFriendlyErrorMessage(err.message) };
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

  setPendingOAuthCallback: (pending) => {
    set({ pendingOAuthCallback: pending });
  },

  linkIdentity: async (provider) => {
    if (get().pendingOAuthCallback) {
      console.warn('[Identity] OAuth already in progress — ignoring concurrent request');
      return { error: null };
    }

    try {
      set({ pendingOAuthCallback: true });

      const redirectTo = makeRedirectUri({
        scheme: 'interviewready',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.linkIdentity({
        provider: provider as any,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('Error linking identity:', error);
        set({ pendingOAuthCallback: false });
        return { error: getUserFriendlyErrorMessage(error.message) };
      }

      if (data?.url) {


        // Safety timeout: clear the flag if the deep link never arrives.
        const linkTimeoutId = setTimeout(() => {
          if (useAuthStore.getState().pendingOAuthCallback) {
            console.warn('[Identity] Callback timeout — clearing pending flag');
            useAuthStore.getState().setPendingOAuthCallback(false);
          }
        }, 30_000);

        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        // User explicitly tapped back/cancel — nothing to do.
        if (res.type === 'cancel') {
          clearTimeout(linkTimeoutId);
          set({ pendingOAuthCallback: false });
          return { error: 'Sign-in was cancelled. Please try again.' };
        }

        // ─── iOS success path ──────────────────────────────────────────────
        // openAuthSessionAsync intercepts the redirect and returns the full
        // callback URL inline. Exchange the PKCE code here so the identity is
        // linked immediately without needing a deep link.
        if (res.type === 'success' && res.url) {
          try {
            const parsedUrl = new URL(res.url);
            const code = parsedUrl.searchParams.get('code');
            if (code) {
              const { session: sessionData, error: sessionError } =
                await exchangeAuthCodeSafely(code);
              if (sessionError) {
                console.warn('[Identity] exchangeCodeForSession error:', sessionError.message);
                clearTimeout(linkTimeoutId);
                set({ pendingOAuthCallback: false });
                return { error: getUserFriendlyErrorMessage(sessionError.message) };
              }
              if (sessionData) {
                clearTimeout(linkTimeoutId);
                set({ session: sessionData, user: sessionData.user, pendingOAuthCallback: false });
                return { error: null };
              }
            }
          } catch (parseErr) {
            console.warn('[Identity] Could not parse redirect URL:', parseErr);
            clearTimeout(linkTimeoutId);
            set({ pendingOAuthCallback: false });
          }
        }

        // ─── Android / fallback path ────────────────────────────────────────
        // The deep-link listener in _layout.tsx exchanges the code
        // asynchronously and updates the session. pendingOAuthCallback stays
        // true until that handler clears it. Callers should poll
        // getUserIdentities() to confirm the identity appeared.
        console.log('[Identity] OAuth initiated, waiting for callback via deep link');
        return { error: null };
      }

      set({ pendingOAuthCallback: false });
      return { error: 'Unable to start account linking. Please try again.' };
    } catch (err: any) {
      console.error('Error linking identity:', err);
      set({ pendingOAuthCallback: false });
      return { error: getUserFriendlyErrorMessage(err.message, 'Failed to link account') };
    }
  },

  unlinkIdentity: async (identityId) => {
    try {
      const { error } = await (supabase.auth.unlinkIdentity as any)(identityId);

      if (error) {
        console.error('Error unlinking identity:', error);
        return { error: getUserFriendlyErrorMessage(error.message) };
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error unlinking identity:', err);
      return { error: getUserFriendlyErrorMessage(err.message) };
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
