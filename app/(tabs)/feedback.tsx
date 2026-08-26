import { Pressable ,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useEffect, useRef, useState } from 'react';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { ScoreRing } from '../../src/components/ui';
import { useInterviewFeedbackMutation, useDeleteMockInterviewMutation, useInterviewQuery } from '../../src/hooks/useApi';
import { useAuthStore } from '../../src/stores/auth-store';
import { useNotificationStore } from '../../src/stores/notification-store';
import { exportInterviewReportPDF } from '../../src/lib/interviewExport';
import Toast from 'react-native-toast-message';
import { getUserFriendlyErrorMessage } from '../../src/lib/errorHandler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Image } from 'expo-image';

export default function FeedbackScreen() {
  const router = useRouter();
  const { sessionId, id, fromList, duration } = useLocalSearchParams();
  const actualSessionId = (sessionId || id) as string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  
  const [feedbackData, setFeedbackData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const feedbackMutation = useInterviewFeedbackMutation();
  const deleteMutation = useDeleteMockInterviewMutation();
  const { data: interviewRecord } = useInterviewQuery(actualSessionId);

  // Animation values
  const [slideAnim1] = useState(() => new Animated.Value(20));
  const [slideAnim2] = useState(() => new Animated.Value(20));
  const [slideAnim3] = useState(() => new Animated.Value(20));
  const [slideAnim4] = useState(() => new Animated.Value(20));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!actualSessionId) {
        setLoading(false);
        return;
      }
      try {
        const res = await feedbackMutation.mutateAsync({
          session_id: actualSessionId,
          duration: duration ? Number(duration) : undefined,
        });
        setFeedbackData(res.feedback);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Failed to get feedback', text2: e.message });
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualSessionId]);

  useEffect(() => {
    if (!loading) {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(slideAnim1, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(slideAnim2, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim3, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim4, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (loading) {
    return (
      <View style={[styles.flex, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textMuted }}>Analyzing interview performance...</Text>
      </View>
    );
  }

  if (!feedbackData) {
    return (
      <View style={[styles.flex, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgSecondary }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
        <Text style={{ marginTop: 16, color: colors.textPrimary, ...Typography.headingLg }}>No Feedback Available</Text>
        <Text style={{ marginTop: 8, color: colors.textMuted, textAlign: 'center', marginHorizontal: Spacing.xl }}>
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          We couldn't generate feedback for this interview. It might have been too short or encountered an error.
        </Text>
        <Pressable 
          style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: Spacing.xl }]} 
          onPress={() => router.push('/interviews')}
        >
          <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Return to Interviews</Text>
        </Pressable>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Interview",
      "Are you sure you want to delete this mock interview? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              if (!actualSessionId) return;
              await deleteMutation.mutateAsync(actualSessionId as string);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', getUserFriendlyErrorMessage(e.message, 'Failed to delete mock interview.'));
            }
          }
        }
      ]
    );
  };

  const handleDownloadReport = async () => {
    if (!feedbackData) return;
    setDownloading(true);
    try {
      const candidateName = user?.user_metadata?.full_name
        || `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim()
        || '';
      await exportInterviewReportPDF(interviewRecord || {}, feedbackData, {
        candidateName,
        role: interviewRecord?.role || '',
        company: interviewRecord?.company || '',
      });
      Toast.show({ type: 'success', text1: 'Report Downloaded', text2: 'Your interview report PDF has been generated.' });
      addNotification({
        title: 'Interview Report Downloaded',
        description: 'Your interview feedback report has been exported as PDF',
        type: 'success',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Download Failed', text2: getUserFriendlyErrorMessage(e.message, 'Failed to generate interview report.') });
    } finally {
      setDownloading(false);
    }
  };

  const overallScore = feedbackData?.overall_score || 0;
  const dimensionScores = feedbackData?.dimension_scores || {
    communication: 0,
    technical_knowledge: 0,
    problem_solving: 0,
    confidence: 0,
    cultural_fit: 0
  };
  const strengths = feedbackData?.strengths || [];
  const improvements = feedbackData?.areas_for_improvement || [];

  const handleBack = () => {
    if (fromList === 'true') {
      router.back();
    } else {
      router.replace('/(tabs)/interviews');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.xl }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back to interviews"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Interview Feedback</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>AI-powered evaluation and performance breakdown</Text>
        </View>

        {/* Hero Section: Overall Score */}
        <Animated.View style={[styles.heroCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim1 }] }]}>
          <View style={styles.heroScoreWrapper}>
            <ScoreRing score={overallScore} size="xl" color={colors.primary} animate={true} />
            <Text style={[styles.heroScoreLabel, { color: colors.textMuted }]}>SCORE</Text>
          </View>
          <View style={styles.heroTextContent}>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Interview Complete!</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              {feedbackData?.recommendation || feedbackData?.hiring_recommendation || "Here is your detailed feedback."}
            </Text>
          </View>
        </Animated.View>

        {/* Score Breakdown Bento Grid */}
        <Animated.View style={[styles.bentoGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim2 }] }]}>
          
          <View style={[styles.bentoCard, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.bgPrimary }]}>
               <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Communication</Text>
            <View style={[styles.bentoProgressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.bentoProgressFill, { width: `${dimensionScores.communication}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.bentoScoreText, { color: colors.primary }]}>{dimensionScores.communication}%</Text>
          </View>

          <View style={[styles.bentoCard, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.bgPrimary }]}>
               <Ionicons name="code-slash-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Technical Knowledge</Text>
            <View style={[styles.bentoProgressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.bentoProgressFill, { width: `${dimensionScores.technical_knowledge}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.bentoScoreText, { color: colors.primary }]}>{dimensionScores.technical_knowledge}%</Text>
          </View>

          <View style={[styles.bentoCard, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.bgPrimary }]}>
               <MaterialCommunityIcons name="puzzle-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Problem Solving</Text>
            <View style={[styles.bentoProgressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.bentoProgressFill, { width: `${dimensionScores.problem_solving}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.bentoScoreText, { color: colors.primary }]}>{dimensionScores.problem_solving}%</Text>
          </View>

        </Animated.View>

        {/* Strengths & Improvements */}
        <Animated.View style={[styles.feedbackGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim3 }] }]}>
          
          {/* Strengths */}
          <View style={styles.feedbackColumn}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.feedbackHeaderTitle, { color: colors.textPrimary }]}>Core Strengths</Text>
            </View>
            <View style={styles.feedbackList}>
              {strengths.map((strength: string, index: number) => (
                <View key={index} style={[styles.feedbackItem, { backgroundColor: colors.bgPrimary }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginTop: 2 }} />
                  <View style={styles.feedbackItemTextContent}>
                    <Text style={[styles.feedbackItemTitle, { color: colors.textPrimary }]}>Strength</Text>
                    <Text style={[styles.feedbackItemBody, { color: colors.textMuted }]}>{strength}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Improvements */}
          <View style={styles.feedbackColumn}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="alert-circle" size={18} color={colors.warning} />
              <Text style={[styles.feedbackHeaderTitle, { color: colors.textPrimary }]}>Improvement Areas</Text>
            </View>
            <View style={styles.feedbackList}>
              {improvements.map((area: string, index: number) => (
                <View key={index} style={[styles.feedbackItem, { backgroundColor: colors.bgPrimary }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.warning} style={{ marginTop: 2 }} />
                  <View style={styles.feedbackItemTextContent}>
                    <Text style={[styles.feedbackItemTitle, { color: colors.textPrimary }]}>Area to Improve</Text>
                    <Text style={[styles.feedbackItemBody, { color: colors.textMuted }]}>{area}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

        </Animated.View>

        {/* Interview Summary */}
        {feedbackData?.interview_summary ? (
          <Animated.View style={[styles.summaryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim3 }] }]}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={[styles.feedbackHeaderTitle, { color: colors.textPrimary }]}>Interview Summary</Text>
            </View>
            <Text style={[styles.summaryBody, { color: colors.textBody }]}>{feedbackData.interview_summary}</Text>
          </Animated.View>
        ) : null}

        {/* Question-by-Question Feedback */}
        {Array.isArray(feedbackData?.question_feedback) && feedbackData.question_feedback.length > 0 ? (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim3 }] }}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.primary} />
              <Text style={[styles.feedbackHeaderTitle, { color: colors.textPrimary }]}>Question-by-Question Feedback</Text>
            </View>
            <View style={styles.questionList}>
              {feedbackData.question_feedback.map((q: any, index: number) => (
                <View key={index} style={[styles.questionCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                  <View style={styles.questionCardHeader}>
                    <Text style={[styles.questionCardLabel, { color: colors.primary }]}>Question {index + 1}</Text>
                    <View style={[styles.questionScoreBadge, { backgroundColor: `${q.score >= 80 ? colors.success : q.score >= 60 ? colors.warning : colors.error}1A` }]}>
                      <Text style={[styles.questionScoreText, { color: q.score >= 80 ? colors.success : q.score >= 60 ? colors.warning : colors.error }]}>
                        {q.score}/100
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.questionText, { color: colors.textPrimary }]}>{q.question}</Text>
                  <Text style={[styles.questionAnswer, { color: colors.textBody }]}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Your answer: </Text>
                    {q.answer}
                  </Text>
                  <Text style={[styles.questionFeedback, { color: colors.primary }]}>
                    <Text style={{ fontWeight: '700' }}>Feedback: </Text>
                    {q.feedback}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* Suggested Follow-Up Topics */}
        {Array.isArray(feedbackData?.suggested_follow_up) && feedbackData.suggested_follow_up.length > 0 ? (
          <Animated.View style={[styles.followUpCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim4 }] }]}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="trending-up" size={18} color={colors.success} />
              <Text style={[styles.feedbackHeaderTitle, { color: colors.textPrimary }]}>Suggested Follow-Up Topics</Text>
            </View>
            <View style={styles.listContent}>
              {feedbackData.suggested_follow_up.map((topic: string, index: number) => (
                <View key={index} style={styles.listItem}>
                  <Ionicons name="ellipse" size={8} color={colors.success} style={{ marginTop: 6, marginRight: Spacing.sm }} />
                  <Text style={[styles.listItemText, { color: colors.textBody }]}>{topic}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* CTA Section */}
        <Animated.View style={[styles.ctaSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim4 }] }]}>
          <Pressable 
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]} 
            
            onPress={() => router.push('/interviews')}
          >
            <Ionicons name="refresh" size={20} color={colors.textInverse} />
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Practice Again</Text>
          </Pressable>

          <Pressable 
            style={[styles.secondaryBtn, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]} 
            onPress={handleDownloadReport}
            disabled={downloading}
            accessibilityRole="button"
            accessibilityLabel="Download interview feedback report"
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Ionicons name="download-outline" size={20} color={colors.textPrimary} />
            )}
            <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Download Report</Text>
          </Pressable>

          {actualSessionId && fromList === 'true' && (
            <Pressable 
              style={[styles.secondaryBtn, { backgroundColor: colors.bgPrimary, borderColor: colors.error, marginTop: Spacing.md }]} 
              
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.secondaryBtnText, { color: colors.error }]}>Delete Interview</Text>
                </>
              )}
            </Pressable>
          )}
        </Animated.View>

        </ScrollView>

        <View style={{ height: bottomNavPadding }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    zIndex: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuBtn: {
    padding: Spacing.xs,
    gap: 4,
  },
  headerTitle: {
    ...Typography.displayMd,
    fontSize: 20,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 896, // 4xl
    gap: Spacing.xl,
  },
  pageHeader: {
    marginBottom: Spacing.xs,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    padding: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    ...Shadow.sm,
  },
  pageTitle: {
    ...Typography.displayMd,
    marginBottom: 4,
  },
  pageSubtitle: {
    ...Typography.bodyMd,
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadow.sm,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  heroScoreWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS !== 'web' ? Spacing.md : 0,
  },
  heroScoreLabel: {
    position: 'absolute',
    bottom: 24, // Shift up slightly within the ring
    ...Typography.label,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  heroTextContent: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  heroTitle: {
    ...Typography.displayMd,
    marginBottom: Spacing.sm,
    textAlign: Platform.OS === 'web' ? 'left' : 'center',
  },
  heroSubtitle: {
    ...Typography.bodyLg,
    lineHeight: 24,
    marginBottom: Spacing.md,
    textAlign: Platform.OS === 'web' ? 'left' : 'center',
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pillTextSuccess: {
    ...Typography.label,
  },
  pillTextPrimary: {
    ...Typography.label,
  },
  bentoGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.md,
  },
  bentoCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bentoIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
    marginBottom: Spacing.xs,
  },
  bentoTitle: {
    ...Typography.headingMd,
  },
  bentoProgressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  bentoProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bentoScoreText: {
    ...Typography.label,
    marginTop: Spacing.xs,
  },
  feedbackGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.xl,
  },
  feedbackColumn: {
    flex: 1,
    gap: Spacing.md,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  feedbackHeaderTitle: {
    ...Typography.headingLg,
  },
  feedbackList: {
    gap: Spacing.sm,
  },
  feedbackItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  feedbackItemTextContent: {
    flex: 1,
  },
  feedbackItemTitle: {
    ...Typography.headingMd,
    marginBottom: 2,
  },
  feedbackItemBody: {
    ...Typography.bodySm,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  summaryBody: {
    ...Typography.bodyMd,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  questionList: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  questionCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadow.sm,
  },
  questionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  questionCardLabel: {
    ...Typography.headingMd,
    fontWeight: '700',
  },
  questionScoreBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  questionScoreText: {
    ...Typography.label,
    fontWeight: '700',
  },
  questionText: {
    ...Typography.bodyMd,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  questionAnswer: {
    ...Typography.bodyMd,
    marginBottom: Spacing.xs,
  },
  questionFeedback: {
    ...Typography.bodyMd,
  },
  followUpCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  listContent: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listItemText: {
    ...Typography.bodyMd,
    flex: 1,
    lineHeight: 22,
  },
  ctaSection: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.sm,
    ...Shadow.lg,
    width: Platform.OS === 'web' ? 'auto' : '100%',
  },
  primaryBtnText: {
    ...Typography.headingMd,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.sm,
    width: Platform.OS === 'web' ? 'auto' : '100%',
  },
  secondaryBtnText: {
    ...Typography.headingMd,
  },
});
