import React, { useState, useEffect, useRef } from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, TextInput, Animated } from 'react-native';
import { Typography, Spacing, Radius, useTheme, Animations } from '../src/theme';
import { Card, Button, AdBanner } from '../src/components/ui';
import { useRouter } from 'expo-router';
import { useJdSummaryMutation } from '../src/hooks/useApi';
import { useAuthStore } from '../src/stores/auth-store';
import Toast from 'react-native-toast-message';
import { Skeleton } from '../src/components/ui/SkeletonLoader';
import { Ionicons } from '@expo/vector-icons';

export default function JdSummaryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const [jdText, setJdText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    title: string;
    mustHaves: string[];
    niceToHaves: string[];
    redFlags: string[];
  } | null>(null);

  const jdSummaryMutation = useJdSummaryMutation();

  const handleGenerate = async () => {
    setUrlError('');
    const finalJobUrl = jobUrl.trim();
    const finalJobDescription = jdText.trim();
    
    if (!finalJobDescription && !finalJobUrl) {
      Toast.show({ type: 'error', text1: 'Input Required', text2: 'Please provide a job description or URL.' });
      return;
    }
    
    setGenerating(true);
    
    try {
      const result = await jdSummaryMutation.mutateAsync({ 
        job_description: finalJobDescription || undefined,
        job_url: finalJobUrl || undefined,
      });
      setSummaryData({
        title: result.title || "Job Summary",
        mustHaves: result.key_requirements || result.mustHaves || [],
        niceToHaves: result.niceToHaves || [],
        redFlags: result.red_flags || result.redFlags || []
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Analysis Failed', text2: e.message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header - Minimalist */}
      <View style={[styles.header, { backgroundColor: colors.bgPrimary }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={[styles.navText, { color: colors.textSecondary }]}>← BACK</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>JD Summarizer</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {!summaryData && !generating && (
          <Animated.View style={styles.setupSection}>
            <Text style={[styles.heroHeadline, { color: colors.textPrimary }]}>Analyze Job Description</Text>
            <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>
              Paste a lengthy job description below. We'll extract the key requirements, nice-to-haves, and potential red flags instantly.
            </Text>
            
            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 8, marginTop: 16 }]}>Job URL (Optional)</Text>
            <TextInput
              style={[
                styles.textInput, 
                { backgroundColor: colors.bgSecondary, borderColor: colors.borderGlass, color: colors.textPrimary, minHeight: 48, marginBottom: 16 },
                urlError ? { borderColor: colors.error } : null
              ]}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 8, backgroundColor: `${colors.error}1A`, borderRadius: 4 }}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={{ marginLeft: 4, color: colors.error, fontSize: 12 }}>{urlError}</Text>
              </View>
            ) : null}

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 8 }]}>Job Description Text</Text>
            <TextInput
              style={[
                styles.textInput, 
                { backgroundColor: colors.bgSecondary, borderColor: colors.borderGlass, color: colors.textPrimary }
              ]}
              multiline
              placeholder="Paste the full job description text here..."
              placeholderTextColor={colors.textMuted}
              value={jdText}
              onChangeText={setJdText}
              textAlignVertical="top"
            />

            <Button 
              title="SUMMARIZE →" 
              onPress={handleGenerate} 
              style={{ alignSelf: 'flex-start', marginTop: Spacing.md }}
            />
          </Animated.View>
        )}

        {generating && (
          <View style={styles.loadingSection}>
            <Skeleton width="60%" height={40} borderRadius={Radius.sm} style={{ marginBottom: Spacing.xl }} />
            <Skeleton width="100%" height={200} borderRadius={Radius.lg} style={{ marginBottom: Spacing.md }} />
            <View style={styles.bentoGrid}>
              <Skeleton width="100%" height={160} borderRadius={Radius.lg} style={styles.bentoCell} />
              <Skeleton width="100%" height={160} borderRadius={Radius.lg} style={styles.bentoCell} />
            </View>
          </View>
        )}

        {summaryData && !generating && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultsTitle, { color: colors.textPrimary }]}>{summaryData.title}</Text>
              <Pressable style={[styles.iconBtn, { backgroundColor: colors.bgSecondary }]} accessibilityRole="button">
                <Text style={[styles.navText, { color: colors.textSecondary, fontSize: 12 }]}>COPY</Text>
              </Pressable>
            </View>
            
            <Card variant="feature" delay={100} style={styles.cardMustHaves}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Must-Haves</Text>
              <View style={styles.listContent}>
                {summaryData.mustHaves.map((item, index) => (
                  <View key={`must-${index}`} style={styles.listItem}>
                    <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginTop: 4, marginRight: Spacing.sm }} />
                    <Text style={[styles.listItemTextPrimary, { color: colors.textPrimary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <View style={styles.bentoGrid}>
              <Card variant="standard" delay={200} style={styles.bentoCell}>
                <Text style={[styles.sectionHeadingMuted, { color: colors.textSecondary }]}>Nice-to-Haves</Text>
                <View style={styles.listContent}>
                  {summaryData.niceToHaves.map((item, index) => (
                    <View key={`nice-${index}`} style={styles.listItem}>
                      <Ionicons name="add" size={14} color={colors.textMuted} style={{ marginTop: 4, marginRight: Spacing.sm }} />
                      <Text style={[styles.listItemTextSecondary, { color: colors.textSecondary }]}>{item}</Text>
                    </View>
                  ))}
                  {summaryData.niceToHaves.length === 0 && (
                    <Text style={[styles.listItemTextSecondary, { color: colors.textSecondary }]}>None explicitly listed.</Text>
                  )}
                </View>
              </Card>

              <Card variant="score" delay={300} scoreColor={colors.error} style={[styles.bentoCell, { backgroundColor: colors.errorLight, borderColor: 'transparent' }]}>
                <View style={styles.redFlagHeader}>
                  <Ionicons name="warning" size={20} color={colors.error} />
                  <Text style={[styles.sectionHeadingError, { color: colors.error }]}>Red Flags</Text>
                </View>
                <View style={styles.listContent}>
                  {summaryData.redFlags.map((item, index) => (
                    <View key={`red-${index}`} style={styles.listItem}>
                      <Ionicons name="close" size={14} color={colors.error} style={{ marginTop: 4, marginRight: Spacing.sm }} />
                      <Text style={[styles.listItemTextError, { color: colors.error }]}>{item}</Text>
                    </View>
                  ))}
                  {summaryData.redFlags.length === 0 && (
                    <Text style={[styles.listItemTextSecondary, { color: colors.textSecondary }]}>No obvious red flags detected.</Text>
                  )}
                </View>
              </Card>
            </View>

            <Animated.View style={styles.actionsFooter}>
              <Button 
                title="ANALYZE ANOTHER" 
                variant="outline" 
                onPress={() => setSummaryData(null)} 
              />
            </Animated.View>
          </View>
        )}

        {!isPro && <AdBanner />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  inputLabel: {
    ...Typography.label,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  navText: {
    ...Typography.label,
    letterSpacing: 1,
  },
  headerTitle: {
    ...Typography.subtitle1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  setupSection: {
    marginTop: Spacing.lg,
  },
  heroHeadline: {
    ...Typography.displayMd,
    marginBottom: Spacing.sm,
  },
  heroSubtext: {
    ...Typography.bodyLg,
    marginBottom: Spacing.xl,
    maxWidth: '90%',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    minHeight: 200,
    ...Typography.bodyMd,
  },
  loadingSection: {
    marginTop: Spacing.lg,
  },
  resultsContainer: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  resultsTitle: {
    ...Typography.displayMd,
    flex: 1,
    paddingRight: Spacing.md,
  },
  iconBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  cardMustHaves: {
    marginBottom: Spacing.md,
  },
  bentoGrid: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  bentoCell: {
    flex: 1,
  },
  sectionHeading: {
    ...Typography.headingLg,
    marginBottom: Spacing.lg,
  },
  sectionHeadingMuted: {
    ...Typography.headingMd,
    marginBottom: Spacing.md,
  },
  redFlagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionHeadingError: {
    ...Typography.headingMd,
  },
  listContent: {
    gap: Spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listItemTextPrimary: {
    ...Typography.bodyLg,
    flex: 1,
    lineHeight: 24,
  },
  listItemTextSecondary: {
    ...Typography.bodyMd,
    flex: 1,
    lineHeight: 22,
  },
  listItemTextError: {
    ...Typography.bodyMd,
    flex: 1,
    lineHeight: 22,
  },
  actionsFooter: {
    marginTop: Spacing.xl,
    alignItems: 'flex-start',
  },
});
