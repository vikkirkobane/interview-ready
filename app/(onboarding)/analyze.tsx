import { Pressable ,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { ScoreRing, FileAttachmentBadge } from '../../src/components/ui';

import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useAnalyzeJobMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { isRateLimitedError } from '../../src/lib/errorHandler';
import { Ionicons } from '@expo/vector-icons';
import { useFilePicker } from '../../src/hooks/useFilePicker';
import { supabase } from '../../src/lib/supabase';
import { fetchFileArrayBuffer } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth-store';
export default function AnalyzeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { jdText, setJdText, jdUrl, setJdUrl } = useOnboardingStore();

  const [inputType, setInputType] = useState<0 | 1 | 2>(0); // 0 = Text, 1 = URL, 2 = File
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);


  const analyzeJob = useAnalyzeJobMutation();
  const extractJd = useExtractJdMutation();

  const [isRetrying, setIsRetrying] = useState(false);

  const handleAnalyze = async () => {
    const finalJdText = (inputType === 2 ? jdFileText : (jdText || jdFileText)).trim();
    const finalJdUrl = jdUrl.trim();

    if (finalJdText.length < 20 && !finalJdUrl) {
      Toast.show({
        type: 'error',
        text1: 'Input missing',
        text2: 'Please paste a job description, provide a valid URL, or attach a document.',
      });
      return;
    }

    try {
      const result = await analyzeJob.mutateAsync({
        jdText: finalJdText.length >= 20 ? finalJdText : undefined,
        jdUrl: inputType === 1 ? finalJdUrl : undefined,
      });

      useOnboardingStore.getState().setAnalysisId(result.job_id);
      setAnalysisResult(result.analysis);
      setShowResults(true);
    } catch (error: any) {
      if (isRateLimitedError(error.message) && !isRetrying) {
        // Auto-retry once after 3 seconds for rate-limited requests
        setIsRetrying(true);
        Toast.show({
          type: 'info',
          text1: 'System busy',
          text2: 'Retrying in 3 seconds...',
          visibilityTime: 2000,
        });
        setTimeout(() => {
          setIsRetrying(false);
          handleAnalyze();
        }, 3000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Analysis Failed',
          text2: error.message || 'Please check your connection and try again.',
        });
      }
    }
  };

  const { pickFile, isPicking: isJdFilePicking } = useFilePicker();
  const extractJdLoading = isJdFilePicking || extractJd.isPending;

  const handleAttachJdFile = async () => {
    await pickFile({
      type: ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      allowedTypes: ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      maxSizeMb: 5,
      onFilePicked: async (payload) => {
        Toast.show({ type: 'info', text1: 'Uploading File...', text2: 'Saving your file to secure storage.' });
        try {
          const fileName = payload.fileName;
          const { user } = useAuthStore.getState();
          const userId = user?.id;
          if (!userId) {
            throw new Error('User not authenticated');
          }
          const storagePath = `jd-uploads/${userId}/${Date.now()}-${fileName}`;
          // Use ArrayBuffer on mobile — Android's fetch().blob() returns type='text/plain'
          // which causes "Unsupported FormDataPart implementation" in Supabase Storage.
          // ArrayBuffer bypasses blob type inference; contentType option controls MIME.
          let uploadBody: Blob | ArrayBuffer;
          if (payload.webFile) {
            uploadBody = payload.webFile;
          } else {
            uploadBody = await fetchFileArrayBuffer(payload.fileUri, payload.fileName);
          }

          const { error: uploadError } = await supabase
            .storage
            .from('interview-ready-files')
            .upload(storagePath, uploadBody, {
              contentType: payload.mimeType,
              upsert: false
            });
          if (uploadError) throw uploadError;
          // Proceed with original extraction
          const { extracted_text } = await extractJd.mutateAsync(payload);
          setJdFileText(extracted_text);
          setJdFileName(payload.fileName);
          setJdText(extracted_text);
          useOnboardingStore.getState().setJdText(extracted_text);
        } catch (error: any) {
          Toast.show({ type: 'error', text1: 'Upload or extraction failed', text2: error.message || 'Please try again.' });
          throw error;
        }
      },
      successMessage: { text1: 'Text extracted', text2: 'Text has been extracted from the file and is ready for use.' }
    });
  };

  const handleRemoveAttachedJd = () => {
    setJdFileText('');
    setJdFileName(null);
    setInputType(0); // Reset to text input
  };

  const hasInput =
    (inputType === 0 && (jdText.length > 20 || jdFileText.trim().length > 20)) ||
    (inputType === 1 && jdUrl.length > 5) ||
    (inputType === 2 && (jdFileText.trim().length > 20 || jdText.length > 20));

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
              <Pressable 
                style={[styles.segmentBtn, inputType === 0 && [styles.segmentBtnActive, { backgroundColor: colors.bgCard }]]}
                onPress={() => setInputType(0)}
              >
                <Text style={[styles.segmentText, { color: colors.textMuted }, inputType === 0 && [styles.segmentTextActive, { color: colors.primary }]]}>Paste Text</Text>
              </Pressable>
              <Pressable 
                style={[styles.segmentBtn, inputType === 1 && [styles.segmentBtnActive, { backgroundColor: colors.bgCard }]]}
                onPress={() => setInputType(1)}
              >
                <Text style={[styles.segmentText, { color: colors.textMuted }, inputType === 1 && [styles.segmentTextActive, { color: colors.primary }]]}>Enter URL</Text>
              </Pressable>
            </View>

            {/* Input Area */}
            <View style={styles.inputArea}>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                multiline
                placeholder={inputType === 0 ? "Paste the job description content here... e.g. 'We are looking for a Senior Product Designer with 5+ years of experience in SaaS...'" : inputType === 1 ? "Enter the job posting URL (LinkedIn, Indeed, Glassdoor)..." : "Text extracted from attached file will appear here..."}
                placeholderTextColor={colors.textMuted}
                value={inputType === 0 ? jdText : inputType === 1 ? jdUrl : jdFileText}
                onChangeText={inputType === 0 ? setJdText : inputType === 1 ? setJdUrl : (text) => {}} // File text is read-only
                textAlignVertical="top"
                editable={inputType !== 2} // Not editable when showing file text
              />
              <View style={styles.inputFooter}>
                <Ionicons name="information-circle" size={14} color={colors.textMuted} />
                <Text style={[styles.inputFooterText, { color: colors.textMuted }]}>Min. 50 words recommended</Text>
              </View>
            </View>

            {/* File Attachment Shelf (Prominently displayed when picking, loading, or attached) */}
            {(jdFileName || extractJdLoading) ? (
              <View style={[styles.attachmentShelf, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                  <Ionicons name="document-attach-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.attachmentShelfLabel, { color: colors.textPrimary }]}>Attached File:</Text>
                </View>
                <FileAttachmentBadge
                  fileName={jdFileName}
                  isLoading={extractJdLoading}
                  loadingText="Extracting file text..."
                  onRemove={handleRemoveAttachedJd}
                />
              </View>
            ) : null}

            {/* Toolbar: Attach Button + Format hint */}
            <View style={styles.toolbarRow}>
              <Pressable
                style={[styles.attachActionBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                onPress={handleAttachJdFile}
                disabled={extractJdLoading}
                accessibilityLabel="Attach job description document"
                accessibilityRole="button"
              >
                {extractJdLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="attach" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.attachActionText, { color: colors.textPrimary }]}>
                      {jdFileName ? 'Replace Attached File' : 'Attach JD Document'}
                    </Text>
                  </>
                )}
              </Pressable>
              <Text style={[styles.supportedFormatsText, { color: colors.textMuted }]}>
                PDF, DOCX, PNG, JPG (Max 5MB)
              </Text>
            </View>

            {/* Primary Action */}
            {!showResults && (
              <Pressable 
                style={[styles.primaryBtn, { backgroundColor: colors.primary }, (!hasInput || analyzeJob.isPending) && [styles.primaryBtnDisabled, { backgroundColor: colors.textMuted }]]}
                onPress={handleAnalyze}
                disabled={!hasInput || analyzeJob.isPending}
                
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
              </Pressable>
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
            <Pressable 
              style={[styles.continueBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                useOnboardingStore.getState().nextStep();
                router.push('/(onboarding)/resume');
              }}
              
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
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
    minHeight: 140,
    maxHeight: 200,
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
  attachmentShelf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginVertical: Spacing.xs,
  },
  attachmentShelfLabel: {
    ...Typography.bodySm,
    fontWeight: '600',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  attachActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  attachActionText: {
    ...Typography.bodySm,
    fontWeight: '600',
  },
  supportedFormatsText: {
    ...Typography.bodySm,
    fontSize: 11,
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
  inputActions: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attachBtn: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
