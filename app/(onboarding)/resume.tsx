import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useCreateResumeMutation, useResumeQuery } from '../../src/hooks/useApi';
import { supabase } from '../../src/lib/supabase';
import Toast from 'react-native-toast-message';
import ConfettiCannon from 'react-native-confetti-cannon';
import { WebView } from 'react-native-webview';
import { buildResumeHTML } from '../../src/lib/resumeHTML';
import { exportResumePDF, exportResumeDOCX } from '../../src/lib/resumeExport';
import { Ionicons } from '@expo/vector-icons';

export default function ResumeGenScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Stages: 0=Analyzing, 1=Matching, 2=Writing, 3=Formatting, 4=Done
  const [stage, setStage] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { targetRole, analysisId, resumeId, setResumeId } = useOnboardingStore();
  const createResume = useCreateResumeMutation();
  const { data: resumeData } = useResumeQuery(isDone ? resumeId : null);

  const previewHtml = useMemo(() => {
    if (!resumeData || !resumeData.header) return '';
    return buildResumeHTML(resumeData);
  }, [resumeData]);

  useEffect(() => {
    let channel: any;
    let t1: any, t2: any, t3: any;

    const startGeneration = async () => {
      try {
        const { resume_id, stream_channel } = await createResume.mutateAsync({
          title: targetRole || 'My Resume',
          job_analysis_id: analysisId || undefined,
        });

        setResumeId(resume_id);

        channel = supabase
          .channel(stream_channel)
          .on('broadcast', { event: 'generation_complete' }, async (payload) => {
            setStage(4);
            setIsDone(true);
            
            // Mark onboarding as completed in user metadata so they aren't redirected again
            await supabase.auth.updateUser({ data: { onboarding_completed: true } });

            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }).start();
          })
          .on('broadcast', { event: 'generation_failed' }, (payload) => {
            Toast.show({ type: 'error', text1: 'Generation Failed', text2: payload.payload.error });
          })
          .subscribe();

        // Sequence simulated stages for visual feedback
        t1 = setTimeout(() => setStage(1), 1500);
        t2 = setTimeout(() => setStage(2), 3500);
        t3 = setTimeout(() => setStage(3), 6000);

      } catch (error: any) {
        Toast.show({ type: 'error', text1: 'Failed to start generation', text2: error.message });
      }
    };

    // Pulse animation for active step and icon
    Animated.loop(
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
        })
      ])
    ).start();

    startGeneration();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const renderChecklistStep = (index: number, title: string, desc: string, isLast: boolean = false) => {
    const isCompleted = stage > index;
    const isActive = stage === index;
    const isPending = stage < index;

    return (
      <View style={[styles.stepRow, isPending && { opacity: 0.4 }]} key={index}>
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
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
              {renderChecklistStep(0, 'Analyzing profile', 'Skills and experiences mapped.')}
              {renderChecklistStep(1, 'Matching keywords', 'Optimizing for ATS algorithms.')}
              {renderChecklistStep(2, 'Writing summary', 'Crafting a high-impact professional intro...')}
              {renderChecklistStep(3, 'Final formatting', 'Applying Neo-SaaS layout engine.', true)}
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

            {/* Resume Preview Thumbnail */}
            <View style={styles.thumbnailWrapper}>
              <View style={styles.thumbnailGlow} pointerEvents="none" />
              <View style={[styles.thumbnailCard, { borderColor: colors.border, backgroundColor: colors.bgCard, padding: 0, overflow: 'hidden' }]}>
                {previewHtml ? (
                  Platform.OS === 'web' ? (
                    <iframe 
                      srcDoc={previewHtml} 
                      style={{ border: 'none', backgroundColor: colors.bgCard, transform: 'scale(0.35)', transformOrigin: 'top left', width: 732, height: 915, pointerEvents: 'none', userSelect: 'none' } as any}
                    />
                  ) : (
                    <WebView
                      source={{ html: previewHtml }}
                      style={{ flex: 1, backgroundColor: colors.bgCard }}
                      scalesPageToFit={true}
                      scrollEnabled={false}
                      pointerEvents="none"
                    />
                  )
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionBlock}>
              <TouchableOpacity 
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]} 
                onPress={() => resumeData ? exportResumeDOCX(resumeData) : null}
              >
                <Ionicons name="document" size={20} color="#fff" />
                <Text style={styles.primaryActionText}>Download .docx</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryActionBtn, { borderColor: colors.border }]} 
                onPress={() => resumeData ? exportResumePDF(resumeData) : null}
              >
                <Ionicons name="document" size={20} color={colors.textPrimary} />
                <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>Download PDF</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={{ marginTop: 24, marginBottom: 8 }} 
              onPress={async () => {
                await supabase.auth.updateUser({ data: { onboarding_completed: true } });
                router.push('/(tabs)');
              }}
            >
               <Text style={[styles.editLink, { color: colors.primary, fontSize: 16 }]}>Continue to Dashboard</Text>
            </TouchableOpacity>

            <Text style={[styles.editPrompt, { color: colors.textMuted }]}>
              Need adjustments?{' '}
              <Text 
                style={[styles.editLink, { color: colors.primary }]}
                onPress={async () => {
                  if (resumeId) {
                    await supabase.auth.updateUser({ data: { onboarding_completed: true } });
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
  stepCompleted: {
  },
  stepActive: {
  },
  stepActiveInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepPending: {
  },
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
  stepLineActive: {
  },
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
    maxWidth: 400,
  },
  confettiWrapper: {
    marginBottom: Spacing.lg,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
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
    width: 256,
    height: 320,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadow.lg,
  },
  actionBlock: {
    width: '100%',
    gap: Spacing.sm,
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
