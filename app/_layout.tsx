import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/query-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../src/components/ui';
import { useAuthStore } from '../src/stores/auth-store';
import { useOnboardingStore } from '../src/stores/onboarding-store';
import { useTheme } from '../src/theme';
import * as Font from 'expo-font';
import * as Linking from 'expo-linking';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotificationStore } from '../src/stores/notification-store';
import { useAppVersion } from '../src/hooks/useAppVersion';
import { ForceUpdateScreen } from '../src/components/features/ForceUpdateScreen';
import { supabase } from '../src/lib/supabase';
import {
  exchangeAuthCodeSafely,
  isUrlAlreadyHandled,
  markUrlHandled,
  hasInFlightExchange,
  waitForAnyInFlightExchange,
} from '../src/lib/auth-code-exchange';
import mobileAds from 'react-native-google-mobile-ads';

if (!(Toast as any)._isPatched) {
  const originalToastShow = Toast.show;
  Toast.show = (params) => {
    originalToastShow(params);
    const type = params.type || 'info';
    if (type === 'success' || type === 'info') {
      useNotificationStore.getState().addNotification({
        title: params.text1 || 'Notification',
        description: params.text2 || '',
        type: type as 'success' | 'info',
      });
    }
  };
  (Toast as any)._isPatched = true;
}

// ─── Deep Link State ─────────────────────────────────────────────────────────
// NOTE: pendingAuthCallback has been moved into useAuthStore as
// `pendingOAuthCallback` so signInWithOAuth can set it synchronously
// BEFORE opening the browser — eliminating the race condition where
// AuthGuard fires between the browser closing and the deep-link handler
// running exchangeCodeForSession.

/**
 * Auth guard: watches session state and redirects to the correct route.
 * - No session → /(auth)/welcome (unless an OAuth callback is pending)
 * - Session + in auth flow → /(tabs) (auto-redirect after login)
 * - Session already in tabs → stay put
 */
function AuthGuard() {
  const { session, initialized, pendingOAuthCallback } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const firstSegment = segments[0] as string;
    const secondSegment = segments[1] as string;

    const inAuthGroup =
      firstSegment === '(auth)' || firstSegment === 'auth';
    const onCallbackScreen =
      secondSegment === 'callback' ||
      (firstSegment === 'auth' && secondSegment === 'callback');

    // Never interfere with the OAuth callback screen — it manages itself.
    if (onCallbackScreen) return;

    // Non-grouped auth/callback route (app/auth/callback.tsx → /auth/callback)
    if (firstSegment === 'auth' && secondSegment === 'callback') return;

    // CRITICAL: Don't redirect to welcome if an OAuth deep link is still
    // being processed. The code exchange is async and may not have completed yet.
    if (pendingOAuthCallback) {
      console.log('[AuthGuard] Pending auth callback — skipping redirect');
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session) {
      const isCompleted = session.user?.user_metadata?.onboarding_completed;
      const inOnboarding = firstSegment === '(onboarding)';
      
      if (!isCompleted && !inOnboarding) {
        router.replace('/(onboarding)/referral-code' as any);
      } else if (isCompleted && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, initialized, segments, pendingOAuthCallback]);

  return null;
}

