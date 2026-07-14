import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, useTheme } from '../src/theme';
import { Button, Input } from '../src/components/ui';
import { supabase } from '../src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

/**
 * Password Reset Screen
 * Handles the deep link from the reset email: interviewready://reset-password?token=...&type=recovery
 * The Supabase email template sends a link with a recovery token/hash.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // Verify the recovery session on mount
  useEffect(() => {
    async function verifySession() {
      try {
        // Supabase sets the session via the deep link hash params automatically
        // when detectSessionInUrl is true. Since we have it false, we check for
        // an existing session that was set by the deep link handler in _layout.tsx
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Try to get session from the URL hash (Supabase sends #access_token=...&type=recovery)
          // The deep link handler should have already processed this
          setError('Invalid or expired reset link. Please request a new one.');
        }
      } catch {
        setError('Failed to verify reset link.');
      } finally {
        setVerifying(false);
      }
    }
    verifySession();
  }, []);

  const handleResetPassword = async () => {
    setError('');

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      setError('Password must contain both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        if (updateError.message.includes('session')) {
          setError('Reset link has expired. Please request a new one from the login screen.');
        } else {
          setError(updateError.message);
        }
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Verifying reset link...
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.bgPrimary }]}>
        <View style={[styles.successIcon, { backgroundColor: `${colors.success}1A` }]}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
          Password Updated!
        </Text>
        <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
          Your password has been successfully reset. You can now sign in with your new password.
        </Text>
        <Button
          title="Go to Sign In"
          onPress={() => router.replace('/(auth)/login')}
          fullWidth
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}1A` }]}>
          <Ionicons name="key" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Set New Password</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Enter your new password below. Make sure it&apos;s at least 8 characters with letters and numbers.
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorLight }]}>
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <Button
            title="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
            fullWidth
          />

          <Pressable
            style={styles.backToLoginButton}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={[styles.backToLoginText, { color: colors.primary }]}>
              Back to Sign In
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Need help?{' '}
            <Pressable onPress={() => router.replace('/(auth)/forgot-password')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Request a new reset link
              </Text>
            </Pressable>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodyMd,
    marginTop: Spacing.md,
  },
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.displayMd,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyLg,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    gap: 4,
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  error: {
    ...Typography.bodySm,
  },
  backToLoginButton: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  backToLoginText: {
    ...Typography.bodySm,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    ...Typography.bodyMd,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
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
});
