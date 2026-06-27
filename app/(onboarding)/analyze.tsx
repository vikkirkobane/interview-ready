import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { ScoreRing } from '../../src/components/ui';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useAnalyzeJobMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export default function AnalyzeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { jdText, setJdText, jdUrl, setJdUrl } = useOnboardingStore();
  
  const [inputType, setInputType] = useState<0 | 1>(0); // 0 = Text, 1 = URL
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const analyzeJob = useAnalyzeJobMutation();

  const handleAnalyze = async () => {
    if (!hasInput) return;
    
    try {
      const result = await analyzeJob.mutateAsync({
        jdText: inputType === 0 ? jdText : undefined,
        jdUrl: inputType === 1 ? jdUrl : undefined,
      });
      
      useOnboardingStore.getState().setAnalysisId(result.id);
      setAnalysisResult(result.analysis);
      setShowResults(true);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Analysis Failed',
        text2: error.message || 'Please check your connection and try again.',
      });
    }
  };

  const hasInput = inputType === 0 ? jdText.length > 20 : jdUrl.length > 5;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={[styles.stepLabel, { color: colors.textMuted }]}>STEP 3 OF 5</Text>
            <Text style={[styles.percentLabel, { color: colors.primary }]}>60% Complete</Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.bgMuted }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: '60%' }]} />
          </View>
        </View>

        {/* Header Text */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Paste your dream job 🎯</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Our AI will dissect the requirements and build your unfair advantage in seconds.
          </Text>
        </View>

        {/* Content Container */}
        <View style={[styles.cardContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.formContainer}>

          {/* Interactive Section */}
          <View style={styles.interactiveSection}>
            
            {/* Segmented Control */}
            <View style={[styles.segmentedControl, { backgroundColor: colors.bgSecondary }]}>
              <TouchableOpacity 
                style={[styles.segmentBtn, inputType === 0 && [styles.segmentBtnActive, { backgroundColor: colors.bgCard }]]}
                onPress={() => setInputType(0)}
              >
                <Text style={[styles.segmentText, { color: colors.textMuted }, inputType === 0 && [styles.segmentTextActive, { color: colors.primary }]]}>Paste Text</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segmentBtn, inputType === 1 && [styles.segmentBtnActive, { backgroundColor: colors.bgCard }]]}
                onPress={() => setInputType(1)}
              >
                <Text style={[styles.segmentText, { color: colors.textMuted }, inputType === 1 && [styles.segmentTextActive, { color: colors.primary }]]}>Enter URL</Text>
              </TouchableOpacity>
            </View>

            {/* Input Area */}
            <View style={styles.inputArea}>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                multiline
                placeholder={inputType === 0 ? "Paste the job description content here... e.g. 'We are looking for a Senior Product Designer with 5+ years of experience in SaaS...'" : "Enter the job posting URL (LinkedIn, Indeed, Glassdoor)..."}
                placeholderTextColor={colors.textMuted}
                value={inputType === 0 ? jdText : jdUrl}
                onChangeText={inputType === 0 ? setJdText : setJdUrl}
                textAlignVertical="top"
              />
              <View style={styles.inputFooter}>
                <Ionicons name="information-circle" size={14} color={colors.textMuted} />
                <Text style={[styles.inputFooterText, { color: colors.textMuted }]}>Min. 50 words recommended</Text>
              </View>
            </View>

            {/* Primary Action */}
            {!showResults && (
              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: colors.primary }, (!hasInput || analyzeJob.isPending) && [styles.primaryBtnDisabled, { backgroundColor: colors.textMuted }]]}
                onPress={handleAnalyze}
                disabled={!hasInput || analyzeJob.isPending}
                activeOpacity={0.8}
              >
                {analyzeJob.isPending ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryBtnText}>Analyzing JD...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Analyze Job</Text>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {showResults && (
              <View style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: 0.5 }]}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Analysis Complete</Text>
              </View>
            )}

          </View>

          {/* Results Preview */}
          {showResults && (
            <View style={styles.resultsSection}>
              
              <View style={styles.resultsDivider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>ANALYSIS RESULT</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Score Rings Grid */}
              <View style={styles.scoreRingsGrid}>
                <View style={[styles.scoreRingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <ScoreRing score={analysisResult?.recommendation_level === 'GREAT_FIT' ? 95 : analysisResult?.recommendation_level === 'GOOD_FIT' ? 75 : 50} size="sm" color={colors.success} animate={true} />
                  <Text style={[styles.scoreRingLabel, { color: colors.textSecondary }]}>Fit Score</Text>
                </View>
                <View style={[styles.scoreRingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <ScoreRing score={Math.min(100, (analysisResult?.required_skills?.length || 0) * 10)} size="sm" color={colors.primary} animate={true} />
                  <Text style={[styles.scoreRingLabel, { color: colors.textSecondary }]}>Skills Reqs</Text>
                </View>
                <View style={[styles.scoreRingCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <ScoreRing score={Math.min(100, (analysisResult?.nice_to_haves?.length || 0) * 15)} size="sm" color={colors.warning} animate={true} />
                  <Text style={[styles.scoreRingLabel, { color: colors.textSecondary }]}>Bonus</Text>
                </View>
              </View>

              {/* Skill Tags Bento Block */}
              <View style={[styles.bentoBlock, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                <View style={styles.bentoSection}>
                  <View style={styles.bentoHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Required Skills</Text>
                  </View>
                  <View style={styles.pillContainer}>
                    {analysisResult?.required_skills?.slice(0, 6).map((skillObj: any, i: number) => (
                      <View key={i} style={[styles.pill, styles.pillSuccess, { backgroundColor: colors.successLight }]}>
                        <Text style={[styles.pillTextSuccess, { color: colors.success }]}>{skillObj.skill || skillObj}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={[styles.bentoDivider, { backgroundColor: colors.border }]} />

                <View style={styles.bentoSection}>
                  <View style={styles.bentoHeader}>
                    <Ionicons name="warning" size={20} color={colors.error} />
                    <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>{analysisResult?.red_flags?.length > 0 ? 'Red Flags' : 'Missing/Bonus'}</Text>
                  </View>
                  <View style={styles.pillContainer}>
                    {(analysisResult?.red_flags?.length > 0 ? analysisResult?.red_flags : analysisResult?.nice_to_haves)?.slice(0, 6).map((item: string, i: number) => (
                      <View key={i} style={[styles.pill, styles.pillError, { backgroundColor: colors.errorLight }]}>
                        <Text style={[styles.pillTextError, { color: colors.error }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

            </View>
          )}

          </View>
        </View>
        {/* Footer Navigation */}
        {showResults && (
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.continueBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(onboarding)/resume')}
              activeOpacity={0.8}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  progressContainer: {
    width: '100%',
    marginBottom: Spacing.xxl,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepLabel: {
    ...Typography.label,
    letterSpacing: 1,
  },
  percentLabel: {
    ...Typography.label,
    fontWeight: '700',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.displayLg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyLg,
    textAlign: 'center',
    maxWidth: '90%',
  },
  cardContainer: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  formContainer: {
    width: '100%',
    gap: Spacing.lg,
    zIndex: 10,
  },
  interactiveSection: {
    width: '100%',
    gap: Spacing.md,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.xl,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  segmentBtnActive: {
    ...Shadow.sm,
  },
  segmentText: {
    ...Typography.headingMd,
  },
  segmentTextActive: {
  },
  inputArea: {
    position: 'relative',
    width: '100%',
  },
  textArea: {
    width: '100%',
    height: 256, // 64 * 4
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    ...Typography.bodyMd,
  },
  inputFooter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputFooterText: {
    ...Typography.label,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadow.lg,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    ...Typography.headingLg,
    color: '#fff',
  },
  resultsSection: {
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.lg,
  },
  resultsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.label,
    letterSpacing: 1,
  },
  scoreRingsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  scoreRingCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    ...Shadow.sm,
  },
  scoreRingLabel: {
    ...Typography.label,
    marginTop: 8,
  },
  bentoBlock: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  bentoSection: {
    //
  },
  bentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  bentoTitle: {
    ...Typography.headingMd,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillSuccess: {
  },
  pillError: {
  },
  pillTextSuccess: {
    ...Typography.label,
  },
  pillTextError: {
    ...Typography.label,
  },
  bentoDivider: {
    height: 1,
    borderStyle: 'dashed',
    marginVertical: Spacing.lg,
  },
  footer: {
    paddingTop: Spacing.xl,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  continueBtnText: {
    ...Typography.headingMd,
    color: '#fff',
  },
});
