import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme, Typography, Spacing } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import { exchangeAuthCodeSafely } from '../../src/lib/auth-code-exchange';

/**
 * OAuth callback screen — shown while the deep-link code exchange is in progress.
 *
 * Flow:
 *  1. Supabase redirects to interviewready://auth/callback?code=... (or web URL)
 *  2. The Linking listener in _layout.tsx (native) or web effect calls
 *     exchangeCodeForSession(code).
 *  3. Supabase's onAuthStateChange fires and sets session in auth-store.
 *  4. This screen watches the session field and navigates once it's populated.
 *  5. Final fallback: 15s timeout → back to welcome (covers genuine failures).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);

  // On Web, exchange code or retrieve session directly from URL
  useEffect(() => {
    async function handleWebCallback() {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          try {
            await exchangeAuthCodeSafely(code);
          } catch (err) {
            console.warn('[AuthCallback Web] Error exchanging code:', err);
          }
        }
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          useAuthStore.setState({ session: currentSession, user: currentSession.user });
        }
      }
    }
    handleWebCallback();
  }, []);

  // Navigate as soon as the session lands in the store.
  useEffect(() => {
    if (session) {
      console.log('[AuthCallback] Session detected, checking onboarding status...');
      const isCompleted = session.user?.user_metadata?.onboarding_completed;
      if (isCompleted) {
        console.log('[AuthCallback] Onboarding complete — navigating to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('[AuthCallback] Onboarding incomplete — navigating to onboarding');
        router.replace('/(onboarding)/referral-code' as any);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Final fallback: if _layout.tsx never delivers a session after 15s,
  // send the user back to welcome so they are not stuck on the spinner.
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      const { session: currentSession } = useAuthStore.getState();
      if (!currentSession) {
        console.warn('[AuthCallback] Timed out after 15s — redirecting to welcome.');
        router.replace('/(auth)/welcome');
      }
    }, 15000);
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