export default function RootLayout() {
  const { initialize, initialized } = useAuthStore();
  const { colors, isDark } = useTheme();
  const { isChecking, forceUpdate, versionInfo, checkVersion } = useAppVersion();

  const [fontsLoaded] = Font.useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    // CRITICAL: Check for a pending OAuth callback URL BEFORE calling initialize().
    // On Android, when the app is cold-started via the interviewready://auth/callback
    // deep link (LinkedIn/Google OAuth return), initialize() completes and sets
    // initialized=true — which unblocks AuthGuard — before the Linking.addEventListener
    // useEffect runs. AuthGuard then sees {session: null, pendingOAuthCallback: false}
    // and incorrectly redirects to /(auth)/welcome.
    //
    // By setting pendingOAuthCallback=true synchronously here (before initialize()),
    // AuthGuard will always see the flag already set when it first evaluates.
    Linking.getInitialURL().then((url) => {
      if (url) {
        if (url.includes('error=') || url.includes('error_code=')) {
          useAuthStore.getState().setPendingOAuthCallback(false);
        } else if (url.includes('auth/callback')) {
          useAuthStore.getState().setPendingOAuthCallback(true);
        }
      }
      initialize();
    }).catch(() => {
      initialize();
    });
    mobileAds().initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle OAuth deep links (interviewready://auth/callback?code=...)
  // This fires when the app is opened via the OAuth redirect URI.
  // NOTE: getInitialURL() is intentionally NOT called here. It is pre-checked
  // in the initialize() useEffect above to set pendingOAuthCallback before
  // AuthGuard can evaluate. This listener only wires up the event handler.
  useEffect(() => {
    async function handleDeepLink(url: string) {
      // Handle referral deep links (interviewready://referral?code=XXXX)
      if (url.includes('/referral') || url.includes('referral?')) {
        try {
          const parsedUrl = new URL(url);
          const referralCode = parsedUrl.searchParams.get('code');

          if (referralCode) {
            console.log('[DeepLink] Referral code received:', referralCode);
            useOnboardingStore.getState().setReferralCode(referralCode.toUpperCase());

            const isCompleted = useAuthStore.getState().session?.user?.user_metadata?.onboarding_completed;
            if (isCompleted) {
              Toast.show({
                type: 'info',
                text1: 'Referral Code Received',
                text2: `Apply "${referralCode.toUpperCase()}" from the Referral tab.`,
              });
            } else {
              Toast.show({
                type: 'info',
                text1: 'Referral Code Received',
                text2: `Code "${referralCode.toUpperCase()}" will be applied during onboarding.`,
              });
            }
          }
        } catch (err) {
          console.error('[DeepLink] Referral link error:', err);
        }
        return;
      }

      // Handle password reset deep links (interviewready://reset-password#access_token=...&type=recovery)
      if (url.includes('reset-password')) {
        try {
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');

            if (type === 'recovery' && accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) {
                console.error('[DeepLink] Failed to set recovery session:', error.message);
              }
              console.log('[DeepLink] Recovery session set, reset-password screen will handle it');
              return;
            }
          }
        } catch (err) {
          console.error('[DeepLink] Reset password error:', err);
        }
        return;
      }

      // Only handle auth callbacks or auth error redirects
      const isAuthCallback = url.includes('auth/callback') || url.includes('error=') || url.includes('error_code=');
      if (!isAuthCallback) return;

      if (isUrlAlreadyHandled(url)) {
        console.log('[DeepLink] URL already handled, skipping:', url);
        return;
      }
      markUrlHandled(url);

      // Mark that we're processing an auth callback — prevents AuthGuard
      // from redirecting to welcome while we exchange the code.
      useAuthStore.getState().setPendingOAuthCallback(true);

      try {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');
        const error = parsedUrl.searchParams.get('error');
        const errorCode = parsedUrl.searchParams.get('error_code');
        const errorDescription = parsedUrl.searchParams.get('error_description');

        // Handle OAuth errors from provider / Supabase
        if (error || errorCode) {
          console.error('[DeepLink] OAuth error in callback URL:', error || errorCode, errorDescription);

          // If an auth code exchange is currently in-flight, await it first
          if (hasInFlightExchange()) {
            console.log('[DeepLink] Waiting for in-flight code exchange before processing error...');
            await waitForAnyInFlightExchange();
          }

          const currentSession = useAuthStore.getState().session;
          const isBadState =
            errorCode === 'bad_oauth_state' ||
            errorDescription?.includes('bad_oauth_state') ||
            errorCode === 'flow_state_already_used' ||
            errorDescription?.includes('already been used') ||
            errorDescription?.includes('flow state');

          // If the user already has an active session (e.g. exchanged code concurrently), ignore the error
          if (currentSession) {
            console.log('[DeepLink] Ignoring OAuth state error since session is active');
            useAuthStore.getState().setPendingOAuthCallback(false);
            return;
          }

          useAuthStore.getState().setPendingOAuthCallback(false);

          Toast.show({
            type: 'error',
            text1: isBadState ? 'Authentication session expired' : 'Authentication failed',
            text2: isBadState ? 'Please tap the sign-in button again.' : (errorDescription || error || 'OAuth error occurred'),
          });
          return;
        }

        if (code) {
          console.log('[DeepLink] Exchanging code for session...');
          const { session: exchangedSession, error: exchangeError } = await exchangeAuthCodeSafely(code);

          if (exchangeError) {
            console.error('[DeepLink] exchangeCodeForSession error:', exchangeError.message);
            const currentSession = useAuthStore.getState().session;
            if (!currentSession) {
              useAuthStore.getState().setPendingOAuthCallback(false);
              Toast.show({
                type: 'error',
                text1: 'Sign-in failed',
                text2: 'Could not complete LinkedIn login. Please try again.',
              });
            } else {
              useAuthStore.getState().setPendingOAuthCallback(false);
            }
            return;
          }

          // Explicitly set session in store for immediate response
          // onAuthStateChange will also fire, but this ensures no gap
          if (exchangedSession) {
            console.log('[DeepLink] Session obtained, setting in auth store');
            useAuthStore.getState().setSession(exchangedSession);
            Toast.show({
              type: 'success',
              text1: 'Signed in successfully!',
              text2: 'Welcome to InterviewReady.',
            });
          }

          console.log('[DeepLink] Code exchanged successfully');
          useAuthStore.getState().setPendingOAuthCallback(false);
          return;
        }

        console.warn('[DeepLink] No code found in callback URL');
        useAuthStore.getState().setPendingOAuthCallback(false);
      } catch (err) {
        console.error('[DeepLink] Unexpected error:', err);
        useAuthStore.getState().setPendingOAuthCallback(false);
      }
    }

    // Handle link that launched the app from cold start.
    // pendingOAuthCallback was already set to true in the initialize() useEffect
    // above (if this is an auth callback URL) — so AuthGuard is already blocked
    // by the time this async call resolves and handleDeepLink runs.
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Handling initial URL:', url);
        handleDeepLink(url);
      }
    }).catch((err) => {
      console.error('[DeepLink] getInitialURL error:', err);
      useAuthStore.getState().setPendingOAuthCallback(false);
    });

    // Handle link while app is already open (foreground)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] Handling foreground URL:', url);
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  // Wait for both session restore and font loading
  if (!initialized || !fontsLoaded || isChecking) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show force update screen if required
  if (forceUpdate && versionInfo) {
    return <ForceUpdateScreen versionInfo={versionInfo} onRetry={checkVersion} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthGuard />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgPrimary },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="payment/callback" options={{ headerShown: false }} />
          <Stack.Screen name="preview" options={{ presentation: 'modal' }} />
        </Stack>
        <Toast config={toastConfig} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
