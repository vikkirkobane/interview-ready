import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/auth-store';
import { Colors } from '../src/theme';
import LandingPage from '../src/components/landing/LandingPage';
import { supabase } from '../src/lib/supabase';
import { exchangeAuthCodeSafely } from '../src/lib/auth-code-exchange';

/**
 * Root index — Displays the marketing landing page for unauthenticated visitors.
 * Automatically redirects authenticated users to the home screen (/(tabs))
 * or onboarding, and handles any OAuth callback params landing on the root domain.
 */
export default function Index() {
  const { initialized, loading, session } = useAuthStore();
  const router = useRouter();

  // On Web, check if OAuth returned to the root URL (?code=... or #access_token=...)
  useEffect(() => {
    async function checkRootAuthParams() {
      if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).location) {
        const loc = (globalThis as any).location;
        const hash = loc.hash ? loc.hash.substring(1) : '';
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(loc.search || '');

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          try {
            const { data } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (data?.session) {
              useAuthStore.setState({ session: data.session, user: data.session.user });
            }
          } catch (err) {
            console.warn('[Root Web Auth] Error setting session from hash:', err);
          }
        }

        const code = searchParams.get('code');
        if (code) {
          try {
            await exchangeAuthCodeSafely(code);
          } catch (err) {
            console.warn('[Root Web Auth] Error exchanging code:', err);
          }
        }
      }
    }
    checkRootAuthParams();
  }, []);

  useEffect(() => {
    if (initialized && !loading && session) {
      const isCompleted = session.user?.user_metadata?.onboarding_completed;
      if (isCompleted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/referral-code' as any);
      }
    }
  }, [initialized, loading, session, router]);

  if (!initialized || loading || session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.violet} />
      </View>
    );
  }

  return <LandingPage />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgPrimary,
  },
});
