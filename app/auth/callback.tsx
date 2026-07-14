import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme , Typography, Spacing } from '../../src/theme';


/**
 * OAuth callback screen — shown while the deep-link code exchange is in progress.
 *
 * Flow:
 *  1. Supabase redirects to interviewready://auth/callback?code=...
 *  2. The Linking listener in _layout.tsx calls exchangeCodeForSession(code)
 *  3. Supabase's onAuthStateChange fires and sets session in auth-store
 *  4. This screen watches the store's session field and navigates to /(tabs)
 *     as soon as it's populated.
 *  5. If no session after 15 seconds (network failure, etc.) fall back to welcome.
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

  // Safety net: if we never get a session, send the user back to welcome.
  useEffect(() => {
    const timer = setTimeout(() => {
      const { session } = useAuthStore.getState();
      if (!session) {
        console.warn('[AuthCallback] Timed out waiting for session — redirecting to welcome.');
        router.replace('/(auth)/welcome');
      }
    }, 15000); // Increased to 15s for network delays
    return () => clearTimeout(timer);
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
