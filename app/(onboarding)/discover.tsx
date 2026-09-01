import { useState, useEffect } from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  useWindowDimensions,
} from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useCompleteOnboardingMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';

interface DiscoverCardItem {
  id: string;
  title: string;
  desc: string;
  linkText: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: string | null;
  accessibilityLabel: string;
}

const DISCOVER_ITEMS: DiscoverCardItem[] = [
  {
    id: 'tracker',
    title: 'Job Tracker',
    desc: 'Manage your pipeline with a specialized CRM built for high-stakes career moves.',
    linkText: 'EXPLORE TOOL',
    icon: 'briefcase',
    route: '/(tabs)/tracker',
    badge: 'MOST POPULAR',
    accessibilityLabel: 'Explore Job Tracker',
  },
  {
    id: 'interviews',
    title: 'Mock Interviews',
    desc: 'Practice with AI-driven personas that simulate real industry-specific challenges.',
    linkText: 'START SESSION',
    icon: 'mic',
    route: '/(tabs)/interviews',
    accessibilityLabel: 'Start Mock Interviews',
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Optimizer',
    desc: 'Analyze your public profile to rank higher in recruiter searches automatically.',
    linkText: 'ANALYZE PROFILE',
    icon: 'logo-linkedin',
    route: '/(tabs)/linkedin',
    accessibilityLabel: 'Analyze LinkedIn Profile',
  },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useOnboardingStore();
  const { width, height } = useWindowDimensions();

  // Responsive breakpoints
  const isNarrow = width < 380;       // Ultra-compact phones (iPhone SE, Galaxy Fold outer, <380px)
  const isTablet = width >= 768;      // Tablets and Desktop viewports
  const isShort = height < 700;       // Short vertical viewport (compact devices)

  const [slideAnim1] = useState(() => new Animated.Value(20));
  const [slideAnim2] = useState(() => new Animated.Value(20));
  const [slideAnim3] = useState(() => new Animated.Value(20));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [progressAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(slideAnim1, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(slideAnim2, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim3, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeOnboardingApi = useCompleteOnboardingMutation();

  const handleFinish = async (destinationRoute: string = '/(tabs)') => {
    try {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } });
      await completeOnboardingApi.mutateAsync();
      completeOnboarding();
      router.replace(destinationRoute as any);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to finalize profile' });
      completeOnboarding();
      router.replace(destinationRoute as any);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isNarrow ? 12 : (isTablet ? Spacing.lg : Spacing.md),
            paddingTop: isShort ? Spacing.xs : Spacing.sm,
            paddingBottom: Math.max(insets.bottom, 16) + (isShort ? 16 : (isNarrow ? 24 : 36)),
          },
        ]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* Progress Indicator */}
        <View
          style={[
            styles.progressContainer,
            {
              marginTop: isShort ? Spacing.sm : (isNarrow ? Spacing.md : Spacing.lg),
              marginBottom: isShort ? Spacing.sm : (isNarrow ? Spacing.md : Spacing.lg),
            },
          ]}
        >
          <View style={styles.progressTextRow}>
            <Text style={[styles.stepLabel, { color: colors.textMuted, fontSize: isNarrow ? 10 : 11 }]}>
              Step 5 of 5
            </Text>
            <Text style={[styles.completeLabel, { color: colors.success, fontSize: isNarrow ? 10 : 11 }]}>
              100% Complete
            </Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.bgMuted, height: isNarrow ? 6 : 8 }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.success,
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Success Message */}
        <Animated.View
          style={[
            styles.successSection,
            {
              marginBottom: isShort ? Spacing.sm : (isNarrow ? Spacing.md : Spacing.lg),
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim1 }],
            },
          ]}
        >
          <View
            style={[
              styles.successIconWrapper,
              {
                backgroundColor: colors.successLight,
                width: isNarrow ? 48 : (isShort ? 50 : 58),
                height: isNarrow ? 48 : (isShort ? 50 : 58),
                borderRadius: isNarrow ? 24 : (isShort ? 25 : 29),
                marginBottom: isNarrow ? Spacing.xs : Spacing.sm,
              },
            ]}
          >
            <Ionicons name="checkmark" size={isNarrow ? 24 : 28} color={colors.success} />
          </View>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: isNarrow ? 21 : (isTablet ? 30 : 25),
                lineHeight: isNarrow ? 27 : (isTablet ? 36 : 31),
                marginBottom: isNarrow ? 4 : 6,
              },
            ]}
          >
            You're all set!
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textMuted,
                fontSize: isNarrow ? 12.5 : 14.5,
                lineHeight: isNarrow ? 17.5 : 21,
                maxWidth: isNarrow ? 300 : 460,
                paddingHorizontal: isNarrow ? 4 : 0,
              },
            ]}
          >
            Your profile is optimized and your career journey starts now. Discover your new unfair advantages below.
          </Text>
        </Animated.View>

        {/* Discovery Bento Grid */}
        <Animated.View
          style={[
            styles.gridContainer,
            {
              flexDirection: isTablet ? 'row' : 'column',
              gap: isNarrow ? 10 : 12,
              marginBottom: isShort ? Spacing.md : (isNarrow ? Spacing.lg : Spacing.xl),
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim2 }],
            },
          ]}
        >
          {DISCOVER_ITEMS.map((item) => {
            const iconBg = item.id === 'linkedin' ? colors.bgMuted : `${colors.primary}18`;

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.bentoCard,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                    padding: isNarrow ? 12 : (isTablet ? 18 : 15),
                    borderRadius: isNarrow ? Radius.lg : Radius.xl,
                    flex: isTablet ? 1 : undefined,
                    width: isTablet ? undefined : '100%',
                  },
                  Platform.OS === 'web' && { cursor: 'pointer' },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => handleFinish(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.accessibilityLabel}
              >
                {/* Header Row with Icon and optional Badge */}
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.bentoIconWrapper,
                      {
                        backgroundColor: iconBg,
                        width: isNarrow ? 38 : 44,
                        height: isNarrow ? 38 : 44,
                        borderRadius: Radius.md,
                      },
                    ]}
                  >
                    <Ionicons name={item.icon} size={isNarrow ? 20 : 23} color={colors.primary} />
                  </View>

                  {item.badge ? (
                    <View style={[styles.popularTag, { backgroundColor: `${colors.primary}18` }]}>
                      <Text
                        style={[
                          styles.popularTagText,
                          {
                            color: colors.primary,
                            fontSize: isNarrow ? 9 : 10,
                          },
                        ]}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.headerSpacer} />
                  )}
                </View>

                {/* Card Text Content */}
                <Text
                  style={[
                    styles.bentoTitle,
                    {
                      color: colors.textPrimary,
                      fontSize: isNarrow ? 16 : 18,
                      lineHeight: isNarrow ? 21 : 24,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <Text
                  style={[
                    styles.bentoDesc,
                    {
                      color: colors.textMuted,
                      fontSize: isNarrow ? 12 : 13.5,
                      lineHeight: isNarrow ? 16.5 : 19.5,
                      marginBottom: isNarrow ? 8 : 12,
                    },
                  ]}
                  numberOfLines={3}
                >
                  {item.desc}
                </Text>

                {/* Card Link Footer */}
                <View style={styles.bentoLink}>
                  <Text
                    style={[
                      styles.bentoLinkText,
                      {
                        color: colors.primary,
                        fontSize: isNarrow ? 10.5 : 11.5,
                      },
                    ]}
                  >
                    {item.linkText}
                  </Text>
                  <Ionicons name="arrow-forward" size={isNarrow ? 13 : 14} color={colors.primary} />
                </View>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Call to Action */}
        <Animated.View
          style={[
            styles.ctaSection,
            {
              gap: isNarrow ? 8 : 10,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim3 }],
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                paddingVertical: isNarrow ? 12 : 14,
                paddingHorizontal: isNarrow ? 16 : 24,
              },
              Platform.OS === 'web' && { cursor: 'pointer' },
              pressed && styles.btnPressed,
            ]}
            onPress={() => handleFinish('/(tabs)')}
            accessibilityRole="button"
            accessibilityLabel="Go to Dashboard"
          >
            <Text
              style={[
                styles.primaryBtnText,
                { fontSize: isNarrow ? 14.5 : 16 },
              ]}
            >
              Go to Dashboard
            </Text>
            <Ionicons name="arrow-forward" size={isNarrow ? 17 : 19} color="#fff" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                borderColor: colors.border,
                paddingVertical: isNarrow ? 11 : 13,
                paddingHorizontal: isNarrow ? 16 : 24,
              },
              Platform.OS === 'web' && { cursor: 'pointer' },
              pressed && styles.btnPressed,
            ]}
            onPress={() => handleFinish('/(tabs)')}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
          >
            <Text
              style={[
                styles.secondaryBtnText,
                {
                  color: colors.textMuted,
                  fontSize: isNarrow ? 13.5 : 14.5,
                },
              ]}
            >
              Maybe later
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 540,
    gap: 6,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  stepLabel: {
    ...Typography.label,
  },
  completeLabel: {
    ...Typography.label,
  },
  progressBarTrack: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  successSection: {
    alignItems: 'center',
    width: '100%',
  },
  successIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
  },
  gridContainer: {
    width: '100%',
  },
  bentoCard: {
    borderWidth: 1,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerSpacer: {
    height: 1,
  },
  popularTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  popularTagText: {
    ...Typography.label,
    fontWeight: '700',
  },
  bentoIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  bentoTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  bentoDesc: {
    fontWeight: '400',
  },
  bentoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 4,
  },
  bentoLinkText: {
    ...Typography.label,
    fontWeight: '700',
  },
  ctaSection: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadow.lg,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

