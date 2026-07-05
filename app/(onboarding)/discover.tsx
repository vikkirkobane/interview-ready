import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useCompleteOnboardingMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
export default function DiscoverScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useOnboardingStore();

  const slideAnim1 = useRef(new Animated.Value(20)).current;
  const slideAnim2 = useRef(new Animated.Value(20)).current;
  const slideAnim3 = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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

  const handleFinish = async () => {
    try {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } });
      await completeOnboardingApi.mutateAsync();
      completeOnboarding();
      router.replace('/(tabs)');
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to finalize profile' });
      completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={[styles.stepLabel, { color: colors.textMuted }]}>Step 5 of 5</Text>
            <Text style={[styles.completeLabel, { color: colors.success }]}>100% Complete</Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.bgMuted }]}>
            <Animated.View style={[
              styles.progressBarFill, 
              { 
                backgroundColor: colors.success,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                }) 
              }
            ]} />
          </View>
        </View>

        {/* Success Message */}
        <Animated.View style={[styles.successSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim1 }] }]}>
          <View style={[styles.successIconWrapper, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark" size={32} color={colors.success} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>You're all set!</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Your profile is optimized and your career journey starts now. Discover your new unfair advantages below.
          </Text>
        </Animated.View>

        {/* Discovery Bento Grid */}
        <Animated.View style={[styles.gridContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim2 }] }]}>
          
          {/* Job Tracker Card */}
          <TouchableOpacity style={[styles.bentoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.8} onPress={handleFinish}>
            <View style={[styles.popularTag, { backgroundColor: `${colors.primary}1A` }]}>
              <Text style={[styles.popularTagText, { color: colors.primary }]}>MOST POPULAR</Text>
            </View>
            <View style={[styles.bentoIconWrapper, { backgroundColor: `${colors.primary}1A` }]}>
              <Ionicons name="briefcase" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Job Tracker</Text>
            <Text style={[styles.bentoDesc, { color: colors.textMuted }]}>
              Manage your pipeline with a specialized CRM built for high-stakes career moves.
            </Text>
            <View style={styles.bentoLink}>
              <Text style={[styles.bentoLinkText, { color: colors.primary }]}>EXPLORE TOOL</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Mock Interviews Card */}
          <TouchableOpacity style={[styles.bentoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.8} onPress={handleFinish}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: `${colors.primary}1A` }]}>
              <Ionicons name="mic" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Mock Interviews</Text>
            <Text style={[styles.bentoDesc, { color: colors.textMuted }]}>
              Practice with AI-driven personas that simulate real industry-specific challenges.
            </Text>
            <View style={styles.bentoLink}>
              <Text style={[styles.bentoLinkText, { color: colors.primary }]}>START SESSION</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* LinkedIn Optimizer Card */}
          <TouchableOpacity style={[styles.bentoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]} activeOpacity={0.8} onPress={handleFinish}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.bgMuted }]}>
              <Ionicons name="logo-linkedin" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>LinkedIn Optimizer</Text>
            <Text style={[styles.bentoDesc, { color: colors.textMuted }]}>
              Analyze your public profile to rank higher in recruiter searches automatically.
            </Text>
            <View style={styles.bentoLink}>
              <Text style={[styles.bentoLinkText, { color: colors.primary }]}>ANALYZE PROFILE</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>

        </Animated.View>

        {/* Call to Action */}
        <Animated.View style={[styles.ctaSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim3 }] }]}>
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]} 
            activeOpacity={0.9}
            onPress={handleFinish}
          >
            <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryBtn, { borderColor: colors.border }]} 
            activeOpacity={0.6}
            onPress={handleFinish}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Maybe later</Text>
          </TouchableOpacity>
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
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 1024,
    alignSelf: 'center',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 600,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepLabel: {
    ...Typography.label,
  },
  completeLabel: {
    ...Typography.label,
  },
  progressBarTrack: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  successSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.displayLg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyLg,
    textAlign: 'center',
    maxWidth: 440,
  },
  gridContainer: {
    width: '100%',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  bentoCard: {
    flex: 1,
    borderWidth: 1,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    ...Shadow.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  popularTag: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  popularTagText: {
    ...Typography.label,
    fontSize: 10,
  },
  bentoIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  bentoTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.xs,
  },
  bentoDesc: {
    ...Typography.bodyMd,
    marginBottom: Spacing.lg,
  },
  bentoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto', 
  },
  bentoLinkText: {
    ...Typography.label,
  },
  ctaSection: {
    width: '100%',
    maxWidth: 384,
    gap: Spacing.md,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.lg, 
  },
  primaryBtnText: {
    ...Typography.headingMd,
    color: '#fff',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderWidth: 1.5,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    ...Typography.headingMd,
  },
});
