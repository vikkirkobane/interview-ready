import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useURL } from 'expo-linking';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme } from '../../src/theme';

/**
 * OAuth callback screen.
 *
 * When the user completes Google/LinkedIn sign-in, the browser redirects to
 * interviewready://auth/callback?code=...&state=...
 *
 * expo-router opens this screen. We exchange the code for a session, update
 * the auth store, then navigate to the main app.
 */
export default function AuthCallbackScreen() {
  const url = useURL();
  const router = useRouter();
  const { colors } = useTheme();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (!url) return;

    async function handleCallback() {
      try {
        // supabase-js v2 — exchange the PKCE code in the URL for a session
        const { data, error } = await (supabase.auth as any).getSessionFromUrl(url);

        if (error) {
          console.error('[AuthCallback] getSessionFromUrl error:', error.message);
          // Fall back to whatever session is already stored
          const { data: { session } } = await supabase.auth.getSession();
          if (session) setSession(session);
        } else if (data?.session) {
          setSession(data.session);
        } else {
          // No code in URL — session may have already been set by onAuthStateChange
          const { data: { session } } = await supabase.auth.getSession();
          if (session) setSession(session);
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
      } finally {
        // Always redirect home — AuthGuard in _layout.tsx will handle
        // sending unauthenticated users back to welcome if needed.
        router.replace('/(tabs)');
      }
    }

    handleCallback();
  }, [url]);

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
