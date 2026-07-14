import React, { useState } from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Colors, Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { ScoreRing, AdBanner } from '../../src/components/ui';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { useJobApplicationQuery, useDeleteJobApplicationMutation, useGenerateRoadmapMutation } from '../../src/hooks/useApi';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCredits } from '../../src/hooks/useCredits';
import { exportRoadmapPDF } from '../../src/lib/roadmapExport';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/auth-store';

export default function JobMatchResultsScreen() {
  const bottomNavPadding = useSafeAreaInsets().bottom + 72;
  const { id, fromList } = useLocalSearchParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colors, isDark } = useTheme();
  const { isDesktop } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';

  const { data: jobApplication, isLoading, error } = useJobApplicationQuery(id as string);
  const deleteMutation = useDeleteJobApplicationMutation();
  const generateRoadmap = useGenerateRoadmapMutation();
  const [isDownloading, setIsDownloading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deductCredits } = useCredits();

  const handleDelete = () => {
    Alert.alert(
      'Delete Analysis',
      'Are you sure you want to delete this job match analysis? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(id as string);
              router.replace('/(tabs)/job-analyzer');
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err) {
              Alert.alert('Error', 'Failed to delete analysis.');
            }
          }
        }
      ]
    );
  };
  let parsedSummary = null;
  try {
    parsedSummary = jobApplication?.jd_summary ? JSON.parse(jobApplication.jd_summary) : null;
  } catch (e) {
    console.error("Failed to parse jd_summary", e);
  }

  const analysisResult = parsedSummary ? {
    fit_score: jobApplication?.match_score || parsedSummary.fit_score || 0,
    missing_bonus_skills: parsedSummary.missing_bonus_skills?.map((s: any) => typeof s === 'string' ? { skill: s } : s) || jobApplication?.missing_skills?.map((s: string) => ({ skill: s })) || [],
    required_skills: parsedSummary.required_skills?.map((s: any) => typeof s === 'string' ? { skill: s } : s) || jobApplication?.required_skills?.map((s: string) => ({ skill: s })) || [],
    match_analysis: parsedSummary.match_analysis || []
  } : null;

  const handleDownloadRoadmap = async () => {
    if (!id) return;
    
    setIsDownloading(true);
    try {
      const roadmapResult = await generateRoadmap.mutateAsync({ job_id: id as string });
      await exportRoadmapPDF(roadmapResult.data);
      Alert.alert('Success', 'Your personalized skill roadmap has been downloaded.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate roadmap.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.bgSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !jobApplication) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.bgSecondary }]}>
        <Text style={[Typography.bodyLg, { color: colors.error }]}>Failed to load match results.</Text>
        <Pressable style={{ marginTop: Spacing.md }} onPress={() => router.replace('/(tabs)/job-analyzer')}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingBottom: Spacing.xl + insets.bottom }]} 
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.replace('/(tabs)/job-analyzer')}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>Back</Text>
        </Pressable>

        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          Match Analysis: {jobApplication.job_title} @ {jobApplication.company}
        </Text>

        <View style={styles.rightColumn}>
          {/* Global Match Score */}
          <View style={[styles.glassCard, styles.matchCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.matchScoreTopBorder, { backgroundColor: colors.success }]} />
            <View style={[styles.matchContent, { flexDirection: isDesktop ? 'row' : 'column' }]}>
              <View style={styles.scoreContainer}>
                <ScoreRing score={analysisResult?.fit_score ?? 92} size="xl" color={colors.success} animate={false} />
              </View>
              <View style={styles.matchTextContent}>
                <View style={[styles.strongCandidateBadge, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.strongCandidateText, { color: colors.success }]}>
                    {(analysisResult?.fit_score ?? 92) > 80 ? 'STRONG CANDIDATE' : 'NEEDS OPTIMIZATION'}
                  </Text>
                </View>
                <Text style={[styles.matchTierText, { color: colors.textPrimary }]}>
                  {(analysisResult?.fit_score ?? 92) > 80 ? 'Elite Velocity Tier' : 'Growth Potential'}
                </Text>
                <Text style={[styles.matchDescText, { color: colors.textBody }]}>
                  {(analysisResult?.fit_score ?? 92) > 80 
                    ? 'You exceed the technical baseline for this role.' 
                    : 'You are missing some key requirements, but a tailored resume can help bridge the gap.'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.bentoRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            {/* Skill Gap Card */}
            <View style={[styles.glassCard, styles.bentoHalfCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, isDesktop && { flex: 1 }]}>
              <View style={styles.bentoHeader}>
                <View style={[styles.warningIconBox, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="warning" size={18} color={colors.warning} />
                </View>
                <Text style={[styles.bentoHeaderLabel, { color: colors.textMuted }]}>CRITICAL GAPS</Text>
              </View>
              <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>
                {analysisResult?.missing_bonus_skills?.length || 2} Missing Skills
              </Text>
              
              <View style={styles.bulletList}>
                {analysisResult?.missing_bonus_skills?.slice(0, 3).map((skill: any, idx: number) => (
                  <View key={idx} style={styles.bulletItem}>
                    <View style={[styles.bulletDot, { backgroundColor: colors.warning }]} />
                    <Text style={[styles.bulletText, { color: colors.textBody }]}>{skill.skill}</Text>
                  </View>
                )) || (
                  <>
                    <View style={styles.bulletItem}>
                      <View style={[styles.bulletDot, { backgroundColor: colors.warning }]} />
                      <Text style={[styles.bulletText, { color: colors.textBody }]}>Distributed Systems Design</Text>
                    </View>
                    <View style={styles.bulletItem}>
                      <View style={[styles.bulletDot, { backgroundColor: colors.warning }]} />
                      <Text style={[styles.bulletText, { color: colors.textBody }]}>Rust (Lower-level performance)</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Resume Keywords Card */}
            <View style={[styles.glassCard, styles.bentoHalfCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, isDesktop && { flex: 1 }]}>
              <View style={styles.bentoHeader}>
                <View style={[styles.primaryIconBox, { backgroundColor: `${colors.primary}1A` }]}>
                  <Ionicons name="search" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.bentoHeaderLabel, { color: colors.textMuted }]}>SEO MATCH</Text>
              </View>
              <Text style={[styles.bentoTitle, { color: colors.textPrimary }]}>Keyword Strength</Text>
              
              <View style={styles.keywordsCloud}>
                {analysisResult?.required_skills?.slice(0, 6).map((kw: any, i: number) => (
                  <View key={i} style={[styles.keywordPill, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                    <Text style={[styles.keywordText, { color: colors.textBody }]}>{kw.skill}</Text>
                  </View>
                )) || (
                  ['Kubernetes', 'Cloud Architecture', 'Microservices', '+14 more'].map((kw, i) => (
                    <View key={i} style={[styles.keywordPill, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                      <Text style={[styles.keywordText, { color: colors.textBody }]}>{kw}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>

          {/* Roadmap Preview Card */}
          <View style={[styles.roadmapCard, { backgroundColor: '#293040' }]}>
            <View style={[styles.roadmapContent, { flexDirection: isDesktop ? 'row' : 'column' }]}>
              <View style={styles.roadmapTextSection}>
                <Text style={styles.roadmapTitle}>Bridge the gap in 14 days</Text>
                {/* eslint-disable-next-line react/no-unescaped-entities */}
                <Text style={styles.roadmapDesc}>We've generated a customized roadmap to cover your missing skills before the interview cycle starts.</Text>
                <Pressable 
                  style={[styles.roadmapBtn, { backgroundColor: colors.bgPrimary }]}
                  onPress={handleDownloadRoadmap}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.roadmapBtnText, { color: colors.primary }]}>Download Roadmap</Text>
                  )}
                </Pressable>
              </View>
              
              <View style={styles.roadmapSteps}>
                <View style={[styles.stepCircle, styles.stepCircleActive, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepCircleActiveText}>1</Text>
                </View>
                <View style={[styles.stepCircle, styles.stepCircleInactive, { left: -16 }]}>
                  <Text style={styles.stepCircleInactiveText}>2</Text>
                </View>
                <View style={[styles.stepCircle, styles.stepCircleInactive, { left: -32 }]}>
                  <Text style={styles.stepCircleInactiveText}>3</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Detailed Inventory Section */}
        <View style={[styles.inventorySection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.inventoryHeader}>
            <View>
              <Text style={[styles.inventoryTitle, { color: colors.primary }]}>Skills Inventory</Text>
              <Text style={[styles.inventoryDesc, { color: colors.textMuted }]}>A granular breakdown of how your background matches the requirements.</Text>
            </View>
          </View>

          <View style={[styles.inventoryGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            {(analysisResult?.match_analysis && analysisResult.match_analysis.length > 0) ? (
              analysisResult?.match_analysis?.map((item: any, idx: number) => {
                let icon;
                let color;
                let label;
                let iconBoxStyle;

                if (item.type === 'SUCCESS') {
                  icon = <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
                  color = colors.success;
                  label = '100% Match';
                  iconBoxStyle = [styles.successIconBox, { backgroundColor: colors.successLight }];
                } else if (item.type === 'WARNING') {
                  icon = <Ionicons name="warning" size={20} color={colors.warning} />;
                  color = colors.warning;
                  label = 'Partial Match';
                  iconBoxStyle = [styles.warningIconBoxLight, { backgroundColor: colors.warningLight }];
                } else if (item.type === 'PRIMARY') {
                  icon = <Ionicons name="star" size={20} color={colors.primary} />;
                  color = colors.primary;
                  label = 'Bonus Multiplier';
                  iconBoxStyle = [styles.primaryIconBoxLight, { backgroundColor: `${colors.primary}1A` }];
                } else {
                  icon = <Ionicons name="remove-circle" size={20} color={colors.textMuted} />;
                  color = colors.textMuted;
                  label = 'Neutral';
                  iconBoxStyle = [styles.successIconBox, { backgroundColor: colors.bgSecondary }];
                }

                return (
                  <View key={idx} style={[styles.inventoryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }, isDesktop && { flex: 1 }]}>
                    <View style={styles.inventoryCardHeader}>
                      <View style={iconBoxStyle}>
                        {icon}
                      </View>
                      <Text style={[styles.successLabel, { color }]}>{label}</Text>
                    </View>
                    <Text style={[styles.inventoryItemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.inventoryItemDesc, { color: colors.textBody }]}>{item.description}</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.bgSecondary }]}>
                      <View style={[styles.progressBarFill, { width: `${item.score_percentage}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })
            ) : (
              <>
                <View style={[styles.inventoryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }, isDesktop && { flex: 1 }]}>
                  <View style={styles.inventoryCardHeader}>
                    <View style={[styles.successIconBox, { backgroundColor: colors.successLight }]}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    </View>
                    <Text style={[styles.successLabel, { color: colors.success }]}>100% Match</Text>
                  </View>
                  <Text style={[styles.inventoryItemTitle, { color: colors.textPrimary }]}>Systems Architecture</Text>
                  <Text style={[styles.inventoryItemDesc, { color: colors.textBody }]}>Found 8 projects in your portfolio demonstrating expert proficiency.</Text>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.bgSecondary }]}>
                    <View style={[styles.progressBarFill, { width: '100%', backgroundColor: colors.success }]} />
                  </View>
                </View>
                <View style={[styles.inventoryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }, isDesktop && { flex: 1 }]}>
                  <View style={styles.inventoryCardHeader}>
                    <View style={[styles.warningIconBoxLight, { backgroundColor: colors.warningLight }]}>
                      <Ionicons name="warning" size={20} color={colors.warning} />
                    </View>
                    <Text style={[styles.warningLabel, { color: colors.warning }]}>Partial Match</Text>
                  </View>
                  <Text style={[styles.inventoryItemTitle, { color: colors.textPrimary }]}>Team Leadership</Text>
                  <Text style={[styles.inventoryItemDesc, { color: colors.textBody }]}>JD requires 5+ years; your profile indicates 3.5 years of direct experience.</Text>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.bgSecondary }]}>
                    <View style={[styles.progressBarFill, { width: '70%', backgroundColor: colors.warning }]} />
                  </View>
                </View>
                <View style={[styles.inventoryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }, isDesktop && { flex: 1 }]}>
                  <View style={styles.inventoryCardHeader}>
                    <View style={[styles.primaryIconBoxLight, { backgroundColor: `${colors.primary}1A` }]}>
                      <Ionicons name="star" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.primaryLabel, { color: colors.primary }]}>Bonus Multiplier</Text>
                  </View>
                  <Text style={[styles.inventoryItemTitle, { color: colors.textPrimary }]}>Public Speaking</Text>
                  {/* eslint-disable-next-line react/no-unescaped-entities */}
                  <Text style={[styles.inventoryItemDesc, { color: colors.textBody }]}>JD mentions "good to have"; your conference record is a strong differentiator.</Text>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.bgSecondary }]}>
                    <View style={[styles.progressBarFill, { width: '100%', backgroundColor: colors.primary }]} />
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {id && fromList === 'true' && (
          <Pressable 
            style={[styles.deleteBtn, { backgroundColor: colors.error + '1A', borderColor: colors.error }]} 
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete Analysis</Text>
              </>
            )}
          </Pressable>
        )}
        </ScrollView>
        {!isPro ? <AdBanner /> : <View style={{ height: bottomNavPadding }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  container: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl, // Bottom nav padding
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  backBtnText: {
    ...Typography.headingMd,
  },
  pageTitle: {
    ...Typography.displayMd,
    marginBottom: Spacing.xl,
  },
  rightColumn: {
    gap: Spacing.lg,
  },
  matchCard: {
    overflow: 'hidden',
    padding: 0,
  },
  matchScoreTopBorder: {
    height: 4,
    width: '100%',
  },
  matchContent: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  scoreContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTextContent: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  strongCandidateBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  strongCandidateText: {
    ...Typography.label,
  },
  matchTierText: {
    ...Typography.displayMd,
    marginBottom: Spacing.md,
    textAlign: Platform.OS === 'web' ? 'left' : 'center',
  },
  matchDescText: {
    ...Typography.bodyLg,
    textAlign: Platform.OS === 'web' ? 'left' : 'center',
  },
  glassCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadow.card,
  },
  bentoRow: {
    gap: Spacing.lg,
  },
  bentoHalfCard: {},
  bentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  warningIconBox: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  primaryIconBox: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  bentoHeaderLabel: {
    ...Typography.label,
  },
  bentoTitle: {
    ...Typography.headingLg,
    marginBottom: Spacing.md,
  },
  bulletList: {
    gap: Spacing.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    ...Typography.bodyMd,
  },
  keywordsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  keywordPill: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  keywordText: {
    ...Typography.label,
  },
  roadmapCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
    ...Shadow.card,
  },
  roadmapContent: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  roadmapTextSection: {
    flex: 1,
  },
  roadmapTitle: {
    ...Typography.displayMd,
    color: '#ffffff',
    marginBottom: Spacing.sm,
  },
  roadmapDesc: {
    ...Typography.bodyMd,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Spacing.lg,
  },
  roadmapBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  roadmapBtnText: {
    ...Typography.headingMd,
  },
  roadmapSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
  },
  stepCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#293040',
  },
  stepCircleActive: {
    zIndex: 3,
  },
  stepCircleInactive: {
    backgroundColor: '#e1e8fd',
    zIndex: 2,
  },
  stepCircleActiveText: {
    ...Typography.headingLg,
    color: '#ffffff',
  },
  stepCircleInactiveText: {
    ...Typography.headingLg,
    color: '#5221E6',
  },
  inventorySection: {
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Shadow.card,
  },
  inventoryHeader: {
    marginBottom: Spacing.xl,
  },
  inventoryTitle: {
    ...Typography.displayLg,
  },
  inventoryDesc: {
    ...Typography.bodyLg,
    marginTop: 4,
  },
  inventoryGrid: {
    gap: Spacing.xl,
  },
  inventoryCard: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  inventoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  successIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningIconBoxLight: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryIconBoxLight: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successLabel: {
    ...Typography.label,
  },
  warningLabel: {
    ...Typography.label,
  },
  primaryLabel: {
    ...Typography.label,
  },
  inventoryItemTitle: {
    ...Typography.headingMd,
    marginBottom: Spacing.xs,
  },
  inventoryItemDesc: {
    ...Typography.bodySm,
    marginBottom: Spacing.lg,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  deleteBtnText: {
    ...Typography.bodyLg,
    fontWeight: '600',
  },
});
