import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme } from '../../src/theme';

/**
 * OAuth callback screen — shown while the deep-link code exchange is in progress.
 *
 * Flow:
 *  1. Supabase redirects to interviewready://auth/callback?code=...
 *  2. The Linking listener in _layout.tsx calls exchangeCodeForSession(code)
 *     and then setSession() on the store.
 *  3. This screen watches the store's session field and navigates to /(tabs)
 *     as soon as it's populated.
 *  4. If no session after 8 seconds (network failure, etc.) fall back to welcome.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  // Navigate as soon as the session lands in the store.
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session]);

  // Safety net: if we never get a session, send the user back to welcome.
  useEffect(() => {
    const timer = setTimeout(() => {
      const { session } = useAuthStore.getState();
      if (!session) {
        console.warn('[AuthCallback] Timed out waiting for session — redirecting to welcome.');
        router.replace('/(auth)/welcome');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
