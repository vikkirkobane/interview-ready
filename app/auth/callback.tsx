import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme } from '../../src/theme';

/**
 * OAuth callback screen for the deep link interviewready://auth/callback.
 *
 * The (auth) route group strips "auth" from its URL path, so it cannot match
 * this deep link. This non-grouped route at app/auth/callback.tsx resolves
 * to the path /auth/callback and correctly receives the OAuth redirect.
 *
 * The root _layout.tsx handles exchangeCodeForSession via its Linking listener.
 * This screen just waits for the session to be set then navigates home.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session]);

  // Fallback: if no session after 5 seconds, go to welcome
  useEffect(() => {
    const timer = setTimeout(() => {
      const { session } = useAuthStore.getState();
      if (!session) {
        router.replace('/(auth)/welcome');
      }
    }, 5000);
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
