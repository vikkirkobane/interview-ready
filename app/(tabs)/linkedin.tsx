import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Typography, Spacing, Radius, useTheme } from '../../src/theme';
import { Card, Button, ScoreRing } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useLinkedinAnalyzeMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';

export default function LinkedinOptimizerScreen() {
  const { colors, isDark } = useTheme();
  const [analyzing, setAnalyzing] = useState(false);
  const [scoreData, setScoreData] = useState<{
    overall: number;
    headline: number;
    about: number;
    experience: number;
    skills: number;
  } | null>(null);

  const linkedinMutation = useLinkedinAnalyzeMutation();

  const handleAnalyze = async () => {
    setAnalyzing(true);
    
    try {
      const result = await linkedinMutation.mutateAsync({
        profile_url: 'https://linkedin.com/in/user' // In real app, pulled from auth/profile
      });
      setScoreData({
        overall: result.score || 72,
        headline: result.headline_score || 65,
        about: result.about_score || 80,
        experience: result.experience_score || 70,
        skills: result.skills_score || 85,
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Analysis Failed', text2: e.message });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgSecondary }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.bgPrimary }]}>
          <Ionicons name="logo-linkedin" size={32} color='#0A66C2' />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>LinkedIn Optimizer</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Ensure your profile ranks high in recruiter searches and makes a strong first impression.
        </Text>
      </View>

      {!scoreData && !analyzing && (
        <Card style={[styles.ctaCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Ready to optimize your profile?</Text>
          <Text style={[styles.ctaText, { color: colors.textSecondary }]}>
            We'll analyze your current profile against your target role and suggest AI-driven improvements for your Headline, About, and Experience sections.
          </Text>
          <Button 
            title="Analyze Profile (2 Credits)" 
            onPress={handleAnalyze} 
          />
        </Card>
      )}

      {analyzing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analyzing your LinkedIn profile...</Text>
        </View>
      )}

      {scoreData && !analyzing && (
        <View style={styles.resultsContainer}>
          <Card style={[styles.overallCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <ScoreRing score={scoreData.overall} size={120} />
            <Text style={[styles.overallLabel, { color: colors.textPrimary }]}>Overall Profile Score</Text>
            <Text style={[styles.overallDesc, { color: colors.textSecondary }]}>
              Your profile is in the top 30% for your role, but your headline needs more keywords.
            </Text>
          </Card>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Section Breakdown</Text>
          
          <SectionCard 
            title="Headline" 
            score={scoreData.headline} 
            desc="Missing key industry buzzwords. Make it more than just your job title."
            onOptimize={() => {}}
            colors={colors}
          />
          <SectionCard 
            title="About / Summary" 
            score={scoreData.about} 
            desc="Good narrative, but lacks quantifiable achievements."
            onOptimize={() => {}}
            colors={colors}
          />
          <SectionCard 
            title="Experience" 
            score={scoreData.experience} 
            desc="Ensure bullets focus on impact rather than just responsibilities."
            onOptimize={() => {}}
            colors={colors}
          />
          <SectionCard 
            title="Skills" 
            score={scoreData.skills} 
            desc="You have 45 skills listed. Try reordering to put top tech skills first."
            onOptimize={() => {}}
            colors={colors}
          />
        </View>
      )}
    </ScrollView>
  );
}

function SectionCard({ title, score, desc, onOptimize, colors }: { title: string, score: number, desc: string, onOptimize: () => void, colors: any }) {
  const isGood = score >= 80;
  return (
    <Card style={[styles.sectionCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.sectionCardTitleRow}>
          <ScoreRing score={score} size={48} hideText />
          <View style={styles.sectionCardText}>
            <Text style={[styles.sectionCardTitle, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.sectionCardScore, { color: colors.textSecondary }]}>Score: {score}/100</Text>
          </View>
        </View>
        {isGood ? (
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        ) : (
          <Ionicons name="warning-outline" size={22} color={colors.warning} />
        )}
      </View>
      <Text style={[styles.sectionCardDesc, { color: colors.textSecondary }]}>{desc}</Text>
      <Button 
        title="AI Rewrite (1 Credit)" 
        variant="outline" 
        size="sm" 
        onPress={onOptimize}
        style={{ marginTop: Spacing.md }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    ...Typography.headingLg,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  ctaCard: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  ctaTitle: {
    ...Typography.headingMd,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  ctaText: {
    ...Typography.bodyMd,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    ...Typography.bodyMd,
    marginTop: Spacing.md,
  },
  resultsContainer: {
    gap: Spacing.lg,
  },
  overallCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  overallLabel: {
    ...Typography.headingMd,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  overallDesc: {
    ...Typography.bodyMd,
    textAlign: 'center',
  },
  sectionTitle: {
    ...Typography.headingMd,
    marginTop: Spacing.md,
  },
  sectionCard: {
    padding: Spacing.lg,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sectionCardText: {
    justifyContent: 'center',
  },
  sectionCardTitle: {
    ...Typography.subtitle1,
  },
  sectionCardScore: {
    ...Typography.bodySm,
    fontWeight: '600',
  },
  sectionCardDesc: {
    ...Typography.bodyMd,
    lineHeight: 20,
  },
});
