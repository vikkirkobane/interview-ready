import { Pressable, View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';
import { Button, Input } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, loading, session, signInWithGoogleIdToken, signInWithLinkedInIdToken } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Route as soon as a session lands — covers OAuth flows (LinkedIn/Google)
  // where the session is delivered asynchronously via deep-link callback.
  useEffect(() => {
    if (session) {
      const isCompleted = session.user?.user_metadata?.onboarding_completed;
      if (isCompleted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/referral-code' as any);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleLogin = async () => {
    setError('');
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const { error: authError } = await signIn(trimmedEmail, password);
    if (authError) {
      setError(authError);
    } else {
      const isCompleted = useAuthStore.getState().user?.user_metadata?.onboarding_completed;
      if (isCompleted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/referral-code' as any);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error: authError } = await signInWithGoogleIdToken();
    if (authError) {
      setError(authError);
    } else {
      const isCompleted = useAuthStore.getState().user?.user_metadata?.onboarding_completed;
      if (isCompleted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/referral-code' as any);
      }
    }
  };

  const handleLinkedInSignIn = async () => {
    setError('');
    const { error: authError } = await signInWithLinkedInIdToken();
    if (authError && !authError.toLowerCase().includes('cancel')) {
      setError(authError);
    }
    // Routing is handled by the session-watcher effect above (OAuth delivers
    // the session asynchronously, either inline on iOS or via deep link on Android).
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps='handled'
      >
        {/* Header */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to continue your job search</Text>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label='Email'
            placeholder='you@example.com'
            value={email}
            onChangeText={setEmail}
            autoCapitalize='none'
            autoCorrect={false}
            keyboardType='email-address'
            autoComplete='email'
          />
          <Input
            label='Password'
            placeholder='Enter your password'
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete='password'
            autoCapitalize='none'
            autoCorrect={false}
            rightIcon={
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Text style={{ color: colors.textMuted, ...Typography.label }}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            }
          />

          {error ? <Text style={[{ color: colors.error }]}>{error}</Text> : null}

          <Button
            title='Sign In'
            onPress={handleLogin}
            loading={loading}
            fullWidth
          />

          <Pressable 
            style={styles.forgotButton}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>Or continue with</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Social Login Buttons */}
        <View style={styles.socialButtons}>
          <Button
            title='Continue with Google'
            onPress={handleGoogleSignIn}
            loading={loading}
            fullWidth
            icon={
              <Ionicons name='logo-google' size={24} color={colors.textPrimary} />
            }
          />

          <Button
            title='Continue with LinkedIn'
            onPress={handleLinkedInSignIn}
            loading={loading}
            fullWidth
            icon={
              <Ionicons name='logo-linkedin' size={24} color={colors.textPrimary} />
            }
          />
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Don&apos;t have an account?{' '}
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
            </Text>
          </Pressable>
          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            By signing in, you agree to our{' '}
            <Text
              style={[styles.footerLink, { color: colors.primary }]}
              onPress={() => Linking.openURL('https://appinterviewready.top/terms')}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={[styles.footerLink, { color: colors.primary }]}
              onPress={() => Linking.openURL('https://appinterviewready.top/privacy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.displayMd,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLg,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  forgotText: {
    ...Typography.bodySm,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.label,
    paddingHorizontal: Spacing.md,
  },
  socialButtons: {
    gap: 12,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  footerText: {
    ...Typography.bodySm,
  },
  footerLink: {
    fontWeight: '600',
  },
  termsText: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
