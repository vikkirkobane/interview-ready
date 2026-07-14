import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Platform,
  TextInput,
 Pressable,  ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useUpdateProfileMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/auth-store';

const EXPERIENCE_OPTIONS = ['0-2', '3-5', '6-10', '10+'];
const PREFERENCE_OPTIONS = [
  { id: 'REMOTE', label: 'Remote', shape: 'geoCircle' },
  { id: 'HYBRID', label: 'Hybrid', shape: 'geoDiamond' },
  { id: 'ONSITE', label: 'Onsite', shape: 'geoSquare' },
];

export default function RoleScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const insets = useSafeAreaInsets();
  const {
    firstName, setFirstName,
    lastName, setLastName,
    targetRole, setTargetRole,
    yearsExperience, setYearsExperience,
    workPreference, setWorkPreference,
  } = useOnboardingStore();
  const { user } = useAuthStore();
  const hasSubmittedName = !!(user?.user_metadata?.first_name && user?.user_metadata?.last_name);

  React.useEffect(() => {
    if (user?.user_metadata?.first_name && !firstName) {
      setFirstName(user.user_metadata.first_name);
    }
    if (user?.user_metadata?.last_name && !lastName) {
      setLastName(user.user_metadata.last_name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateProfile = useUpdateProfileMutation();

  const handleContinue = async () => {
    if (!firstName || !lastName || !targetRole) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all required fields.',
      });
      return;
    }
    
    try {
      const expMap: Record<string, number> = {
        '0-2': 1,
        '3-5': 4,
        '6-10': 8,
        '10+': 10
      };
      
      await updateProfile.mutateAsync({
        target_roles: [targetRole],
        years_experience: expMap[yearsExperience] || 0,
        work_preference: workPreference,
      });

      // Explicitly update user metadata with first and last name only if not already submitted
      if (!hasSubmittedName) {
        await supabase.auth.updateUser({
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        });
      }
      useOnboardingStore.getState().nextStep();
      router.push('/(onboarding)/profile');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to save profile',
        text2: error.message || 'Please check your connection and try again.',
      });
    }
  };

  const renderShape = (shape: string, color: string) => {
    if (shape === 'geoCircle') {
      return <Ionicons name="home-outline" size={24} color={color} style={{ marginBottom: 8 }} />;
    } else if (shape === 'geoDiamond') {
      return <Ionicons name="location-outline" size={24} color={color} style={{ marginBottom: 8 }} />;
    } else {
      return <Ionicons name="business-outline" size={24} color={color} style={{ marginBottom: 8 }} />;
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      {/* Visual Accent Elements */}
      <View style={[styles.ambientTopRight, { backgroundColor: `${colors.primary}0D` }]} pointerEvents="none" />
      <View style={[styles.ambientBottomLeft, { backgroundColor: `${colors.primary}0D` }]} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={[styles.stepLabel, { color: colors.primary }]}>STEP 1 OF 5</Text>
            <Text style={[styles.percentLabel, { color: colors.textMuted }]}>20% Complete</Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.bgMuted }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: '20%' }]} />
          </View>
        </View>

        {/* Header Text */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>What are you looking for?</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            We'll tailor everything to your goals, from resume feedback to mock interview questions.
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* First Name Input */}
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>First Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }, hasSubmittedName && { backgroundColor: colors.bgSecondary, color: colors.textMuted }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="e.g. John"
                placeholderTextColor={colors.textMuted}
                autoComplete="given-name"
                editable={!hasSubmittedName}
              />
            </View>

            {/* Last Name Input */}
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Last Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }, hasSubmittedName && { backgroundColor: colors.bgSecondary, color: colors.textMuted }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="e.g. Doe"
                placeholderTextColor={colors.textMuted}
                autoComplete="family-name"
                editable={!hasSubmittedName}
              />
            </View>
          </View>

          {/* Target Role Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Target Role</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
              value={targetRole}
              onChangeText={setTargetRole}
              placeholder="e.g. Software Engineer"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Years of Experience */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Years of Experience</Text>
            <View style={[styles.segmentedControl, { backgroundColor: colors.bgSecondary }]}>
              {EXPERIENCE_OPTIONS.map((exp) => {
                const isActive = yearsExperience === exp;
                return (
                  <Pressable
                    key={exp}
                    style={[styles.segmentBtn, isActive && [styles.segmentBtnActive, { backgroundColor: colors.primary }]]}
                    onPress={() => setYearsExperience(exp)}
                  >
                    <Text style={[styles.segmentText, { color: colors.textMuted }, isActive && [styles.segmentTextActive, { color: '#fff' }]]}>
                      {exp}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Work Preference Grid */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Work Preference</Text>
            <View style={styles.prefGrid}>
              {PREFERENCE_OPTIONS.map((pref) => {
                const isActive = workPreference === pref.id;
                return (
                  <Pressable
                    key={pref.id}
                    style={[styles.prefCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, isActive && [styles.prefCardActive, { borderColor: colors.primary, backgroundColor: `${colors.primary}1A` }]]}
                    onPress={() => setWorkPreference(pref.id as 'REMOTE' | 'HYBRID' | 'ONSITE')}
                  >
                    {renderShape(pref.shape, isActive ? colors.primary : colors.textMuted)}
                    <Text style={[styles.prefLabel, { color: colors.textMuted }, isActive && [styles.prefLabelActive, { color: colors.primary }]]}>
                      {pref.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <Pressable 
            style={[styles.continueBtn, { backgroundColor: colors.primary }, (!firstName || !lastName || !targetRole || updateProfile.isPending) && [styles.continueBtnDisabled, { backgroundColor: colors.textMuted }]]}
            onPress={handleContinue}
            disabled={!firstName || !lastName || !targetRole || updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Text style={styles.continueText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  ambientTopRight: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '40%',
    height: '40%',
    borderRadius: 9999,
  },
  ambientBottomLeft: {
    position: 'absolute',
    bottom: '-5%',
    left: '-5%',
    width: '30%',
    height: '30%',
    borderRadius: 9999,
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
  stepLabel: {
    ...Typography.label,
  },
  percentLabel: {
    ...Typography.label,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  titleSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.displayLg,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.bodyLg,
  },
  formCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadow.sm,
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.headingMd,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    ...Typography.bodyMd,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.xl,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    ...Shadow.sm,
  },
  segmentText: {
    ...Typography.label,
  },
  segmentTextActive: {
  },
  prefGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  prefCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefCardActive: {
  },
  prefLabel: {
    ...Typography.label,
  },
  prefLabelActive: {
  },
  actionSection: {
    gap: Spacing.md,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueText: {
    ...Typography.headingMd,
    color: '#fff',
  },
});
