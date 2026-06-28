import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Card, Button, ScoreRing } from '../../src/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePastInterviewsQuery } from '../../src/hooks/useApi';

export default function InterviewsLobbyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  
  const [role, setRole] = useState((params.role as string) || 'Product Manager');
  const [jobDescription, setJobDescription] = useState((params.jobDescription as string) || '');
  const [type, setType] = useState('Behavioral');
  const [difficulty, setDifficulty] = useState('Intermediate');
  
  const { data: pastInterviews, isLoading } = usePastInterviewsQuery();

  const handleStart = () => {
    // Navigate to the chat screen
    router.push({
      pathname: '/interview',
      params: { role, type, difficulty, jobDescription }
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
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Job Description (Optional)</Text>
            <TextInput 
              style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary, minHeight: 80 }]}
              value={jobDescription}
              onChangeText={setJobDescription}
              placeholder="Paste the target job description here to guide the interview..."
              placeholderTextColor={colors.textMuted}
              multiline={true}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Interview Type</Text>
            <View style={styles.rowGrid}>
              {['Behavioral', 'Technical', 'Manager'].map((t) => (
                <TouchableOpacity 
                  key={t} 
                  style={[styles.chip, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, type === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, type === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Difficulty</Text>
            <View style={styles.rowGrid}>
              {['Beginner', 'Intermediate', 'Senior'].map((d) => (
                <TouchableOpacity 
                  key={d} 
                  style={[styles.chip, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, difficulty === d && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, difficulty === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button 
            title="Start Interview (5 Credits)" 
            onPress={handleStart}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Past Interviews</Text>
        
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
        ) : pastInterviews && pastInterviews.length > 0 ? (
          pastInterviews.map((interview: any) => (
            <Card key={interview.id} style={[styles.historyCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <View style={styles.historyHeader}>
                <ScoreRing score={interview.feedback?.overall_score || 0} size={48} hideText={true} color={colors.primary} />
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyRole, { color: colors.textPrimary }]}>{interview.role || 'General Interview'}</Text>
                  <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>{interview.type || 'Behavioral'} • {new Date(interview.updated_at).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.historyScore, { color: colors.textPrimary }]}>{interview.feedback?.overall_score || '--'}%</Text>
              </View>
              <TouchableOpacity 
                style={[styles.viewFeedbackBtn, { borderTopColor: colors.border }]}
                onPress={() => router.push({ pathname: '/feedback', params: { sessionId: interview.id } })}
              >
                <Text style={[styles.viewFeedbackText, { color: colors.primary }]}>View Feedback →</Text>
              </TouchableOpacity>
            </Card>
          ))
        ) : (
          <Text style={[styles.historyMeta, { color: colors.textMuted, textAlign: 'center', marginTop: 20 }]}>No past interviews yet.</Text>
        )}

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
    paddingBottom: 120,
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
  }
});
