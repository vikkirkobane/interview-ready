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
import { useInterviewFeedbackMutation, useDeleteMockInterviewMutation } from '../../src/hooks/useApi';
import { useAuthStore } from '../../src/stores/auth-store';
import Toast from 'react-native-toast-message';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Image } from 'expo-image';

export default function FeedbackScreen() {
  const router = useRouter();
  const { sessionId, id, fromList } = useLocalSearchParams();
  const actualSessionId = (sessionId || id) as string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  
  const [feedbackData, setFeedbackData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const feedbackMutation = useInterviewFeedbackMutation();
  const deleteMutation = useDeleteMockInterviewMutation();

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
          session_id: actualSessionId
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
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
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

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.xl }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section: Overall Score */}
        <Animated.View style={[styles.heroCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim1 }] }]}>
          <View style={styles.heroScoreWrapper}>
            <ScoreRing score={overallScore} size="xl" color={colors.primary} animate={true} />
            <Text style={[styles.heroScoreLabel, { color: colors.textMuted }]}>SCORE</Text>
          </View>
          <View style={styles.heroTextContent}>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Interview Complete!</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              {feedbackData?.hiring_recommendation || "Here is your detailed feedback."}
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
            
            onPress={() => Toast.show({ type: 'info', text1: 'Downloading Report', text2: 'Your PDF report is being generated.' })}
          >
            <Ionicons name="download-outline" size={20} color={colors.textPrimary} />
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
