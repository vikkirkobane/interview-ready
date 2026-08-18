import { Pressable, View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, useTheme } from '../../src/theme';
import { Button, Input } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signUp, loading, session, signInWithGoogleIdToken, signInWithLinkedInIdToken } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleSignup = async () => {
    setError('');
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const { error: authError } = await signUp(trimmedEmail, password);
    if (authError) {
      setError(authError);
    } else {
      // If email confirmation is required, no session is returned yet — the
      // user must verify their email before signing in.
      const hasSession = !!useAuthStore.getState().session;
      if (hasSession) {
        router.replace('/(onboarding)/referral-code' as any);
      } else {
        setError('Account created. Check your email to confirm your account, then sign in.');
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
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Create your account</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Start landing interviews in minutes</Text>

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
            placeholder='At least 8 characters'
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete='new-password'
            autoCapitalize='none'
            autoCorrect={false}
            hint='Must be at least 8 characters, with letters and numbers'
            rightIcon={
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Text style={{ color: colors.textMuted, ...Typography.label }}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            }
          />
          <Input
            label='Confirm Password'
            placeholder='Re-enter password'
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoComplete='new-password'
            autoCapitalize='none'
            autoCorrect={false}
            rightIcon={
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                <Text style={{ color: colors.textMuted, ...Typography.label }}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            }
          />

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          <Button
            title='Create Account'
            onPress={handleSignup}
            loading={loading}
            fullWidth
          />
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
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>Already have an account?{' '}
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </Text>
          </Pressable>
          <Text style={[styles.termsText, { color: colors.textMuted }]}>By creating an account, you agree to our Terms of Service and Privacy Policy.</Text>
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
  },
  form: {
    gap: 4,
  },
  error: {
    ...Typography.bodySm,
    marginBottom: Spacing.sm,
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
    gap: Spacing.md,
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
  },
});
