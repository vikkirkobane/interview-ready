import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useReferral } from '../../src/hooks/useReferral';

export default function ReferralScreen() {
  const { colors } = useTheme();
  const { stats, loading } = useReferral();

  const handleCopyCode = async () => {
    if (!stats?.referralCode) return;
    
    await Clipboard.setStringAsync(stats.referralCode);
    Toast.show({
      type: 'success',
      text1: 'Copied!',
      text2: 'Referral code copied to clipboard.',
    });
  };

  const handleShare = async () => {
    if (!stats?.referralCode) return;
    
    try {
      await Share.share({
        message: `Join Interview Ready and get 10 free AI credits! Use my referral code: ${stats.referralCode}\n\nDownload now: https://interviewready.app`,
        title: 'Join Interview Ready',
      });
    } catch (error) {
      console.error('Error sharing:', error);
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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
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
            <TouchableOpacity onPress={handleCopyCode} style={{ padding: Spacing.sm }}>
               <Text style={{ color: colors.primary, ...Typography.headingMd }}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button 
          title="Share Invite Link"
          onPress={handleShare}
          fullWidth
          style={{ marginBottom: Spacing.xl }}
          disabled={!stats?.referralCode}
        />

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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: {
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
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
});
