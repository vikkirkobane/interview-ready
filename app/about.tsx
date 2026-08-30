import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../src/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const coreFeatures = [
    {
      title: 'AI Mock Interview Coach',
      description: 'Practice dynamic, realistic interview simulations with real-time feedback on your answers, clarity, and depth.',
      icon: 'mic-outline',
    },
    {
      title: 'ATS Resume Tailoring',
      description: 'Analyze your resume against real job descriptions to highlight missing keywords and pass Applicant Tracking Systems.',
      icon: 'document-text-outline',
    },
    {
      title: 'Cover Letter Studio',
      description: 'Generate compelling, personalized cover letters aligned specifically with company culture and role requirements.',
      icon: 'mail-outline',
    },
    {
      title: 'Application Tracker',
      description: 'Organize your job search pipeline, schedule follow-ups, and track interview stages in one unified workspace.',
      icon: 'briefcase-outline',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.md, borderBottomColor: colors.border }]}>
        <Pressable 
          style={[styles.backButton, { backgroundColor: `${colors.primary}15` }]} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>About Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        {/* Brand Hero */}
        <View style={styles.brandHero}>
          <Image 
            source={require('../assets/logo.png')} 
            style={{ width: 64, height: 64, marginBottom: Spacing.md }} 
            contentFit="contain" 
          />
          <Text style={[styles.appName, { color: colors.primary }]}>Interview Ready</Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            Empowering professionals worldwide to master their interviews and accelerate their careers.
          </Text>
        </View>

        {/* Mission Statement */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Our Mission</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            Landing your dream job shouldn't be a game of chance. At <Text style={{ fontWeight: '700', color: colors.primary }}>Interview Ready</Text>, our mission is to level the playing field for job seekers by harnessing the power of cutting-edge artificial intelligence.
          </Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            Whether you are preparing for your first technical interview, navigating an executive leadership loop, or optimizing your resume for modern automated recruiting systems, Interview Ready provides personalized, actionable preparation at every step.
          </Text>
        </View>

        {/* What We Offer */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>What We Offer</Text>
          <View style={styles.featuresGrid}>
            {coreFeatures.map((feature, index) => (
              <View key={index} style={[styles.featureCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name={feature.icon as any} size={24} color={colors.primary} />
                </View>
                <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{feature.title}</Text>
                <Text style={[styles.featureDescription, { color: colors.textBody }]}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Commitment to Integrity & Privacy */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, marginTop: Spacing.xl }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Privacy & Trust First</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            We believe your career data is strictly your own. We never sell your personal information or resume data to third-party data brokers. All career documents and interview audio recordings are securely encrypted and protected in accordance with international data privacy standards.
          </Text>
        </View>

        {/* Quick Links */}
        <View style={styles.linksRow}>
          <Pressable 
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/contact' as any)}
          >
            <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>Contact Support</Text>
          </Pressable>
          <Pressable 
            style={[styles.outlineBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/privacy' as any)}
          >
            <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.headingMd,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    padding: Spacing.lg,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  brandHero: {
    alignItems: 'center',
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  appName: {
    ...Typography.displayMd,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  tagline: {
    ...Typography.bodyLg,
    textAlign: 'center',
    maxWidth: 520,
    lineHeight: 24,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  cardTitle: {
    ...Typography.headingSm,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  paragraph: {
    ...Typography.bodyMd,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  section: {
    marginTop: Spacing.xxl,
  },
  sectionHeading: {
    ...Typography.headingMd,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  featuresGrid: {
    gap: Spacing.md,
  },
  featureCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  featureTitle: {
    ...Typography.bodyLg,
    fontWeight: '700',
  },
  featureDescription: {
    ...Typography.bodyMd,
    lineHeight: 20,
  },
  linksRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  actionBtnText: {
    ...Typography.bodyMd,
    fontWeight: '700',
  },
  outlineBtn: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    ...Typography.bodyMd,
    fontWeight: '600',
  },
});
