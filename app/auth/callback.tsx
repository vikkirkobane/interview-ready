import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme, Typography, Spacing } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import * as Linking from 'expo-linking';

/**
 * OAuth callback screen — shown while the deep-link code exchange is in progress.
 *
 * Flow:
 *  1. Supabase redirects to interviewready://auth/callback?code=...
 *  2. The Linking listener in _layout.tsx calls exchangeCodeForSession(code)
 *  3. Supabase's onAuthStateChange fires and sets session in auth-store
 *  4. This screen watches the store's session field and navigates to /(tabs)
 *     as soon as it's populated.
 *  5. SAFETY NET: If session is still null after 3s, this screen tries to
 *     exchange the code itself (handles the race where _layout.tsx handler
 *     hasn't run yet).
 *  6. Final fallback: 20s timeout → back to welcome.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  // Navigate as soon as the session lands in the store.
  useEffect(() => {
    if (session) {
      console.log('[AuthCallback] Session detected, navigating to tabs');
      router.replace('/(tabs)');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Safety net: if no session after 3 seconds, try to exchange the code ourselves.
  // This handles the race where _layout.tsx deep link handler hasn't finished yet.
  useEffect(() => {
    const safetyTimer = setTimeout(async () => {
      const { session: currentSession } = useAuthStore.getState();
      if (currentSession) return; // Already have a session

      console.log('[AuthCallback] No session after 3s — attempting code exchange...');
      try {
        const url = await Linking.getInitialURL();
        if (url && url.includes('auth/callback')) {
          const parsedUrl = new URL(url);
          const code = parsedUrl.searchParams.get('code');
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.warn('[AuthCallback] Safety exchange failed:', error.message);
            } else if (data?.session) {
              console.log('[AuthCallback] Safety exchange succeeded, setting session');
              useAuthStore.getState().setSession(data.session);
            }
          }
        }
      } catch (err) {
        console.warn('[AuthCallback] Safety net exchange error:', err);
      }
    }, 3000);

    return () => clearTimeout(safetyTimer);
  }, []);

  // Final fallback: if we never get a session after 20s, send back to welcome.
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      const { session: currentSession } = useAuthStore.getState();
      if (!currentSession) {
        console.warn('[AuthCallback] Timed out after 20s — redirecting to welcome.');
        router.replace('/(auth)/welcome');
      }
    }, 20000);
    return () => clearTimeout(fallbackTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary, marginTop: Spacing.md }]}>
        Signing you in...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...Typography.bodyMd,
  },
});
