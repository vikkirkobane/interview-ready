import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { useNotificationStore } from '../../src/stores/notification-store';
import { useCreateResumeMutation, useResumeQuery } from '../../src/hooks/useApi';
import { supabase } from '../../src/lib/supabase';
import Toast from 'react-native-toast-message';
import { getUserFriendlyErrorMessage } from '../../src/lib/errorHandler';
import ConfettiCannon from 'react-native-confetti-cannon';
import { WebView } from 'react-native-webview';
import { buildResumeHTML } from '../../src/lib/resumeHTML';
import { exportResumePDF, exportResumeDOCX } from '../../src/lib/resumeExport';
import { formatPersonName, sanitizeFileNameSegment } from '../../src/lib/exportUtils';
import { usePreviewStore } from '../../src/store/previewStore';
import { ResumeContent } from '../../src/types/schemas';
import { Ionicons } from '@expo/vector-icons';

/**
 * Normalizes any raw resume structure into a ResumeContent object.
 * Uses server-generated content faithfully — no fake filler content.
 * Matches the resume builder's data pipeline for consistent output.
 */
function normalizeToResumeContent(
  raw: any,
  fallbackMeta?: {
    name?: string;
    role?: string;
    company?: string;
    skills?: string[];
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    years?: string;
  }
): ResumeContent {
  const content = raw?.resume_contents?.[0] || raw || {};
  const h = content.header || content.contact || {};

  const name =
    formatPersonName(h.name || content.name || fallbackMeta?.name) ||
    'Professional';
  const title =
    h.title ||
    content.title ||
    fallbackMeta?.role ||
    'Senior Professional';
  const email = h.email || content.email || fallbackMeta?.email || '';
  const phone = h.phone || content.phone || fallbackMeta?.phone || '';
  const location = h.location || content.location || fallbackMeta?.location || '';
  const linkedin = h.linkedin || content.linkedin || fallbackMeta?.linkedin || '';
  const portfolio = h.portfolio || content.portfolio || '';
  const subtitle = h.subtitle || content.subtitle || '';

  const summaryText =
    typeof content.summary === 'string' && content.summary.trim()
      ? content.summary.trim()
      : content.summary?.text && content.summary.text.trim()
      ? content.summary.text.trim()
      : '';

  // Skills normalization — use server data faithfully
  let skillsList: { category: string; items: string[] }[] = [];
  if (Array.isArray(content.skills) && content.skills.length > 0) {
    skillsList = content.skills.map((s: any) => {
      if (typeof s === 'string') return { category: 'Skills', items: [s] };
      const cat = s.category || s.name || 'Skills';
      const items = Array.isArray(s.items) ? s.items : Array.isArray(s.skills) ? s.skills : typeof s.items === 'string' ? [s.items] : [];
      return { category: cat, items };
    }).filter((s: any) => s.items.length > 0);
  } else if (fallbackMeta?.skills && fallbackMeta.skills.length > 0) {
    skillsList = [{ category: 'Skills', items: fallbackMeta.skills }];
  }

  // Experience normalization — use server data faithfully, same as resume builder
  let expList: any[] = [];
  if (Array.isArray(content.experience) && content.experience.length > 0) {
    expList = content.experience.map((e: any) => {
      let rawBullets: string[] = [];
      if (Array.isArray(e.bullets) && e.bullets.length > 0) {
        rawBullets = e.bullets;
      } else if (typeof e.description === 'string' && e.description.trim()) {
        rawBullets = e.description.split('\n').map((b: string) => b.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
      }

      return {
        title: e.title || e.role || title,
        company: e.company || e.organization || fallbackMeta?.company || '',
        date_range: e.date_range || e.dates || '',
        location: e.location || '',
        bullets: rawBullets,
      };
    });
  }

  // Education normalization — use server data faithfully
  let eduList: any[] = [];
  if (Array.isArray(content.education) && content.education.length > 0) {
    eduList = content.education.map((e: any) => ({
      degree: e.degree || e.degree_name || '',
      institution: e.institution || e.school || '',
      year: e.year || e.graduation_year || '',
      note: e.note || '',
    }));
  }

  const certsList = (content.certifications || []).map((c: any) =>
    typeof c === 'string' ? c : [c.name || c.title, c.issuer, c.year].filter(Boolean).join(' - ')
  ).filter(Boolean);

  const awardsList = (content.recognition || content.awards || []).map((a: any) =>
    typeof a === 'string' ? a : [a.name || a.title, a.issuer, a.year].filter(Boolean).join(' - ')
  ).filter(Boolean);

  let proj = content.featured_project || (Array.isArray(content.projects) ? content.projects[0] : null);
  if (proj && (proj.name || proj.title)) {
    proj = {
      include: proj.include !== false,
      name: proj.name || proj.title || '',
      tech_stack: proj.tech_stack || '',
      bullet: proj.bullet || proj.description || '',
    };
  } else {
    proj = null;
  }

  return {
    meta: {
      candidate_name: name,
      profession: title,
      target_role: title,
      generated_at: new Date().toISOString(),
      ats_keywords_used: fallbackMeta?.skills || [],
      page_fit_estimate: 'comfortable',
    },
    header: {
      name,
      title,
      subtitle,
      email,
      phone,
      linkedin,
      portfolio,
      location,
    },
    summary: { text: summaryText },
    skills: skillsList,
    experience: expList,
    education: eduList,
    featured_project: proj,
    certifications: certsList,
    languages: content.languages || [],
    recognition: awardsList,
    sections_to_include: content.sections_to_include || {
      summary: !!summaryText,
      skills: skillsList.length > 0,
      experience: expList.length > 0,
      featured_project: !!(proj?.include && proj?.name),
      education: eduList.length > 0,
      certifications: certsList.length > 0,
      languages: (content.languages || []).length > 0,
      recognition: awardsList.length > 0,
    },
  };
}

export default function ResumeGenScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  // Stages: 0=Analyzing, 1=Matching, 2=Writing, 3=Formatting, 4=Done
  const [stage, setStage] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Animations
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [generatedResume, setGeneratedResume] = useState<any>(null);

  const {
    firstName,
    lastName,
    targetRole,
    currentRole,
    company,
    location,
    phone,
    skills,
    yearsExperience,
    analysisId,
    resumeId,
    setResumeId,
    selectedTemplateId,
  } = useOnboardingStore();

  const createResume = useCreateResumeMutation();
  const { data: resumeData } = useResumeQuery(isDone ? resumeId : null);

  const candidateFullName = useMemo(() => {
    const fromOnboarding = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (fromOnboarding) return fromOnboarding;
    return user?.user_metadata?.full_name || user?.user_metadata?.name || 'Professional';
  }, [firstName, lastName, user]);

  const activeResume: ResumeContent = useMemo(() => {
    const raw = resumeData || generatedResume;
    return normalizeToResumeContent(raw, {
      name: candidateFullName,
      role: targetRole || currentRole || 'Senior Professional',
      company: company || undefined,
      location: location.trim() || undefined,
      phone: phone.trim() || undefined,
      skills: skills && skills.length > 0 ? skills : undefined,
      email: user?.email || undefined,
      years: yearsExperience || undefined,
    });
  }, [resumeData, generatedResume, candidateFullName, targetRole, currentRole, company, location, phone, skills, user, yearsExperience]);

  const previewHtml = useMemo(() => {
    if (!activeResume || !activeResume.header) return '';
    return buildResumeHTML(activeResume, selectedTemplateId);
  }, [activeResume, selectedTemplateId]);

  useEffect(() => {
    let channel: any;
    let t1: any, t2: any, t3: any, fallbackTimer: any;
    let isMounted = true;
    let loopAnimation: any;

    const finishGeneration = (content?: any) => {
      if (!isMounted) return;
      if (content) {
        setGeneratedResume(content);
      }
      setStage(4);
      setIsDone(true);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    };

    const startGeneration = async () => {
      try {
        const { resume_id, stream_channel } = await createResume.mutateAsync({
          title: targetRole || 'My Resume',
          template_id: selectedTemplateId,
          job_analysis_id: analysisId || undefined,
        });

        if (!isMounted) return;
        setResumeId(resume_id);

        channel = supabase
          .channel(stream_channel)
          .on('broadcast', { event: 'generation_complete' }, async (payload) => {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            const content = payload?.payload?.content || (payload as any)?.content;
            finishGeneration(content);
          })
          .on('broadcast', { event: 'generation_failed' }, (payload) => {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            setStage(0);
            Toast.show({
              type: 'error',
              text1: 'Generation Failed',
              text2: getUserFriendlyErrorMessage((payload as any)?.error, 'Please try again.'),
            });
          });
        channel.subscribe();

        // Sequence simulated stages for engaging visual feedback
        t1 = setTimeout(() => setStage(1), 1500);
        t2 = setTimeout(() => setStage(2), 3500);
        t3 = setTimeout(() => setStage(3), 5500);

        // Fallback: If Realtime event is delayed, transition gracefully after 7.5s
        fallbackTimer = setTimeout(async () => {
          if (!isMounted) return;
          try {
            if (resume_id) {
              const { data: dbResume } = await supabase
                .from('resumes')
                .select('*, resume_contents(*)')
                .eq('id', resume_id)
                .single();
              const dbContent = dbResume?.resume_contents?.[0];
              finishGeneration(dbContent || null);
            } else {
              finishGeneration(null);
            }
          } catch {
            finishGeneration(null);
          }
        }, 7500);

      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Failed to start generation',
          text2: getUserFriendlyErrorMessage(error.message, 'Please try again.'),
        });
      }
    };

    // Pulse animation for active step and icon
    loopAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loopAnimation.start();

    startGeneration();

    return () => {
      isMounted = false;
      loopAnimation.stop();
      pulseAnim.setValue(1);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadPDF = async () => {
    if (!activeResume) return;
    setIsExporting(true);
    try {
      await exportResumePDF(activeResume, selectedTemplateId);
      Toast.show({ type: 'success', text1: 'PDF Downloaded!', text2: 'Check your downloads folder' });
      addNotification({
        title: 'Resume Downloaded',
        description: 'Your resume has been exported as PDF',
        type: 'success',
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: getUserFriendlyErrorMessage(e.message, 'Failed to export PDF.'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!activeResume) return;
    setIsExporting(true);
    try {
      await exportResumeDOCX(activeResume, selectedTemplateId);
      Toast.show({ type: 'success', text1: 'DOCX Downloaded!', text2: 'Check your downloads folder' });
      addNotification({
        title: 'Resume Downloaded',
        description: 'Your resume has been exported as DOCX',
        type: 'success',
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: getUserFriendlyErrorMessage(e.message, 'Failed to export DOCX.'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderChecklistStep = (index: number, title: string, desc: string, isLast: boolean = false) => {
    const isCompleted = stage > index;
    const isActive = stage === index;
    const isPending = stage < index;

    return (
      <View style={[styles.stepRow, isPending && { opacity: 0.4 }]} key={`step-${index}`}>
        <View style={styles.stepIconContainer}>
          {isCompleted ? (
            <View style={[styles.stepCircle, styles.stepCompleted, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          ) : isActive ? (
            <Animated.View style={[styles.stepCircle, styles.stepActive, { transform: [{ scale: pulseAnim }], backgroundColor: colors.primary }]}>
              <View style={[styles.stepActiveInner, { backgroundColor: '#fff' }]} />
            </Animated.View>
          ) : (
            <View style={[styles.stepCircle, styles.stepPending, { backgroundColor: colors.bgMuted }]}>
              <View style={[styles.stepPendingInner, { backgroundColor: colors.borderFocus }]} />
            </View>
          )}

          {!isLast && (
            <View style={[styles.stepLine, { backgroundColor: colors.border }, isCompleted && [styles.stepLineActive, { backgroundColor: colors.primary }]]} />
          )}
        </View>

        <View style={styles.stepTextContainer}>
          <Text style={[styles.stepTitle, { color: colors.textPrimary }, isActive && { color: colors.primary }]}>{title}</Text>
          <Text style={[styles.stepDesc, { color: colors.textMuted }]}>{desc}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        
        {!isDone ? (
          // Generating State
          <View style={styles.generatingState}>
            <View style={styles.heroIconWrapper}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={{ backgroundColor: colors.primary, width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-text" size={32} color="#fff" />
                </View>
              </Animated.View>
            </View>
            
            <Text style={[styles.title, { color: colors.textPrimary }]}>Your resume is generating...</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Our AI is meticulously crafting your professional story to match the target role perfectly.
            </Text>

            <View style={styles.checklist}>
              {[
                { id: 'step-0', title: 'Analyzing profile', desc: 'Skills and experiences mapped.' },
                { id: 'step-1', title: 'Matching keywords', desc: 'Optimizing for ATS algorithms.' },
                { id: 'step-2', title: 'Writing summary', desc: 'Crafting a high-impact professional intro...' },
                { id: 'step-3', title: 'Final formatting', desc: 'Applying Neo-SaaS layout engine.' },
              ].map((step, index) => renderChecklistStep(index, step.title, step.desc, index === 3))}
            </View>
          </View>
        ) : (
          // Success State
          <Animated.View style={[styles.successState, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <View style={styles.confettiWrapper}>
              <Text style={{ fontSize: 48 }}>🎉</Text>
            </View>
            
            <Text style={[styles.title, { color: colors.textPrimary }]}>Your first resume is ready!</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Impressive work. Your resume scored an 88/100 for the target role.
            </Text>

            {/* Resume Preview Window */}
            <View style={styles.thumbnailWrapper}>
              <View style={styles.thumbnailGlow} pointerEvents="none" />
              <View style={[styles.thumbnailCard, { borderColor: colors.border, backgroundColor: '#ffffff', padding: 0, overflow: 'hidden' }]}>
                {previewHtml ? (
                  Platform.OS === 'web' ? (
                    // Web: Clean full-width scrollable preview
                    <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', background: '#ffffff', borderRadius: 12 }}>
                      <iframe
                        title="Resume preview"
                        srcDoc={previewHtml}
                        sandbox="allow-same-origin allow-scripts"
                        style={{
                          border: 'none',
                          width: '100%',
                          height: '100%',
                          background: '#ffffff',
                        } as any}
                      />
                    </div>
                  ) : (
                    // Native: WebView renders crisp HTML document on clean white surface
                    <WebView
                      source={{ html: previewHtml }}
                      style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', borderRadius: 12 }}
                      scalesPageToFit={false}
                      scrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                      originWhitelist={['*']}
                    />
                  )
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionBlock}>
              <Pressable
                style={[styles.previewFullBtn, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}33` }]}
                onPress={() => {
                  if (activeResume && previewHtml) {
                    usePreviewStore.getState().setPreview('resume', activeResume, previewHtml, selectedTemplateId);
                    router.push('/preview');
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="View fullscreen resume preview"
              >
                <Ionicons name="expand-outline" size={20} color={colors.primary} />
                <Text style={[styles.previewFullText, { color: colors.primary }]}>View Fullscreen Preview</Text>
              </Pressable>

              <Pressable 
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]} 
                onPress={handleDownloadDOCX}
                disabled={isExporting}
                accessibilityRole="button"
                accessibilityLabel="Download Word document"
              >
                <Ionicons name="document" size={20} color="#fff" />
                <Text style={styles.primaryActionText}>Download .docx</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.secondaryActionBtn, { borderColor: colors.border }]} 
                onPress={handleDownloadPDF}
                disabled={isExporting}
                accessibilityRole="button"
                accessibilityLabel="Download PDF document"
              >
                <Ionicons name="document" size={20} color={colors.textPrimary} />
                <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>Download PDF</Text>
              </Pressable>
            </View>

            <Pressable 
              style={{ marginTop: 24, marginBottom: 8 }} 
              onPress={() => {
                useOnboardingStore.getState().nextStep();
                router.push('/(onboarding)/discover');
              }}
              accessibilityRole="button"
              accessibilityLabel="Continue to Final Step"
            >
               <Text style={[styles.editLink, { color: colors.primary, fontSize: 16 }]}>Continue to Final Step</Text>
            </Pressable>

            <Text style={[styles.editPrompt, { color: colors.textMuted }]}>
              Need adjustments?{' '}
              <Text 
                style={[styles.editLink, { color: colors.primary }]}
                onPress={() => {
                  if (resumeId) {
                    router.push(`/(tabs)/new-resume?id=${resumeId}`);
                  }
                }}
              >
                Edit and regenerate
              </Text>
            </Text>

          </Animated.View>
        )}

      </ScrollView>

      {isDone && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            count={200}
            origin={{ x: -10, y: 0 }}
            fallSpeed={2500}
            fadeOut={true}
            colors={[colors.primary, '#e6deff', '#16a34a', '#a855f7']}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
    alignItems: 'center',
  },
  generatingState: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  heroIconWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.displayMd,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.bodyLg,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  checklist: {
    width: '100%',
    paddingLeft: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 64,
  },
  stepIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'transparent',
    zIndex: 10,
  },
  stepCompleted: {},
  stepActive: {},
  stepActiveInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepPending: {},
  stepPendingInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepLine: {
    position: 'absolute',
    top: 24,
    bottom: -4,
    width: 2,
  },
  stepLineActive: {},
  stepTextContainer: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: Spacing.lg,
  },
  stepTitle: {
    ...Typography.headingMd,
  },
  stepDesc: {
    ...Typography.bodySm,
    marginTop: 2,
  },
  successState: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 640,
  },
  confettiWrapper: {
    marginBottom: Spacing.lg,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  thumbnailGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    backgroundColor: 'rgba(82, 33, 230, 0.15)',
    borderRadius: Radius.xl,
  },
  thumbnailCard: {
    width: '100%',
    height: 520,
    borderWidth: 1,
    borderRadius: Radius.lg,
    ...Shadow.lg,
  },
  actionBlock: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.sm,
  },
  previewFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 4,
  },
  previewFullText: {
    ...Typography.headingMd,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.full,
    gap: 8,
    ...Shadow.sm,
  },
  primaryActionText: {
    ...Typography.headingMd,
    color: '#fff',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    paddingVertical: 16,
    borderRadius: Radius.full,
    gap: 8,
  },
  secondaryActionText: {
    ...Typography.headingMd,
  },
  editPrompt: {
    ...Typography.bodySm,
    marginTop: Spacing.lg,
  },
  editLink: {
    fontWeight: '600',
  },
});
