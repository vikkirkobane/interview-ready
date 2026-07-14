import { Pressable ,
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import React, { useEffect, useState } from 'react';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Image } from 'expo-image';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithOAuth, session } = useAuthStore();
  const { colors, isDark } = useTheme();
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'linkedin_oidc' | null>(null);

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(20));

  // If the session lands while we're still on this screen (e.g. onAuthStateChange
  // fires after the browser closes), navigate to tabs immediately.
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      })
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleAuth = async () => {
    setLoadingProvider('google');
    const { error } = await signInWithOAuth('google');
    // Only clear the loading state on explicit cancellation or error.
    // On success, the auth/callback screen will handle navigation.
    if (error) {
      setLoadingProvider(null);
      if (error !== 'Authentication canceled.') {
        Toast.show({ type: 'error', text1: 'Sign in failed', text2: error });
      }
    }
    // If no error, keep loading spinner visible - callback screen will handle the rest
  };

  const handleLinkedInAuth = async () => {
    setLoadingProvider('linkedin_oidc');
    const { error } = await signInWithOAuth('linkedin_oidc');
    // Only clear the loading state on explicit cancellation or error.
    // On success, the auth/callback screen will handle navigation.
    if (error) {
      setLoadingProvider(null);
      if (error !== 'Authentication canceled.') {
        Toast.show({ type: 'error', text1: 'Sign in failed', text2: error });
      }
    }
    // If no error, keep loading spinner visible - callback screen will handle the rest
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgPrimary }]}>
      {/* Premium Background Aura */}
      <View style={styles.auraContainer} pointerEvents="none">
        <View style={[styles.auraTopRight, { backgroundColor: colors.primary, opacity: isDark ? 0.15 : 0.08 }]} />
        <View style={[styles.auraBottomLeft, { backgroundColor: colors.tertiary, opacity: isDark ? 0.15 : 0.08 }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.heroSection, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Brand Anchor */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={{ width: 48, height: 48 }} 
              resizeMode="contain" 
            />
          </View>

          {/* App name and tagline */}
          <Text style={[styles.appName, { color: colors.textPrimary }]}>Interview Ready</Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>Paste a job. Land the interview.</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.authSection, 
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Google Auth */}
          <Pressable
            style={[styles.socialButton, { backgroundColor: colors.bgSecondary, borderColor: colors.borderGlass, opacity: loadingProvider ? 0.6 : 1 }]}
            onPress={handleGoogleAuth}
            
            disabled={!!loadingProvider}
          >
            <Ionicons name="logo-google" size={24} color={colors.textPrimary} />
            <Text style={[styles.socialButtonText, { color: colors.textPrimary }]}>
              {loadingProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </Pressable>

          {/* LinkedIn Auth */}
          <Pressable
            style={[styles.socialButton, styles.linkedInButton, { opacity: loadingProvider ? 0.6 : 1 }]}
            onPress={handleLinkedInAuth}
            
            disabled={!!loadingProvider}
          >
            <Ionicons name="logo-linkedin" size={24} color={colors.textInverse} />
            <Text style={[styles.socialButtonText, styles.linkedInText, { color: colors.textInverse }]}>
              {loadingProvider === 'linkedin_oidc' ? 'Signing in...' : 'Continue with LinkedIn'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textDisabled }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Email Sign Up */}
          <Button
            title="Sign up with Email"
            onPress={() => router.push('/(auth)/signup')}
            variant="secondary"
            fullWidth
          />
        </Animated.View>

        {/* Footer */}
        <Animated.View 
          style={[
            styles.footer, 
            { paddingBottom: insets.bottom + 16, opacity: fadeAnim }
          ]}
        >
          <Pressable onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Already have an account?{' '}
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </Text>
          </Pressable>

          <Text style={[styles.termsText, { color: colors.textDisabled }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  auraContainer: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  auraTopRight: {
    position: 'absolute',
    top: '-10%',
    right: '-20%',
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  auraBottomLeft: {
    position: 'absolute',
    bottom: '-5%',
    left: '-20%',
    width: 500,
    height: 500,
    borderRadius: 250,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    zIndex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    marginBottom: Spacing.xl,
    padding: Spacing.xs,
  },
  appName: {
    ...Typography.displayLg,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  tagline: {
    ...Typography.bodyLg,
    textAlign: 'center',
  },
  authSection: {
    gap: 16,
    marginBottom: Spacing.xl,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.full,
    height: 56,
    gap: 12,
    ...Shadow.card,
  },
  socialButtonText: {
    ...Typography.bodyLg,
    fontWeight: '600',
  },
  linkedInButton: {
    backgroundColor: '#0A66C2',
    borderColor: '#0A66C2',
  },
  linkedInText: {
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.bodySm,
    marginHorizontal: Spacing.md,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: Spacing.md,
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
