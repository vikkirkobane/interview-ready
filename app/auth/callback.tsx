import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useTheme, Typography, Spacing } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import { exchangeAuthCodeSafely } from '../../src/lib/auth-code-exchange';
import { triggerWelcomeEmail } from '../../src/lib/emailNotificationService';
import { syncUserToAirtable } from '../../src/lib/airtableService';

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

  // On Web, exchange code or retrieve session directly from URL (hash or query params)
  useEffect(() => {
    async function handleWebCallback() {
      if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).location) {
        const loc = (globalThis as any).location;
        const hash = loc.hash ? loc.hash.substring(1) : '';
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(loc.search || '');

        // 1. Check for token_hash first (?token_hash=...&type=signup)
        const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
        const type = (searchParams.get('type') || hashParams.get('type') || 'signup') as any;
        if (tokenHash) {
          try {
            const { data, error: verifyErr } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type,
            });
            if (data?.session) {
              useAuthStore.setState({ session: data.session, user: data.session.user });
              return;
            }
            if (verifyErr) {
              console.warn('[AuthCallback Web] Error verifying OTP token_hash:', verifyErr);
              router.replace({ 
                pathname: '/(auth)/login', 
                params: { 
                  info: 'Your email address has been verified. Please sign in with your password.' 
                } 
              } as any);
              return;
            }
          } catch (err) {
            console.warn('[AuthCallback Web] Exception verifying OTP:', err);
          }
        }

        // 2. Check for Auth Error in URL (e.g. expired link)
        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
        const errorDesc = hashParams.get('error_description') || searchParams.get('error_description') || hashParams.get('error') || searchParams.get('error');
        if (errorDesc) {
          console.warn('[AuthCallback Web] Error from Auth server:', errorDesc);
          if (errorCode === 'otp_expired' || errorDesc.toLowerCase().includes('expired') || errorDesc.toLowerCase().includes('invalid')) {
            router.replace({ 
              pathname: '/(auth)/login', 
              params: { 
                info: 'Your email address is verified! Please sign in with your password to access your account.' 
              } 
            } as any);
          } else {
            router.replace({ pathname: '/(auth)/login', params: { error: errorDesc } } as any);
          }
          return;
        }

        // 2. Check for hash tokens (#access_token=...&refresh_token=...)
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
              return;
            }
          } catch (err) {
            console.warn('[AuthCallback Web] Error setting session from hash:', err);
          }
        }

        // 3. Check for PKCE search code (?code=...)
        const code = searchParams.get('code');
        if (code) {
          try {
            await exchangeAuthCodeSafely(code);
          } catch (err) {
            console.warn('[AuthCallback Web] Error exchanging code:', err);
          }
        }

        // 4. Check for token_hash (?token_hash=...&type=signup)
        const tokenHash = searchParams.get('token_hash');
        const type = (searchParams.get('type') || 'signup') as any;
        if (tokenHash) {
          try {
            const { data } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type,
            });
            if (data?.session) {
              useAuthStore.setState({ session: data.session, user: data.session.user });
              return;
            }
          } catch (err) {
            console.warn('[AuthCallback Web] Error verifying OTP:', err);
          }
        }

        // 5. Final fallback: check current active session
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
      const email = session.user?.email;
      const name = session.user?.user_metadata?.full_name || session.user?.user_metadata?.first_name;
      if (email) {
        syncUserToAirtable({ email, name, status: 'Confirmed' }).catch(() => {});
        triggerWelcomeEmail(email, name).catch(() => {});
      }

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

