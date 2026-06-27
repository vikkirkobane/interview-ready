import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, useTheme } from '../../src/theme';
import { Button, Input } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'interviewready://reset-password',
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
        Alert.alert(
          'Check your email',
          'We sent you a password reset link. Please check your inbox and follow the instructions.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}1A` }]}>
          <Ionicons name="lock-closed" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Forgot Password?</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          No worries! Enter your email address and we'll send you a link to reset your password.
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!success}
          />

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          {success ? (
            <View style={[styles.successContainer, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.successText, { color: colors.success }]}>
                ✓ Password reset email sent! Check your inbox.
              </Text>
            </View>
          ) : null}

          <Button
            title={success ? 'Resend Email' : 'Send Reset Link'}
            onPress={handleResetPassword}
            loading={loading}
            fullWidth
            disabled={success}
          />

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backToLoginText, { color: colors.primary }]}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Remember your password?{' '}
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
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
  error: {
    ...Typography.bodySm,
    marginBottom: Spacing.sm,
  },
  successContainer: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  successText: {
    ...Typography.bodySm,
    textAlign: 'center',
  },
  backToLoginButton: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  backToLoginText: {
    ...Typography.bodySm,
    fontWeight: '600',
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
