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
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  initialized: false,

  initialize: async () => {
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
    const { error } = await supabase.auth.signUp({
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
    return { error: error?.message ?? null };
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    set({ loading: false });
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
        // exchangeCodeForSession and then setSession(). We just need to wait
        // for that to complete before returning.
        //
        // Poll getSession() — it will be populated once the Linking handler
        // finishes, which usually takes < 1 second.
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            set({ session, user: session.user });
            return { error: null };
          }
        }

        // Still nothing after 4 seconds. onAuthStateChange will fire eventually
        // and the welcome screen's session watcher will navigate away.
        console.warn('[OAuth] Session not ready after polling. Relying on onAuthStateChange.');
        return { error: null };
      }

      return { error: 'No URL returned from Supabase.' };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  signOut: async () => {
    set({ loading: true });
    
    // Eagerly clear all user state before the Supabase network call
    // so the UI transitions immediately and data is never visible again
    await clearAllUserState();
    
    await supabase.auth.signOut();
    set({ session: null, user: null, loading: false });
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },
}));
