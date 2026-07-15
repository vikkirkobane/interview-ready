import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/query-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../src/components/ui';
import { useAuthStore } from '../src/stores/auth-store';
import { useTheme } from '../src/theme';
import * as Font from 'expo-font';
import * as Linking from 'expo-linking';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotificationStore } from '../src/stores/notification-store';
import { useAppVersion } from '../src/hooks/useAppVersion';
import { ForceUpdateScreen } from '../src/components/features/ForceUpdateScreen';
import { supabase } from '../src/lib/supabase';
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
// Module-level flag to prevent AuthGuard from redirecting away while
// an OAuth callback deep link is being processed. This fixes the race
// condition where AuthGuard fires before getInitialURL() resolves.
let pendingAuthCallback = false;

/**
 * Auth guard: watches session state and redirects to the correct route.
 * - No session → /(auth)/welcome (unless an OAuth callback is pending)
 * - Session + in auth flow → /(tabs) (auto-redirect after login)
 * - Session already in tabs → stay put
 */
function AuthGuard() {
  const { session, initialized } = useAuthStore();
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
    if (pendingAuthCallback) {
      console.log('[AuthGuard] Pending auth callback — skipping redirect');
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, initialized, segments]);

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
    initialize();
    mobileAds().initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle OAuth deep links (interviewready://auth/callback?code=...)
  // This fires when the app is opened via the OAuth redirect URI.
  useEffect(() => {
    async function handleDeepLink(url: string) {
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

      // Only handle auth callbacks
      if (!url.includes('auth/callback')) return;

      // Mark that we're processing an auth callback — prevents AuthGuard
      // from redirecting to welcome while we exchange the code
      pendingAuthCallback = true;

      try {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');
        const error = parsedUrl.searchParams.get('error');
        const errorDescription = parsedUrl.searchParams.get('error_description');

        // Handle OAuth errors from provider
        if (error) {
          console.error('[DeepLink] OAuth error:', error, errorDescription);
          pendingAuthCallback = false;
          Toast.show({
            type: 'error',
            text1: 'Authentication failed',
            text2: errorDescription || error,
          });
          return;
        }

        if (code) {
          console.log('[DeepLink] Exchanging code for session...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[DeepLink] exchangeCodeForSession error:', exchangeError.message);
            pendingAuthCallback = false;
            return;
          }

          // Explicitly set session in store for immediate response
          // onAuthStateChange will also fire, but this ensures no gap
          if (data?.session) {
            console.log('[DeepLink] Session obtained, setting in auth store');
            useAuthStore.getState().setSession(data.session);
          }

          console.log('[DeepLink] Code exchanged successfully');
          pendingAuthCallback = false;
          return;
        }

        console.warn('[DeepLink] No code found in callback URL');
        pendingAuthCallback = false;
      } catch (err) {
        console.error('[DeepLink] Unexpected error:', err);
        pendingAuthCallback = false;
      }
    }

    // Handle link that launched the app from cold start
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Handling initial URL:', url);
        handleDeepLink(url);
      }
    }).catch((err) => {
      console.error('[DeepLink] getInitialURL error:', err);
      pendingAuthCallback = false;
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
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="payment" />
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
