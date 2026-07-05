import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { ScoreRing } from '../../src/components/ui';
import { useResumesListQuery } from '../../src/hooks/useApi';
import { Ionicons } from '@expo/vector-icons';

const TEMPLATES = [
  { id: 'executive', name: 'Executive' },
  { id: 'minimal', name: 'Minimal' },
  { id: 'tech-stack', name: 'Tech Stack' },
  { id: 'academic', name: 'Academic' },
  { id: 'modern', name: 'Modern' },
  { id: 'classic', name: 'Classic' },
];

export default function ResumesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  
  const { data: resumes, isLoading } = useResumesListQuery();

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      {/* App Bar */}
      <View style={[styles.header, { 
        paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl, 
        backgroundColor: colors.bgPrimary, 
        borderBottomColor: colors.border 
      }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Resumes</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/new-resume')}
          >
            <Ionicons name="add" size={16} color={colors.textInverse} />
            <Text style={[styles.primaryBtnText, { color: colors.textInverse }]}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
          Tailor a specific resume for each application to maximize your ATS match score.
        </Text>

        <View style={styles.grid}>
          {isLoading ? (
            <Text style={{ textAlign: 'center', marginTop: Spacing.xl, color: colors.textMuted }}>Loading resumes...</Text>
          ) : !resumes || resumes.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: Spacing.xl * 2 }}>
              <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
              <Text style={{ ...Typography.headingMd, color: colors.textPrimary, marginTop: Spacing.md }}>No resumes yet</Text>
              <Text style={{ ...Typography.bodyMd, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.sm }}>Tap 'New' to generate your first ATS-optimized resume.</Text>
            </View>
          ) : (
            resumes.map((resume: any) => (
              <TouchableOpacity 
                key={resume.id} 
                style={[styles.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
                onPress={() => router.push(`/(tabs)/new-resume?id=${resume.id}&fromList=true`)}
              >
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: colors.bgSecondary }]}>
                  {resume.status === 'READY' ? (
                    <Ionicons name="checkmark-circle" size={12} color={colors.success} style={{ marginRight: 4 }} />
                  ) : (
                    <Ionicons name="time" size={12} color={colors.warning} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.statusText, resume.status === 'READY' ? { color: colors.success } : { color: colors.warning }]}>
                    {resume.status}
                  </Text>
                </View>
                <TouchableOpacity style={styles.iconBtn}>
                   <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardContent}>
                  <Text style={[styles.resumeTitle, { color: colors.textPrimary }]}>{resume.title || 'Untitled'}</Text>
                  
                  <View style={styles.templateBadge}>
                    <Ionicons name="browsers-outline" size={12} color={colors.primary} />
                    <Text style={[styles.templateBadgeText, { color: colors.primary }]}>
                      {TEMPLATES.find(t => t.id === resume.template_id)?.name || 'Default'}
                    </Text>
                  </View>
                  
                  <Text style={[styles.resumeDate, { color: colors.textMuted }]}>Edited {new Date(resume.updated_at).toLocaleDateString()}</Text>
                </View>
                {(resume.ats_score || resume.score) > 0 && (
                  <View style={styles.scoreContainer}>
                    <ScoreRing score={resume.ats_score || resume.score} size="md" color={(resume.ats_score || resume.score) > 80 ? colors.success : colors.warning} animate={false} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            ))
          )}
        </View>
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
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    ...Typography.headingLg,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    gap: 6,
  },
  primaryBtnText: {
    ...Typography.label,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  sectionDesc: {
    ...Typography.bodyMd,
    marginBottom: Spacing.xl,
  },
  grid: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.bodySm,
    fontSize: 10,
    fontWeight: '700',
  },
  iconBtn: {
    padding: 4,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  resumeTitle: {
    ...Typography.headingMd,
    marginBottom: 4,
  },
  templateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  templateBadgeText: {
    ...Typography.bodySm,
    fontSize: 11,
    fontWeight: '600',
  },
  resumeDate: {
    ...Typography.bodySm,
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
