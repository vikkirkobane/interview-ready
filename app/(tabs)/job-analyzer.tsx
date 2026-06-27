import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { ScoreRing, Button, Badge } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { useAnalyzeJobMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export default function JobFitScreen() {
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { colors, isDark } = useTheme();
  const userName = user?.user_metadata?.first_name || 'Alex';
  const { isDesktop } = useBreakpoint();
  const analyzeJob = useAnalyzeJobMutation();

  const handleAnalyze = async () => {
    setUrlError('');
    if (jdText.length < 20 && !jdUrl) {
      Toast.show({ type: 'error', text1: 'Input missing', text2: 'Please paste a job description or provide a valid URL.' });
      return;
    }

    try {
      // If user provided sufficient text, ignore the URL completely
      const finalJdUrl = jdText.trim().length >= 20 ? '' : jdUrl;
      
      const result = await analyzeJob.mutateAsync({ jdText, jdUrl: finalJdUrl, profileData: profile });
      setAnalysisResult(result.analysis);
      setIsAnalyzed(true);
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
        <View style={[styles.mainGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          
          {/* LEFT COLUMN: Input & Controls */}
          <View style={[styles.leftColumn, isDesktop && { flex: 5 }]}>
            
            {/* Hero Section */}
            <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
              <Text style={[styles.heroTitle, { color: colors.textInverse }]}>Job Fit Analyzer</Text>
              <Text style={styles.heroDesc}>Benchmark your profile against specific roles to identify high-impact gaps.</Text>
              
              <View style={styles.profileBadge}>
                <Ionicons name="person" size={14} color={colors.primary} style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.profileBadgeLabel}>CURRENT PROFILE</Text>
                  <Text style={[styles.profileBadgeRole, { color: colors.textInverse }]}>{(profile as any)?.current_role || 'Candidate'}</Text>
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
                  <TouchableOpacity style={styles.attachBtn}>
                     <Ionicons name="document-attach" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.analyzeBtn, { backgroundColor: colors.primary }, analyzeJob.isPending && { opacity: 0.7 }]}
                    onPress={handleAnalyze}
                    disabled={analyzeJob.isPending}
                  >
                    {analyzeJob.isPending ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <Text style={[styles.analyzeBtnText, { color: colors.textInverse }]}>Analyze Fit</Text>
                        <Text style={{ color: colors.textInverse, ...Typography.headingMd }}>→</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Tips Card - Elevated Style */}
            <View style={[styles.tipCard, { backgroundColor: colors.bgCard }]}>
              <Ionicons name="bulb" size={18} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: colors.primary }]}>Expert Insight</Text>
                <Text style={[styles.tipDesc, { color: colors.textBody }]}>Including specific tech stack requirements yields 40% more accurate skill gap identification.</Text>
              </View>
            </View>

          </View>

          {/* RIGHT COLUMN: Results & Bento Grid */}
          {isAnalyzed && (
            <View style={[styles.rightColumn, isDesktop && { flex: 7 }]}>
              
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
                    <Text style={styles.roadmapDesc}>We've generated a customized roadmap to cover your missing skills before the interview cycle starts.</Text>
                    <TouchableOpacity style={[styles.roadmapBtn, { backgroundColor: colors.bgPrimary }]}>
                      <Text style={[styles.roadmapBtnText, { color: colors.primary }]}>View Roadmap</Text>
                    </TouchableOpacity>
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
          )}

        </View>

        {/* Detailed Inventory Section */}
        {isAnalyzed && (
          <View style={[styles.inventorySection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.inventoryHeader}>
              <View>
                <Text style={[styles.inventoryTitle, { color: colors.primary }]}>Skills Inventory</Text>
                <Text style={[styles.inventoryDesc, { color: colors.textMuted }]}>A granular breakdown of how your background matches the requirements.</Text>
              </View>
            </View>

            <View style={[styles.inventoryGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
              
              {analysisResult?.match_analysis?.map((item: any, idx: number) => {
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
                  iconBoxStyle = [styles.successIconBox, { backgroundColor: colors.bgSecondary }]; // Fallback
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
              }) || (
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
                    <Text style={[styles.inventoryItemDesc, { color: colors.textBody }]}>JD mentions "good to have"; your conference record is a strong differentiator.</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.bgSecondary }]}>
                      <View style={[styles.progressBarFill, { width: '100%', backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

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
    maxWidth: 1200,
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
  rightColumn: {
    gap: Spacing.lg,
  },
  
  // Left Column Styles
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
  tipCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    ...Typography.headingMd,
  },
  tipDesc: {
    ...Typography.bodyMd,
    marginTop: 4,
  },

  // Right Column Styles
  matchCard: {
    overflow: 'hidden',
    padding: 0, // Reset padding for custom layout
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
    marginRight: 32, // Accommodate negative margin
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
    backgroundColor: '#e1e8fd', // surface-container-high
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

  // Detailed Inventory
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
});
