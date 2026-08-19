import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useReferral } from '../../src/hooks/useReferral';
import { useProfileStore } from '../../src/stores/profile-store';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export default function ReferralCodeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const { applyReferralCode } = useReferral();
  const { referralCode: deepLinkCode, clearReferralCode } = useOnboardingStore();

  // Pre-fill from deep link if available
  React.useEffect(() => {
    if (deepLinkCode && !code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode(deepLinkCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkCode]);

  const handleApplyCode = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      Toast.show({
        type: 'error',
        text1: 'Empty Code',
        text2: 'Please enter a referral or promo code, or skip this step.',
      });
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyReferralCode(trimmedCode);

      if (result.success) {
        const credits = result.creditsGranted || (result.isPromo ? 20 : 10);
        
        Toast.show({
          type: 'success',
          text1: result.isPromo ? 'Promo Code Applied! 🎉' : 'Referral Code Applied! 🎁',
          text2: `You received ${credits} free AI credits!`,
        });

        if (deepLinkCode) {
          clearReferralCode();
        }

        // Refresh user profile to sync credits immediately
        useProfileStore.getState().fetchProfile().catch(() => {});

        // Mark step 0 as passed and move to step 1 (role screen)
        useOnboardingStore.getState().setReferralCodeSkipped(true);
        useOnboardingStore.getState().setStep(1);
        router.replace('/(onboarding)/role');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Invalid Code',
          text2: result.error || 'Please check the code and try again.',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to apply code.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkip = () => {
    if (deepLinkCode) {
      clearReferralCode();
    }
    useOnboardingStore.getState().setReferralCodeSkipped(true);
    useOnboardingStore.getState().setStep(1);
    router.replace('/(onboarding)/role');
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      {/* Ambient decorations matching role.tsx */}
      <View style={[styles.ambientTopRight, { backgroundColor: `${colors.primary}0D` }]} pointerEvents="none" />
      <View style={[styles.ambientBottomLeft, { backgroundColor: `${colors.primary}0D` }]} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={[styles.stepLabel, { color: colors.primary }]}>STEP 0 OF 5</Text>
            <Text style={[styles.percentLabel, { color: colors.textMuted }]}>WELCOME BONUS</Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.bgMuted }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: '0%' }]} />
          </View>
        </View>

        {/* Header */}
        <View style={styles.titleSection}>
          <View style={[styles.heroIconBox, { backgroundColor: `${colors.primary}1A` }]}>
            <Ionicons name="gift" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Got a referral or promo code?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            Enter a friend's referral code or a LinkedIn campaign promo code to get up to 20 free AI credits instantly.
          </Text>
        </View>

        {/* LinkedIn Community Callout */}
        <Pressable 
          style={[styles.promoTipBox, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}
          onPress={() => setCode('LINKEDIN20')}
        >
          <Ionicons name="sparkles" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.promoTipTitle, { color: colors.primary }]}>LinkedIn Community Bonus</Text>
            <Text style={[styles.promoTipSubtitle, { color: colors.textBody }]}>
              Tap to use code <Text style={{ fontWeight: '700', color: colors.primary }}>LINKEDIN20</Text> for 20 free credits!
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
        </Pressable>

        {/* Input Card */}
        <View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>REFERRAL OR PROMO CODE</Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary },
                code.length > 0 && styles.codeInputFilled,
              ]}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="e.g. LINKEDIN20 or JOHN1234"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              keyboardType="ascii-capable"
            />
          </View>

          {/* How it works mini-section */}
          <View style={styles.howItWorksMini}>
            <View style={styles.miniStep}>
              <View style={[styles.miniIcon, { backgroundColor: `${colors.primary}1A` }]}>
                <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.miniText, { color: colors.textMuted }]}>
                Enter a referral code (10 credits) or promo code (20 credits)
              </Text>
            </View>
            <View style={styles.miniStep}>
              <View style={[styles.miniIcon, { backgroundColor: `${colors.success}1A` }]}>
                <Ionicons name="diamond-outline" size={18} color={colors.success} />
              </View>
              <Text style={[styles.miniText, { color: colors.textMuted }]}>
                Credits are added immediately to your balance
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionSection}>
          <Pressable
            style={[
              styles.continueBtn,
              { backgroundColor: colors.primary },
              isApplying && [styles.continueBtnDisabled, { backgroundColor: colors.textMuted }],
            ]}
            onPress={handleApplyCode}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Text style={styles.continueText}>Apply Code</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.skipBtn, { borderColor: colors.border }]}
            onPress={handleSkip}
          >
            <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>
              Skip for now
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ambientTopRight: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '40%',
    height: '40%',
    borderRadius: 9999,
  },
  ambientBottomLeft: {
    position: 'absolute',
    bottom: '-5%',
    left: '-5%',
    width: '30%',
    height: '30%',
    borderRadius: 9999,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  progressContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  stepLabel: { ...Typography.label },
  percentLabel: { ...Typography.label },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%' },
  titleSection: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
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
    ...Typography.displayLg,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLg,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  promoTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  promoTipTitle: {
    ...Typography.subtitle2,
    fontWeight: '700',
  },
  promoTipSubtitle: {
    ...Typography.bodySm,
    fontSize: 12,
    marginTop: 2,
  },
  formCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadow.sm,
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  fieldGroup: { gap: Spacing.sm },
  fieldLabel: { ...Typography.headingMd },
  textInput: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    ...Typography.bodyMd,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  codeInputFilled: {
    letterSpacing: 3,
    fontWeight: '700',
  },
  howItWorksMini: {
    gap: Spacing.md,
  },
  miniStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  miniIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniText: {
    ...Typography.bodyMd,
    flex: 1,
  },
  actionSection: {
    gap: Spacing.md,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  continueBtnDisabled: { opacity: 0.6 },
  continueText: { ...Typography.headingMd, color: '#fff' },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  skipBtnText: { ...Typography.headingMd },
});
