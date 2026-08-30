import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, useTheme } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>Last Updated: August 30, 2026</Text>

        <Text style={[styles.paragraph, { color: colors.textBody }]}>
          Welcome to <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Interview Ready</Text> ("we", "our", or "us"). We are dedicated to protecting your personal information and your right to privacy. This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you visit our website, mobile application, or use our career coaching services.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>1. Information We Collect</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            We collect personal information that you voluntarily provide to us when you register on the application, use our AI mock interview coach, upload resumes or job descriptions, or contact us.
          </Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Account Information:</Text> Email address, full name, profile image, and authentication identifiers (Google, LinkedIn, or Email/Password).</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Career Data:</Text> Uploaded resumes, work experience, cover letters, target job descriptions, interview transcripts, and AI-generated feedback.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Technical & Device Data:</Text> IP address, browser type, operating system, device identifiers, and usage logs.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>2. How We Use Your Information</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            We use personal information collected via our Services for legitimate business purposes:
          </Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• To deliver AI interview simulations, ATS resume tailoring, and customized career guidance.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• To manage user accounts, authenticate logins, and process subscriptions.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• To monitor, secure, debug, and improve the performance of our platform.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• To comply with legal obligations and enforce our terms and policies.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>3. Advertising & Google AdSense Disclosure</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            We use third-party advertising companies, including <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Google AdSense</Text>, to serve advertisements when you visit our website.
          </Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>
            • <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Third-Party Cookies & DART:</Text> Google and third-party vendors use cookies (such as the DoubleClick DART cookie) to serve ads based on your prior visits to our website or other websites on the Internet.
          </Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>
            • <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Personalized Advertising Opt-Out:</Text> You may opt out of personalized advertising by visiting Google's Ads Settings at <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>https://adssettings.google.com</Text> or through the Network Advertising Initiative opt-out page at <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>https://optout.networkadvertising.org</Text> or <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>https://www.aboutads.info/choices</Text>.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>4. Cookies and Tracking Technologies</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            We use cookies, web beacons, and similar tracking technologies to access or store information. These include essential cookies for authentication and session persistence, functional cookies for preferences, and analytics cookies to understand site performance. You can set your browser to refuse cookies, but some platform features may not function properly without them.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>5. Data Protection Rights (GDPR & CCPA/CPRA)</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            Depending on your jurisdiction (such as the European Economic Area, United Kingdom, Switzerland, or California), you have specific statutory rights regarding your personal data:
          </Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Right to Access & Portability:</Text> Request copies of your personal data.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Right to Rectification:</Text> Request correction of inaccurate or incomplete information.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Right to Erasure (Deletion):</Text> Request deletion of your account and personal data.</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Right to Restrict or Object:</Text> Object to or restrict processing of your data under applicable law.</Text>
          <Text style={[styles.paragraph, { color: colors.textBody, marginTop: Spacing.sm }]}>
            To exercise any of these rights, contact us at <Text style={{ fontWeight: '600', color: colors.primary }}>info@appinterviewready.top</Text>.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>6. Data Security & Retention</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            We implement industry-standard encryption (TLS in transit and AES-256 at rest), role-based access control, and secure database partitioning via Supabase to safeguard your data. We retain personal data only as long as necessary to fulfill the purposes outlined in this policy or comply with legal requirements.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>7. Contact Us</Text>
          <Text style={[styles.paragraph, { color: colors.textBody }]}>
            If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:
          </Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Email:</Text> info@appinterviewready.top</Text>
          <Text style={[styles.bullet, { color: colors.textBody }]}>• <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Website:</Text> https://appinterviewready.top/contact</Text>
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
