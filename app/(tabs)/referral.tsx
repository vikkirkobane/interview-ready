import React, { useState } from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView, ActivityIndicator, Share, TextInput, Platform } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth-store';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useReferral } from '../../src/hooks/useReferral';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ReferralScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { stats, loading, applyReferralCode } = useReferral();
  const [inputCode, setInputCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);

  const getInviteUrl = () => {
    const origin = typeof globalThis !== 'undefined' && (globalThis as any).location?.origin
      ? (globalThis as any).location.origin
      : 'https://appinterviewready.top';
    return `${origin}/signup?ref=${stats?.referralCode || ''}`;
  };

  const handleCopyCode = async () => {
    if (!stats?.referralCode) return;
    
    await Clipboard.setStringAsync(stats.referralCode);
    Toast.show({
      type: 'success',
      text1: 'Code Copied! 📋',
      text2: `Referral code ${stats.referralCode} copied to clipboard.`,
    });
  };

  const handleCopyLink = async () => {
    if (!stats?.referralCode) return;

    const url = getInviteUrl();
    await Clipboard.setStringAsync(url);
    Toast.show({
      type: 'success',
      text1: 'Invite Link Copied! 🔗',
      text2: 'Share with friends to give & get 10 free AI credits.',
    });
  };

  const handleShare = async () => {
    if (!stats?.referralCode) return;
    
    const inviteUrl = getInviteUrl();
    const shareMessage = `🚀 Join me on Interview Ready and get 10 free AI credits to optimize your resume and ace mock interviews!\n\nSign up with my invite link: ${inviteUrl}\n\nOr use referral code: ${stats.referralCode}`;

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: 'Join Interview Ready • 10 Free AI Credits',
          text: shareMessage,
          url: inviteUrl,
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }

    try {
      await Share.share({
        message: shareMessage,
        title: 'Join Interview Ready',
      });
    } catch {
      await handleCopyLink();
    }
  };

  const handleSubmitCode = async () => {
    if (!inputCode.trim()) return;
    setSubmitting(true);
    const result = await applyReferralCode(inputCode.trim());
    setSubmitting(false);
    if (result.success) {
      const credits = result.creditsGranted || (result.isPromo ? 20 : 10);
      Toast.show({
        type: 'success',
        text1: result.isPromo ? 'Promo Code Applied! 🎉' : 'Referral Code Applied! 🎁',
        text2: result.message || `You received ${credits} free AI credits!`,
      });
      setInputCode('');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: result.error || 'Failed to apply code.',
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.bgSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        <View style={styles.heroSection}>
          <Pressable 
            style={[styles.backBtn, { alignSelf: 'flex-start', marginBottom: Spacing.sm, backgroundColor: colors.bgPrimary, borderColor: colors.border }]} 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={[styles.heroIconBox, { backgroundColor: `${colors.primary}1A` }]}>
            <Ionicons name="gift" size={40} color={colors.primary} />
          </View>
          <Text style={[Typography.displayMd, { color: colors.textPrimary, marginBottom: Spacing.xs }]}>Give 10, Get 10</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Invite a friend to Interview Ready. They get 10 AI credits to start, and you get 10 AI credits when they sign up!
          </Text>
        </View>

        <View style={[styles.codeCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <Text style={[styles.codeLabel, { color: colors.textMuted }]}>YOUR REFERRAL CODE</Text>
          <View style={[styles.codeRow, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Text style={[styles.codeText, { color: colors.textPrimary }]}>{stats?.referralCode || 'Loading...'}</Text>
            <Pressable onPress={handleCopyCode} style={{ padding: Spacing.sm }}>
               <Text style={{ color: colors.primary, ...Typography.headingMd }}>Copy</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl }}>
          <View style={{ flex: 1 }}>
            <Button 
              title="Share Invite Link"
              onPress={handleShare}
              fullWidth
              disabled={!stats?.referralCode}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button 
              title="Copy Link"
              variant="outline"
              onPress={handleCopyLink}
              fullWidth
              disabled={!stats?.referralCode}
            />
          </View>
        </View>

        {stats && stats.totalReferrals > 0 && (
          <View style={[styles.statsCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>Your Referral Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalReferrals}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Referrals</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.creditsEarned}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Credits Earned</Text>
              </View>
            </View>
          </View>
        )}

        {stats && stats.referrals && stats.referrals.length > 0 && (
          <View style={[styles.listCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <Text style={[styles.listTitle, { color: colors.textPrimary }]}>People You Referred</Text>
            {stats.referrals.map((ref) => (
              <View key={ref.id} style={[styles.listItem, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listName, { color: colors.textPrimary }]}>
                    {ref.referred_user?.first_name || 'Anonymous'} {ref.referred_user?.last_name || ''}
                  </Text>
                  <Text style={[styles.listEmail, { color: colors.textMuted }]}>
                    {ref.referred_user?.email}
                  </Text>
                </View>
                <View style={[styles.creditBadge, { backgroundColor: `${colors.primary}1A` }]}>
                  <Text style={[styles.creditBadgeText, { color: colors.primary }]}>+{ref.credits_granted}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.submitCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <Text style={[styles.submitTitle, { color: colors.textPrimary }]}>Have a referral or promo code?</Text>
          <View style={styles.submitRow}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
              placeholder="e.g. LINKEDIN20 or JOHN1234"
              placeholderTextColor={colors.textMuted}
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Button 
              title="Apply" 
              onPress={handleSubmitCode} 
              loading={submitting}
              disabled={!inputCode.trim() || submitting}
              style={styles.submitBtn}
            />
          </View>
        </View>

        <View style={[styles.howItWorksCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <Text style={[styles.howTitle, { color: colors.textPrimary }]}>How it works</Text>
          
          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.stepNumber, { color: colors.textPrimary }]}>1</Text>
            </View>
            <View style={styles.stepTextContent}>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>Share your code</Text>
              <Text style={[styles.stepDesc, { color: colors.textMuted }]}>Send your unique link or code to a friend.</Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.stepNumber, { color: colors.textPrimary }]}>2</Text>
            </View>
            <View style={styles.stepTextContent}>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>They sign up</Text>
              <Text style={[styles.stepDesc, { color: colors.textMuted }]}>Your friend creates an account and gets 10 credits.</Text>
            </View>
          </View>

          <View style={styles.stepConnector} />

          <View style={styles.stepRow}>
            <View style={[styles.stepCircle, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.stepNumber, { color: colors.textPrimary }]}>3</Text>
            </View>
            <View style={styles.stepTextContent}>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>You get rewarded</Text>
              <Text style={[styles.stepDesc, { color: colors.textMuted }]}>You automatically receive 10 credits added to your balance.</Text>
            </View>
          </View>
        </View>
        </ScrollView>
        <View style={{ height: bottomNavPadding }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: {
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  backBtn: {
    padding: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  heroIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.displayMd,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  codeCard: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  codeLabel: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  codeText: {
    ...Typography.displayMd,
    letterSpacing: 2,
  },
  howItWorksCard: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    ...Shadow.sm,
  },
  howTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    ...Typography.headingMd,
  },
  stepTextContent: {
    flex: 1,
  },
  stepHeading: {
    ...Typography.headingMd,
    marginBottom: 4,
  },
  stepDesc: {
    ...Typography.bodyMd,
  },
  stepConnector: {
    width: 2,
    height: 24,
    backgroundColor: 'transparent',
    marginLeft: 15,
    marginVertical: 4,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
  },
  statsCard: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  statsTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.displayMd,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodyMd,
  },
  submitCard: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  submitTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.md,
  },
  submitRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyMd,
  },
  submitBtn: {
    minWidth: 100,
  },
  listCard: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  listTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listName: {
    ...Typography.headingMd,
    marginBottom: 2,
  },
  listEmail: {
    ...Typography.bodySm,
  },
  creditBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  creditBadgeText: {
    ...Typography.label,
  },
});
