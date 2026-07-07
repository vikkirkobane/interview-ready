import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { useAnalyzeJobMutation, useJobApplicationsListQuery, useJobApplicationQuery, useParseResumeMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

export default function JobFitScreen() {
  const { job_id } = useLocalSearchParams();
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [extractJdLoading, setExtractJdLoading] = useState(false);
  const router = useRouter();

  // Load existing job application if job_id is provided
  const { data: jobApplication } = useJobApplicationQuery(job_id as string || null);
  
  React.useEffect(() => {
    if (jobApplication) {
      if (jobApplication.raw_jd) setJdText(jobApplication.raw_jd);
      if (jobApplication.job_url) setJdUrl(jobApplication.job_url);
    }
  }, [jobApplication]);

  const { user } = useAuthStore();
  const { profile, updateProfile } = useProfileStore();
  const { colors, isDark } = useTheme();

  const analyzeJob = useAnalyzeJobMutation();
  const extractJd = useExtractJdMutation();
  const { data: pastMatches, isLoading: isLoadingPastMatches } = useJobApplicationsListQuery();



  const handleAttachJdFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];

      if (fileAsset.size && fileAsset.size > 1 * 1024 * 1024) {
        Toast.show({ type: 'error', text1: 'File too large', text2: 'Please upload a file smaller than 1MB.' });
        return;
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      if (!fileAsset.mimeType || !allowedTypes.includes(fileAsset.mimeType)) {
        Toast.show({ type: 'error', text1: 'Invalid file type', text2: 'Only PNG, JPEG, and PDF files are allowed.' });
        return;
      }

      setExtractJdLoading(true);

      const formData = new FormData();
      if (Platform.OS === 'web' && fileAsset.file) {
        formData.append('file', fileAsset.file as unknown as Blob);
      } else {
        formData.append('file', {
          uri: fileAsset.uri,
          name: fileAsset.name,
          type: fileAsset.mimeType,
        } as any);
      }

      const { extracted_text } = await extractJd.mutateAsync(formData);

      setJdFileText(extracted_text);
      setJdFileName(fileAsset.name);

      Toast.show({ type: 'success', text1: 'Text extracted', text2: 'Text has been extracted from the file and is ready for analysis.' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to extract text', text2: error.message || 'Please check your file and try again.' });
    } finally {
      setExtractJdLoading(false);
    }
  };

  const handleRemoveAttachedJd = () => {
    setJdFileText('');
    setJdFileName(null);
  };

  const handleAnalyze = async () => {
    setUrlError('');

    // Use JD file text if available, otherwise use text input
    const finalJdText = jdFileText.trim().length > 0 ? jdFileText : jdText.trim();

    if (finalJdText.length < 20 && !jdUrl) {
      Toast.show({ type: 'error', text1: 'Input missing', text2: 'Please paste a job description, provide a valid URL, or attach a file with job description text.' });
      return;
    }

    try {
      const finalJdUrl = jdText.trim().length >= 20 ? '' : jdUrl;
      const result = await analyzeJob.mutateAsync({
        job_id: job_id as string,
        jdText: finalJdText,
        jdUrl: finalJdUrl,
        profileData: profile
      });

      // Navigate to standalone results screen
      router.push(`/job-match-results?id=${result.id}` as any);
    } catch (error: any) {
      if (error.message.includes('extract content from the provided URL') || error.message.includes('URL')) {
        setUrlError(error.message);
      } else {
        Toast.show({ type: 'error', text1: 'Analysis Failed', text2: error.message });
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
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textBody }]}
                  multiline
                  placeholder="Paste the full job listing here to start the AI gap analysis..."
                  placeholderTextColor={colors.textMuted}
                  value={jdText}
                  onChangeText={setJdText}
                  textAlignVertical="top"
                />
                <View style={styles.inputActions}>
                  {/* Attach JD File Button */}
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachJdFile} disabled={extractJdLoading}>
                     {extractJdLoading ? (
                       <ActivityIndicator size="small" color={colors.primary} />
                     ) : (
                       <>
                         <Ionicons name="attach" size={24} color={colors.textMuted} />
                       </>
                     )}
                  </TouchableOpacity>

                  {/* Attached File Info */}
                  {jdFileName && (
                    <View style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: Radius.md,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: 'transparent'
                    }}>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{jdFileName}</Text>
                      <TouchableOpacity onPress={handleRemoveAttachedJd} style={{ marginLeft: 4 }}>
                        <Ionicons name="close-circle" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Analyze Button */}
                  <TouchableOpacity
                    style={[styles.analyzeBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, analyzeJob.isPending && { opacity: 0.7 }]}
                    onPress={handleAnalyze}
                    disabled={analyzeJob.isPending}
                  >
                    {analyzeJob.isPending ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="star-four-points" size={20} color={colors.textInverse} />
                        <Text style={[styles.analyzeBtnText, { color: colors.textInverse, fontWeight: '600' }]}>Analyze Job Match</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Past Job Matches */}
            <View style={{ marginTop: Spacing.xl }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Past Job Matches</Text>
              {isLoadingPastMatches ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: Spacing.lg }} />
              ) : pastMatches && pastMatches.length > 0 ? (
                <View style={styles.pastMatchesList}>
                  {pastMatches.map((match: any) => (
                    <TouchableOpacity
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
                    </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingBottom: 120, // Bottom nav padding
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
  inputWrapper: {
    position: 'relative',
  },
  textArea: {
    height: 200,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Typography.bodyMd,
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
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  analyzeBtnText: {
    ...Typography.headingMd,
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
