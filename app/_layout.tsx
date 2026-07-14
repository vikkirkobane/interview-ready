import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    // Show the actual UI toast
    originalToastShow(params);

    // Filter and add to notification store
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

/**
 * Auth guard: watches session state and redirects to the correct route.
 * - No session → /(auth)/welcome
 * - Session + in auth flow → /(tabs) (auto-redirect after login)
 * - Session already in tabs → stay put
 */
function AuthGuard() {
  const { session, initialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    // Expo Router may return segments with or without parens around group names
    // depending on SDK version. Normalise by checking both forms.
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
      // Only handle auth callbacks
      if (!url.includes('auth/callback')) return;

      try {
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');
        const error = parsedUrl.searchParams.get('error');
        const errorDescription = parsedUrl.searchParams.get('error_description');

        // Handle OAuth errors from provider
        if (error) {
          console.error('[DeepLink] OAuth error:', error, errorDescription);
          Toast.show({
            type: 'error',
            text1: 'Authentication failed',
            text2: errorDescription || error,
          });
          return;
        }

        if (code) {
          // Exchange code for session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('[DeepLink] exchangeCodeForSession error:', exchangeError.message);
            return;
          }
          
          // Session will be set by onAuthStateChange in auth-store
          // The auth/callback screen will handle navigation
          console.log('[DeepLink] Code exchanged successfully, session will be set by onAuthStateChange');
          return;
        }

        console.warn('[DeepLink] No code found in callback URL');
      } catch (err) {
        console.error('[DeepLink] Unexpected error:', err);
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
