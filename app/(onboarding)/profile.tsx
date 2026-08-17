import { Pressable ,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { useUpdateProfileMutation, useParseResumeMutation } from '../../src/hooks/useApi';
import { supabase } from '../../src/lib/supabase';
import { fetchFileArrayBuffer } from '../../src/lib/api';
import { useFilePicker } from '../../src/hooks/useFilePicker';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const SUGGESTED_SKILLS = [
  'Leadership', 'Effective Communication', 'Problem Solving', 
  'Team Collaboration', 'Adaptability', 'Critical Thinking'
];

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    currentRole, setCurrentRole,
    company, setCompany,
    skills, addSkill, removeSkill, setSkills,
  } = useOnboardingStore();

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

  const { pickFile } = useFilePicker();

  const handleUploadResume = async () => {
    await pickFile({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'],
      allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'],
      maxSizeMb: 5,
      onFilePicked: async (payload) => {
        Toast.show({ type: 'info', text1: 'Uploading Resume...', text2: 'Saving your file to secure storage.' });
        
        // Upload to Supabase Storage
        try {
          const fileName = payload.fileName;
          const userId = user?.id;
          if (!userId) {
            throw new Error('User not authenticated');
          }
          
          const storagePath = `resume-uploads/${userId}/${Date.now()}-${fileName}`;
          
          // Get the file body to upload.
          // On mobile, fetch().blob() returns a blob with type='text/plain' on Android,
          // which causes Supabase Storage to store the wrong MIME type and can trigger
          // bucket allowed_mime_types rejections. Using ArrayBuffer bypasses this —
          // Supabase then uses the explicit contentType option we provide.
          let uploadBody: Blob | ArrayBuffer;
          if (payload.webFile) {
            // Web: File object already has the correct type
            uploadBody = payload.webFile;
          } else {
            // Mobile: use fetchFileArrayBuffer to safely copy content:// URIs to cache on Android
            uploadBody = await fetchFileArrayBuffer(payload.fileUri, payload.fileName);
          }

          
          const { error: uploadError } = await supabase
            .storage
            .from('interview-ready-files')
            .upload(storagePath, uploadBody, {
              contentType: payload.mimeType,
              upsert: false
            });
          
          if (uploadError) throw uploadError;
          
          // Optionally, we can get the public URL (if bucket is public)
          // For now, we don't need to store the URL, but we could if we wanted to.
          // const { data: publicUrlData } = supabase
          //   .storage
          //   .from('interview-ready-files')
          //   .getPublicUrl(storagePath);
          // console.log('Uploaded file public URL:', publicUrlData.publicUrl);
          
          Toast.show({ type: 'info', text1: 'Parsing Resume...', text2: 'Extracting details from your uploaded file.' });
        } catch (uploadError: any) {
          Toast.show({ type: 'error', text1: 'Upload failed', text2: uploadError.message || 'Please try again.' });
          return; // Exit if upload fails
        }
        
        // Now parse the resume
        try {
          const extractedData = await parseResume.mutateAsync(payload);
        
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
        } catch (parseError: any) {
          Toast.show({ type: 'error', text1: 'Parsing failed', text2: parseError.message || 'Please try again.' });
        }
      }
    });
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
          end_date: null,
          current: true,
          description: ''
        }] : undefined,
      });
      
      // onboarding_completed is set at Step 5 (discover.tsx), NOT here

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
        <Pressable 
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
        </Pressable>

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
                  <Pressable 
                    key={skill} 
                    style={[styles.skillChipActive, { backgroundColor: `${colors.primary}1A` }]}
                    onPress={() => removeSkill(skill)}
                    
                  >
                    <Text style={[styles.skillChipTextActive, { color: colors.primary }]}>{skill}</Text>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </Pressable>
                ))}

                {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).slice(0, 3).map(skill => (
                  <Pressable 
                    key={skill} 
                    style={[styles.skillChipInactive, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                    onPress={() => addSkill(skill)}
                    
                  >
                    <Ionicons name="add" size={14} color={colors.textMuted} />
                    <Text style={[styles.skillChipTextInactive, { color: colors.textMuted }]}>{skill}</Text>
                  </Pressable>
                ))}

              </View>
            </View>

            {/* CTA Section */}
            <View style={styles.ctaSection}>
              <Pressable 
                style={[styles.continueBtn, { backgroundColor: colors.primary }, updateProfile.isPending && [styles.continueBtnDisabled, { backgroundColor: colors.textMuted }]]}
                onPress={handleContinue}
                
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
              </Pressable>
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
