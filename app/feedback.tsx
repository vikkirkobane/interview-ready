import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../src/theme';
import { ScoreRing } from '../src/components/ui';
import { useInterviewFeedbackMutation } from '../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function FeedbackScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  
  const [feedbackData, setFeedbackData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const feedbackMutation = useInterviewFeedbackMutation();

  // Animation values
  const slideAnim1 = useRef(new Animated.Value(20)).current;
  const slideAnim2 = useRef(new Animated.Value(20)).current;
  const slideAnim3 = useRef(new Animated.Value(20)).current;
  const slideAnim4 = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        const res = await feedbackMutation.mutateAsync({
          session_id: sessionId as string
        });
        setFeedbackData(res.feedback);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Failed to get feedback', text2: e.message });
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [sessionId]);

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
  }, [loading]);

  if (loading) {
    return (
      <View style={[styles.flex, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textMuted }}>Analyzing interview performance...</Text>
      </View>
    );
  }

  const overallScore = feedbackData?.overall_score || 75;
  const dimensionScores = feedbackData?.dimension_scores || {
    communication: 82,
    technical_knowledge: 90,
    problem_solving: 75,
    confidence: 70,
    cultural_fit: 80
  };
  const strengths = feedbackData?.strengths || ['Concise Articulation'];
  const improvements = feedbackData?.areas_for_improvement || ['Action Quantification'];

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      {/* Top Navigation */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl, backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>Interview Ready</Text>
        </View>
        <View style={[styles.avatarWrapper, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIPQAwi5hse1-II3vUbcAau_oPk1LQuf2L2ISfgsRG_3Icyt2l8A3W-mJWKWWOCoejqbakWwb0OuqEg9Q02ditAr8COW7__HXcOENbgZqyywKaDI-Sc3TAy2HlfO29dKOhz4vQVQB7G-vXBDz9QMVzaRy_J827CM8ELUTF66kF2_YPGEzTl3sRwL4VM3Z3GtvwnycNzKmw6jKSIegd8sBuhiil7fFB7LAPm9CXVrhXYvkcDNHqUhWUWLqwqiTvnIfUOq7ZAFk3DgM' }}
            style={styles.avatarImage}
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section: Overall Score */}
        <Animated.View style={[styles.heroCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim1 }] }]}>
          <View style={styles.heroScoreWrapper}>
            <ScoreRing score={overallScore} size="xl" color={colors.primary} animate={true} />
            <Text style={[styles.heroScoreLabel, { color: colors.textMuted }]}>OVERALL SCORE</Text>
          </View>
          <View style={styles.heroTextContent}>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Great Progress, Alex!</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              {feedbackData?.feedback || "You've demonstrated a strong grasp of technical concepts. Refining your STAR delivery will bridge the gap to a Senior level performance."}
            </Text>
            <View style={styles.pillContainer}>
              <View style={[styles.pill, { backgroundColor: `${colors.success}33` }]}>
                <Text style={[styles.pillTextSuccess, { color: colors.success }]}>READY FOR JUNIOR+</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: `${colors.primary}33` }]}>
                <Text style={[styles.pillTextPrimary, { color: colors.primary }]}>TOP 15% OF CANDIDATES</Text>
              </View>
            </View>
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
            <Text style={[styles.bentoScoreText, { color: colors.primary }]}>{dimensionScores.communication}% {dimensionScores.communication >= 80 ? 'Excellent' : dimensionScores.communication >= 60 ? 'Good' : 'Developing'}</Text>
          </View>

          <View style={[styles.bentoCard, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.bgPrimary }]}>
               <Ionicons name="code-slash-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Technical Knowledge</Text>
            <View style={[styles.bentoProgressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.bentoProgressFill, { width: `${dimensionScores.technical_knowledge}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.bentoScoreText, { color: colors.primary }]}>{dimensionScores.technical_knowledge}% {dimensionScores.technical_knowledge >= 80 ? 'Expert' : dimensionScores.technical_knowledge >= 60 ? 'Good' : 'Developing'}</Text>
          </View>

          <View style={[styles.bentoCard, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.bgPrimary }]}>
               <MaterialCommunityIcons name="puzzle-outline" size={24} color={dimensionScores.problem_solving >= 60 ? colors.primary : colors.warning} />
            </View>
            <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Problem Solving</Text>
            <View style={[styles.bentoProgressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.bentoProgressFill, { width: `${dimensionScores.problem_solving}%`, backgroundColor: dimensionScores.problem_solving >= 60 ? colors.primary : colors.warning }]} />
            </View>
            <Text style={[styles.bentoScoreText, { color: dimensionScores.problem_solving >= 60 ? colors.primary : colors.warning }]}>{dimensionScores.problem_solving}% {dimensionScores.problem_solving >= 80 ? 'Excellent' : dimensionScores.problem_solving >= 60 ? 'Good' : 'Developing'}</Text>
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
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]} 
            activeOpacity={0.8}
            onPress={() => router.push('/interview')}
          >
            <Ionicons name="refresh" size={20} color={colors.textInverse} />
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>Practice Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]} activeOpacity={0.6}>
            <Ionicons name="download-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>Download Report</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
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
