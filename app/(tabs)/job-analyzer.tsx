import React, { useState } from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Colors, Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth-store';
import { supabase } from '../../src/lib/supabase';
import { fetchFileArrayBuffer } from '../../src/lib/api';
import { useProfileStore } from '../../src/stores/profile-store';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useAnalyzeJobMutation, useJobApplicationsListQuery, useJobApplicationQuery, useParseResumeMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { handleApiError, isRateLimitedError } from '../../src/lib/errorHandler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFilePicker } from '../../src/hooks/useFilePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '../../src/stores/ui-store';
import { useInterstitialAd } from '../../src/lib/useInterstitialAd';
import { FileAttachmentBadge } from '../../src/components/ui';


export default function JobFitScreen() {
  const { user } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { profile, updateProfile } = useProfileStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colors, isDark } = useTheme();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  const { job_id } = useLocalSearchParams();
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);

  const router = useRouter();

  // Load existing job application if job_id is provided
  const { data: jobApplication } = useJobApplicationQuery(job_id as string || null);
  
  React.useEffect(() => {
    if (jobApplication) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (jobApplication.raw_jd) setJdText(jobApplication.raw_jd);
      if (jobApplication.job_url) setJdUrl(jobApplication.job_url);
    }
  }, [jobApplication]);

  const analyzeJob = useAnalyzeJobMutation();
  const extractJd = useExtractJdMutation();
  const { data: pastMatches, isLoading: isLoadingPastMatches } = useJobApplicationsListQuery();

  const { showAd: showInterstitialAd, loaded: interstitialLoaded } = useInterstitialAd();
  const { incrementInterstitialCount, resetInterstitialCount } = useUIStore();



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
        } catch (error: any) {
          Toast.show({ type: 'error', text1: 'Upload or extraction failed', text2: error.message || 'Please try again.' });
          throw error;
        }
      },
      successMessage: { text1: 'Text extracted', text2: 'Text has been extracted from the file and is ready for analysis.' }
    });
  };

  const handleRemoveAttachedJd = () => {
    setJdFileText('');
    setJdFileName(null);
  };

  const [isRetrying, setIsRetrying] = useState(false);

  const handleAnalyze = async () => {
    setUrlError('');

    // Use text area (or fallback to JD file text)
    const finalJdText = (jdText.trim() || jdFileText.trim());
    let finalJdUrl = jdUrl.trim();

    if (finalJdUrl) {
      if (!/^https?:\/\//i.test(finalJdUrl)) {
        finalJdUrl = `https://${finalJdUrl}`;
      }
      try {
        new URL(finalJdUrl);
      } catch {
        setUrlError('Please enter a valid job URL');
        return;
      }
    }

    // Require either text/file OR URL
    if (finalJdText.length < 20 && !finalJdUrl) {
      Toast.show({ type: 'error', text1: 'Input missing', text2: 'Please paste a job description, provide a valid URL, or attach a file with job description text.' });
      return;
    }

    try {
      const result = await analyzeJob.mutateAsync({
        job_id: job_id as string,
        jdText: finalJdText.length >= 20 ? finalJdText : undefined,
        jdUrl: finalJdUrl || undefined,
        profileData: profile
      });

      incrementInterstitialCount();
      const updatedCount = useUIStore.getState().interstitialActionCount;
      if (!isPro && interstitialLoaded && updatedCount >= 2) {
        showInterstitialAd();
        resetInterstitialCount();
      }

      // Navigate to standalone results screen
      router.push(`/job-match-results?id=${result.job_id}` as any);
    } catch (error: any) {
      const errMsg = error.message || '';
      if (
        errMsg.includes('Could not read job link') || 
        errMsg.includes('SCRAPE_FAILED') || 
        errMsg.includes('extract content') || 
        errMsg.includes('scrape')
      ) {
        setUrlError('Link inaccessible. Paste text or attach file.');
        Toast.show({
          type: 'error',
          text1: 'Could not read job link',
          text2: 'Please paste the job text or attach a file instead.',
          visibilityTime: 4000,
        });
      } else if (isRateLimitedError(errMsg) && !isRetrying) {
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
        handleApiError(errMsg, { fallbackTitle: 'Analysis Failed' });
      }
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mainGrid}>
          
          <View style={styles.leftColumn}>
            {/* Hero Section */}
            <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
              <Text style={[styles.heroTitle, { color: colors.textInverse }]}>Job Fit Analyzer</Text>
              <Text style={styles.heroDesc}>Benchmark your profile against specific roles to identify high-impact gaps.</Text>
              
              <View style={[styles.profileBadge, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="person" size={14} color={colors.textInverse} style={{ marginRight: 8 }} />
                  <View>
                    <Text style={styles.profileBadgeLabel}>CURRENT PROFILE</Text>
                    <Text style={[styles.profileBadgeRole, { color: colors.textInverse }]}>{(profile as any)?.current_role || 'Candidate'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Input Area */}
            <View style={[styles.glassCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Job URL or Description</Text>
              <TextInput
                style={[styles.urlInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textBody }, urlError ? { borderColor: colors.error } : null]}
                placeholder="https://www.linkedin.com/jobs/view/..."
                placeholderTextColor={colors.textMuted}
                value={jdUrl}
                onChangeText={(text) => {
                  setJdUrl(text);
                  if (urlError) setUrlError('');
                }}
                keyboardType="url"
                autoCapitalize="none"
              />
              {urlError ? (
                <View style={[styles.errorAlert, { backgroundColor: `${colors.error}1A` }]}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{urlError}</Text>
                </View>
              ) : null}
              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR PASTE DESCRIPTION / ATTACH FILE</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Text Area */}
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textBody }]}
                multiline
                placeholder="Paste the full job listing here to start the AI gap analysis..."
                placeholderTextColor={colors.textMuted}
                value={jdText}
                onChangeText={setJdText}
                textAlignVertical="top"
              />

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

              {/* Analyze CTA Button (Spacious, prominent, non-squished) */}
              <Pressable
                style={[
                  styles.analyzeBtn,
                  { backgroundColor: colors.primary },
                  analyzeJob.isPending && { opacity: 0.7 }
                ]}
                onPress={handleAnalyze}
                disabled={analyzeJob.isPending}
                accessibilityRole="button"
                accessibilityLabel="Analyze Job Match"
              >
                {analyzeJob.isPending ? (
                  <View style={styles.btnContentRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={[styles.analyzeBtnText, { color: '#FFFFFF' }]}>Analyzing Job Match...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <MaterialCommunityIcons name="star-four-points" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={[styles.analyzeBtnText, { color: '#FFFFFF' }]}>Analyze Job Match</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Past Job Matches */}
            <View style={{ marginTop: Spacing.xl }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Past Job Matches</Text>
              {isLoadingPastMatches ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: Spacing.lg }} />
              ) : pastMatches && pastMatches.length > 0 ? (
                <View style={styles.pastMatchesList}>
                  {pastMatches.map((match: any) => (
                    <Pressable
                      key={match.id}
                      style={[styles.matchListItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                      onPress={() => router.push(`/job-match-results?id=${match.id}&fromList=true` as any)}
                    >
                      <View style={[styles.matchIcon, { backgroundColor: `${colors.primary}15` }]}>
                        <Ionicons name="search" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.matchItemContent}>
                        <Text style={[styles.matchItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {match.job_title}
                        </Text>
                        <Text style={[styles.matchItemCompany, { color: colors.textMuted }]}>
                          {match.company}
                        </Text>
                      </View>
                      <View style={styles.matchScoreBadge}>
                        <Text style={[styles.matchScoreText, { color: colors.success }]}>
                          {match.match_score ?? 85}%
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No past job matches found. Paste a JD above to start!
                </Text>
              )}
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
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl, // Bottom nav padding
    maxWidth: 800, // Reduced max width since it's single column now
    width: '100%',
    alignSelf: 'center',
  },
  mainGrid: {
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  leftColumn: {
    gap: Spacing.lg,
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  heroTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.sm,
  },
  heroDesc: {
    ...Typography.bodyMd,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.lg,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileBadgeLabel: {
    ...Typography.label,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  profileBadgeRole: {
    ...Typography.headingMd,
  },
  glassCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadow.card,
  },
  inputLabel: {
    ...Typography.headingMd,
    marginBottom: Spacing.md,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Typography.bodyMd,
    marginBottom: Spacing.md,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  errorText: {
    ...Typography.bodyMd,
    flex: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.label,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  textArea: {
    minHeight: 120,
    maxHeight: 180,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Typography.bodyMd,
    marginBottom: Spacing.xs,
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
  analyzeBtn: {
    width: '100%',
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnText: {
    ...Typography.headingMd,
    fontWeight: '600',
  },
  sectionTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.md,
  },
  pastMatchesList: {
    gap: Spacing.sm,
  },
  matchListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  matchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  matchItemContent: {
    flex: 1,
  },
  matchItemTitle: {
    ...Typography.headingMd,
  },
  matchItemCompany: {
    ...Typography.bodySm,
  },
  matchScoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
  },
  matchScoreText: {
    ...Typography.label,
  },
  emptyText: {
    ...Typography.bodyMd,
    fontStyle: 'italic',
  }
});
