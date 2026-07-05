import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { useUpdateProfileMutation, useParseResumeMutation } from '../../src/hooks/useApi';
import { supabase } from '../../src/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SUGGESTED_SKILLS = [
  'Leadership', 'Effective Communication', 'Problem Solving', 
  'Team Collaboration', 'Adaptability', 'Critical Thinking'
];

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    currentRole, setCurrentRole,
    company, setCompany,
    skills, addSkill, removeSkill, setSkills,
  } = useOnboardingStore();

  const [inputFocused, setInputFocused] = useState<'role' | 'company' | null>(null);
  const [hasResume, setHasResume] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const checkExistingResume = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('resume_raw_text')
        .eq('user_id', user.id)
        .single();
        
      if (!error && data && data.resume_raw_text) {
        setHasResume(true);
      }
    };
    checkExistingResume();
  }, [user]);

  const updateProfile = useUpdateProfileMutation();
  const parseResume = useParseResumeMutation();

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];

      if (fileAsset.size && fileAsset.size > 5 * 1024 * 1024) {
        Toast.show({
          type: 'error',
          text1: 'File too large',
          text2: 'Please upload a file smaller than 5MB.',
        });
        return;
      }

      const isPdf = fileAsset.mimeType === 'application/pdf' || fileAsset.name.toLowerCase().endsWith('.pdf');
      const isDocx = fileAsset.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileAsset.name.toLowerCase().endsWith('.docx');

      if (!isPdf && !isDocx) {
        Toast.show({
          type: 'error',
          text1: 'Invalid file type',
          text2: 'Only PDF and DOCX files are supported.',
        });
        return;
      }

      const formData = new FormData();
      
      if (Platform.OS === 'web' && fileAsset.file) {
        formData.append('file', fileAsset.file as unknown as Blob);
      } else {
        formData.append('file', {
          uri: fileAsset.uri,
          name: fileAsset.name,
          type: fileAsset.mimeType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        } as any);
      }

      const extractedData = await parseResume.mutateAsync(formData);
      
      if (extractedData.current_role) setCurrentRole(extractedData.current_role);
      if (extractedData.company) setCompany(extractedData.company);
      const skillsList = (extractedData as any).top_skills || (extractedData as any).technical_skills;
      if (skillsList && Array.isArray(skillsList)) {
        const uniqueSkills = Array.from(new Set([...skills, ...skillsList]));
        setSkills(uniqueSkills);
      }

      Toast.show({
        type: 'success',
        text1: 'Resume parsed successfully',
        text2: 'Form fields have been auto-filled.',
      });
    } catch (error: any) {
      if (error.message?.includes('PROMPT_INJECTION')) {
        Toast.show({
          type: 'error',
          text1: 'Security Violation',
          text2: 'Prompt injection detected. You have been logged out.',
        });
        await useAuthStore.getState().signOut();
        router.replace('/(auth)/login');
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Failed to parse resume',
        text2: error.message || 'Please check your file and try again.',
      });
    }
  };

  const handleContinue = async () => {
    try {
      await updateProfile.mutateAsync({
        current_role: currentRole,
        technical_skills: skills,
        work_history: company ? [{
          company,
          title: currentRole || '',
          start_date: new Date().toISOString().split('T')[0],
          current_role: targetRole, 
        }],
        resume_content: profileObj ? [{
          ...profileObj,
          parsed_at: new Date().toISOString()
        }] : undefined,
      });
      
      await supabase.auth.updateUser({ data: { onboarding_completed: true } });

      useOnboardingStore.getState().nextStep();
      router.push('/(onboarding)/analyze');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to save profile',
        text2: error.message || 'Please check your connection.',
      });
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={[styles.stepLabel, { color: colors.primary }]}>STEP 2 OF 5</Text>
            <Text style={[styles.percentLabel, { color: colors.textMuted }]}>40% Complete</Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.bgMuted }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: '40%' }]} />
          </View>
        </View>

        {/* Header Text */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Build your profile</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Tell us about your professional background to personalize your interview drills.
          </Text>
        </View>

        {hasResume && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              You already have a resume saved. Uploading a new one will replace your existing resume.
            </Text>
          </View>
        )}

        {/* UploadSimple Resume Button */}
        <TouchableOpacity 
          style={[styles.uploadBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          onPress={handleUploadResume}
          disabled={parseResume.isPending}
        >
          {parseResume.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
              <Text style={[styles.uploadBtnText, { color: colors.primary }]}>Upload Resume (PDF) to auto-fill</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Content Container */}
        <View style={[styles.cardContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {/* Profile Form */}
          <View style={styles.formContainer}>
            
            <View style={styles.rowGrid}>
              {/* Role Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Latest Role</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Senior Product Manager"
                  placeholderTextColor={colors.textMuted}
                  value={currentRole}
                  onChangeText={setCurrentRole}
                />
              </View>

              {/* Company Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Company</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Acme Corp"
                  placeholderTextColor={colors.textMuted}
                  value={company}
                  onChangeText={setCompany}
                />
              </View>
            </View>

            {/* Skills Tag Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Top Skills</Text>
              <View style={styles.skillsWrapper}>
                
                {skills.map(skill => (
                  <TouchableOpacity 
                    key={skill} 
                    style={[styles.skillChipActive, { backgroundColor: `${colors.primary}1A` }]}
                    onPress={() => removeSkill(skill)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.skillChipTextActive, { color: colors.primary }]}>{skill}</Text>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                ))}

                {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).slice(0, 3).map(skill => (
                  <TouchableOpacity 
                    key={skill} 
                    style={[styles.skillChipInactive, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                    onPress={() => addSkill(skill)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color={colors.textMuted} />
                    <Text style={[styles.skillChipTextInactive, { color: colors.textMuted }]}>{skill}</Text>
                  </TouchableOpacity>
                ))}

              </View>
            </View>

            {/* CTA Section */}
            <View style={styles.ctaSection}>
              <TouchableOpacity 
                style={[styles.continueBtn, { backgroundColor: colors.primary }, updateProfile.isPending && [styles.continueBtnDisabled, { backgroundColor: colors.textMuted }]]}
                onPress={handleContinue}
                activeOpacity={0.9}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.continueText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Trust Badge / Secondary Content */}
        <View style={styles.trustBadges}>
          <View style={styles.badgeItem}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
            <Text style={[styles.badgeText, { color: colors.textPrimary }]}>Data Encrypted</Text>
          </View>
          <View style={styles.badgeItem}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
            <Text style={[styles.badgeText, { color: colors.textPrimary }]}>Private Profile</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stepLabel: {
    ...Typography.label,
    letterSpacing: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl * 2,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  progressContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  percentLabel: {
    ...Typography.bodySm,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardContainer: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Shadow.sm, 
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    width: '100%',
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    ...Typography.label,
  },
  titleSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.displayLg,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLg,
    maxWidth: '90%',
  },
  formContainer: {
    width: '100%',
    gap: Spacing.lg,
    zIndex: 10,
  },
  rowGrid: {
    width: '100%',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.md,
  },
  fieldGroup: {
    flex: 1,
  },
  fieldLabel: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    ...Typography.bodyMd,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  skillChipTextActive: {
    ...Typography.label,
  },
  skillChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  skillChipTextInactive: {
    ...Typography.label,
  },
  ctaSection: {
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueText: {
    ...Typography.headingMd,
    color: '#fff',
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.xl,
    opacity: 0.8,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeText: {
    ...Typography.label,
  },
  warningContainer: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.5)',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  warningText: {
    ...Typography.bodySm,
    color: '#a16207',
    textAlign: 'center',
  },
});
