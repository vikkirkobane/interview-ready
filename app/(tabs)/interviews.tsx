import React, { useState, useEffect } from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Card, Button, ScoreRing } from '../../src/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePastInterviewsQuery, useDeleteMockInterviewMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import { useAuthStore } from '../../src/stores/auth-store';
import { useFilePicker } from '../../src/hooks/useFilePicker';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InterviewsLobbyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  
  const [role, setRole] = useState((params.role as string) || 'Product Manager');
  const [jobDescription, setJobDescription] = useState((params.jobDescription as string) || '');
  const [jobUrl, setJobUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [type, setType] = useState('Behavioral');
  const [difficulty, setDifficulty] = useState('Intermediate');
  
  // Ensure fields populate even if the tab was previously mounted
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.role) setRole(params.role as string);
    if (params.jobDescription) setJobDescription(params.jobDescription as string);
  }, [params.role, params.jobDescription]);

  const { data: pastInterviews, isLoading } = usePastInterviewsQuery();
  const deleteMutation = useDeleteMockInterviewMutation();
  const extractJd = useExtractJdMutation();

  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const { pickFile, isPicking: isJdFilePicking } = useFilePicker();
  const extractJdLoading = isJdFilePicking || extractJd.isPending;

  const handleAttachJdFile = async () => {
    await pickFile({
      type: ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      allowedTypes: ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      maxSizeMb: 5,
      onFilePicked: async (payload) => {
        const { extracted_text } = await extractJd.mutateAsync(payload);
        setJdFileText(extracted_text);
        setJdFileName(payload.fileName);
      },
      successMessage: { text1: 'Text extracted', text2: 'Text has been extracted from the file and is ready for use.' }
    });
  };

  const handleRemoveAttachedJd = () => {
    setJdFileText('');
    setJdFileName(null);
  };

  const handleStart = () => {
    const finalJobDescription = jdFileText.trim().length > 0 ? jdFileText : jobDescription.trim();
    const finalJobUrl = jobUrl.trim();

    // Validate URL if provided
    if (finalJobUrl && !/^https?:\/\/.+/i.test(finalJobUrl)) {
      setUrlError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setUrlError('');

    // Navigate to the chat screen
    router.push({
      pathname: '/interview',
      params: {
        role,
        type,
        difficulty,
        jobDescription: finalJobDescription,
        jobUrl: finalJobUrl
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Mock Interviews</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Practice with AI across behavioral, technical, and manager roles.</Text>
        </View>

        <Card style={[styles.setupCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="chatbubbles" size={32} color={colors.warning} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Start a New Interview</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Practice with an AI interviewer tailored to your specific role and difficulty level.</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Target Role</Text>
            <TextInput 
              style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
              value={role}
              onChangeText={setRole}
              placeholder="e.g. Senior Frontend Engineer"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Job URL (Optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }, urlError ? { borderColor: colors.error } : null]}
              placeholder="https://www.linkedin.com/jobs/view/..."
              placeholderTextColor={colors.textMuted}
              value={jobUrl}
              onChangeText={(text) => {
                setJobUrl(text);
                if (urlError) setUrlError('');
              }}
              keyboardType="url"
              autoCapitalize="none"
            />
            {urlError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, padding: 8, backgroundColor: `${colors.error}1A`, borderRadius: 4 }}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={{ marginLeft: 4, color: colors.error, fontSize: 12 }}>{urlError}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 8 }]}>Job Description (Optional if URL provided)</Text>
            <TextInput 
              style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary, minHeight: 80 }]}
              value={jobDescription}
              onChangeText={setJobDescription}
              placeholder="Or paste the target job description here to guide the interview..."
              placeholderTextColor={colors.textMuted}
              multiline={true}
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm }}>
              {/* Attach JD File Button */}
              <Pressable style={styles.attachBtn} onPress={handleAttachJdFile} disabled={extractJdLoading}>
                {extractJdLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="attach" size={24} color={colors.textMuted} />
                )}
              </Pressable>

              {/* Attached File Info */}
              {jdFileName && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{jdFileName}</Text>
                  <Pressable onPress={handleRemoveAttachedJd} style={{ marginLeft: 4 }}>
                    <Ionicons name="close-circle" size={16} color={colors.error} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Interview Type</Text>
            <View style={styles.rowGrid}>
              {['Behavioral', 'Technical', 'Manager'].map((t) => (
                <Pressable 
                  key={t} 
                  style={[styles.chip, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, type === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, type === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Difficulty</Text>
            <View style={styles.rowGrid}>
              {['Beginner', 'Intermediate', 'Senior'].map((d) => (
                <Pressable 
                  key={d} 
                  style={[styles.chip, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, difficulty === d && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, difficulty === d && styles.chipTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable 
            style={[styles.primaryBtn, { marginTop: Spacing.md, height: 54, backgroundColor: colors.primary }]} 
            onPress={handleStart}
          >
            <MaterialCommunityIcons name="star-four-points" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Start Interview</Text>
          </Pressable>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Past Interviews</Text>
        
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        ) : pastInterviews && pastInterviews.length > 0 ? (
          pastInterviews.map((interview: any) => (
            <Card key={interview.id} style={[styles.historyCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <View style={styles.historyHeader}>
                {interview.feedback ? (
                  <ScoreRing score={interview.feedback?.overall_score || 0} size={48} hideText={true} color={colors.primary} />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="time-outline" size={24} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyRole, { color: colors.textPrimary }]}>{interview.role || 'General Interview'}</Text>
                  <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>{interview.type || 'Behavioral'} • {new Date(interview.updated_at).toLocaleDateString()}</Text>
                  {!interview.feedback && <Text style={{ color: colors.warning, fontSize: 12, marginTop: 4, fontWeight: '600' }}>Incomplete</Text>}
                </View>
                {interview.feedback && (
                  <Text style={[styles.historyScore, { color: colors.textPrimary }]}>{interview.feedback.overall_score || '--'}%</Text>
                )}
              </View>
              {interview.feedback ? (
                <Pressable 
                  style={[styles.viewFeedbackBtn, { borderTopColor: colors.border }]}
                  onPress={() => router.push({ pathname: '/feedback', params: { sessionId: interview.id, fromList: 'true' } })}
                >
                  <Text style={[styles.viewFeedbackText, { color: colors.primary }]}>View Feedback →</Text>
                </Pressable>
              ) : (
                <Pressable 
                  style={[styles.viewFeedbackBtn, { borderTopColor: colors.border }]}
                  onPress={() => {
                    Alert.alert(
                      "Delete Interview",
                      "Are you sure you want to delete this incomplete interview?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { 
                          text: "Delete", 
                          style: "destructive",
                          onPress: () => deleteMutation.mutateAsync(interview.id)
                        }
                      ]
                    );
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Text style={[styles.viewFeedbackText, { color: colors.error }]}>Delete Incomplete Interview</Text>
                </Pressable>
              )}
            </Card>
          ))
        ) : (
          <Text style={[styles.historyMeta, { color: colors.textMuted, textAlign: 'center', marginTop: 20 }]}>No past interviews yet.</Text>
        )}

        <View style={{ height: bottomNavPadding }} />
        </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  pageHeader: {
    marginBottom: Spacing.xl,
  },
  pageTitle: {
    ...Typography.displayMd,
    marginBottom: 4,
  },
  pageSubtitle: {
    ...Typography.bodyMd,
  },
  setupCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    ...Typography.bodyLg,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.headingMd,
    marginBottom: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    ...Typography.bodyLg,
  },
  rowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.bodyMd,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.md,
  },
  historyCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  historyInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  historyRole: {
    ...Typography.subtitle1,
  },
  historyMeta: {
    ...Typography.bodySm,
  },
  historyScore: {
    ...Typography.headingLg,
  },
  viewFeedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  viewFeedbackText: {
    ...Typography.bodyMd,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    gap: 8,
    ...Shadow.card,
  },
  primaryBtnText: {
    ...Typography.headingMd,
    color: '#fff',
    fontWeight: '600',
  }
});
