import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, useTheme } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>Last Updated: August 30, 2026</Text>

        <Text style={[styles.paragraph, { color: colors.textBody }]}>
          Please read these Terms of Service ("Terms", "Agreement") carefully before using the <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Interview Ready</Text> website, mobile application, and related software tools (collectively, the "Service") operated by Interview Ready ("we", "us", or "our").
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            By accessing, creating an account on, or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access or use the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>2. Description of Service</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            Interview Ready is an AI-powered career preparation platform that provides mock interview coaching, resume analysis and ATS tailoring, cover letter generation, job matching, and career progression roadmaps.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>3. User Accounts & Responsibilities</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• You must provide accurate, complete, and updated registration information.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• You are responsible for safeguarding your login credentials and for all activities that occur under your account.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>4. AI Guidance & Career Disclaimers</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            Our coaching tools and feedback are powered by artificial intelligence models. While we strive to provide high-quality and practical advice, AI-generated outputs are provided for educational and preparation purposes only. Interview Ready does not guarantee job placement, employment offers, or specific interview outcomes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>5. Subscriptions, Payments & Credits</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            Certain features or tiers (such as Pro plans and extra interview credits) require payment. All fees are clearly stated before purchase. Subscription renewals are billed in accordance with your chosen billing interval until cancelled.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>6. Intellectual Property</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            The Service and its original content, features, designs, and functionality are the exclusive property of Interview Ready. You retain all ownership rights to the original resumes and personal content you upload to the platform.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>7. Termination</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            We may terminate or suspend your account immediately, without prior notice or liability, if you breach these Terms or engage in fraudulent, abusive, or illegal conduct.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>8. Contact Us</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            For any legal or terms inquiries, contact us at <Text style={{ fontWeight: '600', color: colors.primary }}>legal@appinterviewready.top</Text> or visit our <Text style={{ fontWeight: '600', color: colors.primary }} onPress={() => router.push('/contact' as any)}>Contact Page</Text>.
          </Text>
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
  lastUpdated: {
    ...Typography.bodySm,
    marginBottom: Spacing.lg,
  },
  paragraph: {
    ...Typography.bodyMd,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.headingSm,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  bullet: {
    ...Typography.bodyMd,
    lineHeight: 22,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
});
