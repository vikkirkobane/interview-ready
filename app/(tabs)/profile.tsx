import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { ScoreRing, Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth-store';
import { useRouter } from 'expo-router';
import { useDeleteAccountMutation, useUpdateProfileMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { useNotificationStore } from '../../src/stores/notification-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { Ionicons } from '@expo/vector-icons';

interface WorkHistoryItem {
  id?: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  current: boolean;
  description: string;
}

interface EducationItem {
  id?: string;
  school: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string | null;
  gpa?: string;
}

export default function ProfileScreen() {
  const { signOut, user } = useAuthStore();
  const { profile, updateProfile } = useProfileStore();
  const router = useRouter();
  const { addNotification } = useNotificationStore();
  const deleteAccountMutation = useDeleteAccountMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const { colors, isDark } = useTheme();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState(user?.user_metadata?.first_name || '');
  const [editLastName, setEditLastName] = useState(user?.user_metadata?.last_name || '');
  const [editRole, setEditRole] = useState((profile as any)?.current_role || '');
  const [editLocation, setEditLocation] = useState(profile?.location || '');
  const [editSummary, setEditSummary] = useState(profile?.summary || '');

  // Experience Modal State
  const [isExpModalVisible, setIsExpModalVisible] = useState(false);
  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [expCompany, setExpCompany] = useState('');
  const [expTitle, setExpTitle] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expCurrent, setExpCurrent] = useState(false);
  const [expDesc, setExpDesc] = useState('');

  // Skills Modal State
  const [isSkillsModalVisible, setIsSkillsModalVisible] = useState(false);
  const [editingTechSkills, setEditingTechSkills] = useState<string[]>([]);
  const [editingSoftSkills, setEditingSoftSkills] = useState<string[]>([]);
  const [newTechSkill, setNewTechSkill] = useState('');
  const [newSoftSkill, setNewSoftSkill] = useState('');

  // Education Modal State
  const [isEduModalVisible, setIsEduModalVisible] = useState(false);
  const [editingEduIndex, setEditingEduIndex] = useState<number | null>(null);
  const [eduSchool, setEduSchool] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduStartDate, setEduStartDate] = useState('');
  const [eduEndDate, setEduEndDate] = useState('');

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync();
      await signOut();
      router.replace('/(auth)/welcome');
      Toast.show({ type: 'success', text1: 'Account deleted successfully.' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Delete failed', text2: e.message });
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        first_name: editFirstName,
        last_name: editLastName,
      });
      await updateProfile({
        current_role: editRole,
        location: editLocation,
        summary: editSummary,
      } as any);
      setIsEditModalVisible(false);
      Toast.show({ type: 'success', text1: 'Profile updated!' });
      addNotification({
        title: 'Profile Updated',
        description: 'Your changes have been saved to your profile.',
        type: 'success',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e.message });
    }
  };

  const openExpModal = (index: number | null) => {
    if (index !== null && index >= 0) {
      const exp = workHistory[index];
      setExpCompany(exp.company);
      setExpTitle(exp.title);
      setExpStartDate(exp.start_date);
      setExpEndDate(exp.end_date || '');
      setExpCurrent(exp.current);
      setExpDesc(exp.description);
      setEditingExpIndex(index);
    } else {
      setExpCompany('');
      setExpTitle('');
      setExpStartDate('');
      setExpEndDate('');
      setExpCurrent(false);
      setExpDesc('');
      setEditingExpIndex(null);
    }
    setIsExpModalVisible(true);
  };

  const handleSaveExperience = async () => {
    const newExp: WorkHistoryItem = {
      company: expCompany,
      title: expTitle,
      start_date: expStartDate,
      end_date: expCurrent ? null : expEndDate,
      current: expCurrent,
      description: expDesc,
    };

    let updatedHistory = [...workHistory];
    if (editingExpIndex !== null) {
      updatedHistory[editingExpIndex] = newExp;
    } else {
      updatedHistory.push(newExp);
    }

    try {
      await updateProfile({ work_history: updatedHistory } as any);
      setIsExpModalVisible(false);
      Toast.show({ type: 'success', text1: 'Experience saved!' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to save experience' });
    }
  };

  const handleDeleteExperience = async (index: number) => {
    let updatedHistory = [...workHistory];
    updatedHistory.splice(index, 1);
    try {
      await updateProfile({ work_history: updatedHistory } as any);
      setIsExpModalVisible(false);
      Toast.show({ type: 'success', text1: 'Experience removed.' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to remove experience' });
    }
  };

  const openSkillsModal = () => {
    setEditingTechSkills([...techSkills]);
    setEditingSoftSkills([...softSkills]);
    setIsSkillsModalVisible(true);
  };

  const handleSaveSkills = async () => {
    try {
      await updateProfile({
        technical_skills: editingTechSkills,
        soft_skills: editingSoftSkills,
      } as any);
      setIsSkillsModalVisible(false);
      Toast.show({ type: 'success', text1: 'Skills updated!' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to update skills' });
    }
  };

  const openEduModal = (index: number | null) => {
    if (index !== null && index >= 0) {
      const edu = education[index];
      setEduSchool(edu.school);
      setEduDegree(edu.degree);
      setEduField(edu.field);
      setEduStartDate(edu.start_date);
      setEduEndDate(edu.end_date || '');
      setEditingEduIndex(index);
    } else {
      setEduSchool('');
      setEduDegree('');
      setEduField('');
      setEduStartDate('');
      setEduEndDate('');
      setEditingEduIndex(null);
    }
    setIsEduModalVisible(true);
  };

  const handleSaveEducation = async () => {
    const newEdu: EducationItem = {
      school: eduSchool,
      degree: eduDegree,
      field: eduField,
      start_date: eduStartDate,
      end_date: eduEndDate,
    };

    let updatedEdu = [...education];
    if (editingEduIndex !== null) {
      updatedEdu[editingEduIndex] = newEdu;
    } else {
      updatedEdu.push(newEdu);
    }

    try {
      await updateProfile({ education: updatedEdu } as any);
      setIsEduModalVisible(false);
      Toast.show({ type: 'success', text1: 'Education saved!' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to save education' });
    }
  };

  const handleDeleteEducation = async (index: number) => {
    let updatedEdu = [...education];
    updatedEdu.splice(index, 1);
    try {
      await updateProfile({ education: updatedEdu } as any);
      setIsEduModalVisible(false);
      Toast.show({ type: 'success', text1: 'Education removed.' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to remove education' });
    }
  };

  const userName = user?.user_metadata?.first_name 
    ? `${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name || ''}`
    : 'Your Name';
  
  const userTitle = (profile as any)?.current_role || 'Add your current role';
  const userLocation = profile?.location || 'Add your location';
  const completeness = (profile as any)?.profile_completeness || 0;
  
  const workHistory = (profile?.workHistory || (profile as any)?.work_history || []) as WorkHistoryItem[];
  const techSkills = (profile?.technicalSkills || (profile as any)?.technical_skills || []) as string[];
  const softSkills = (profile?.softSkills || (profile as any)?.soft_skills || []) as string[];
  const education = (profile?.education || (profile as any)?.education || []) as EducationItem[];
  
  const renderSkillPill = (skill: string, variant: 'primary' | 'secondary' | 'neutral') => {
    let bg: string = colors.bgMuted;
    let color: string = colors.textBody;
    
    if (variant === 'primary') {
      bg = `${colors.primary}${isDark ? '33' : '1A'}`;
      color = colors.primary;
    } else if (variant === 'secondary') {
      bg = colors.bgSecondary;
      color = colors.textPrimary;
    }

    return (
      <View key={skill} style={[styles.skillPill, { backgroundColor: bg }]}>
        <Text style={[styles.skillText, { color }]}>{skill}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bioSection}>
          <View style={styles.avatarWrapper}>
            <ScoreRing score={completeness} size="xl" color={colors.primary} />
            <View style={[styles.avatarImageContainer, { backgroundColor: colors.bgPrimary }]}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.bgMuted }]}>
                <Text style={[styles.avatarInitials, { color: colors.textMuted }]}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={[styles.progressBadge, { backgroundColor: colors.primary, borderColor: colors.bgPrimary }]}>
              <Text style={styles.progressBadgeText}>{completeness}% Complete</Text>
            </View>
          </View>
          
          <View style={styles.bioTextSection}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
              <Text style={[styles.nameText, { color: colors.textPrimary }]}>{userName}</Text>
            </TouchableOpacity>
            <Text style={[styles.titleText, { color: colors.textMuted }]}>{userTitle}</Text>
            <View style={[styles.locationBadge, { backgroundColor: colors.bgSecondary }]}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.locationText, { color: colors.textBody }]}>{userLocation}</Text>
            </View>
            {profile?.summary && (
              <Text style={[styles.locationText, { color: colors.textBody, marginTop: Spacing.sm, textAlign: 'center' }]}>
                {profile.summary}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.premiumCard, { backgroundColor: colors.primary }]}>
          <View style={styles.premiumWatermark}>
             <Ionicons name="star" size={120} color="rgba(255,255,255,0.1)" style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
          
          <View style={styles.premiumContent}>
            <View style={styles.premiumHeader}>
              <View>
                <View style={[styles.planBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.planBadgeText}>ACTIVE PLAN</Text>
                </View>
                <Text style={styles.planTitle}>Pro Plan</Text>
              </View>
              <View style={styles.creditsContainer}>
                <Text style={styles.creditsValue}>1,240</Text>
                <Text style={styles.creditsLabel}>Interview Credits</Text>
              </View>
            </View>

            <View style={styles.premiumActions}>
              <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.textInverse }]}>
                <Text style={[styles.upgradeBtnText, { color: colors.primary }]}>Upgrade Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addCreditsBtn}>
                <Text style={styles.addCreditsBtnText}>Add Credits</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.importBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}${isDark ? '1A' : '05'}` }]}>
          <Ionicons name="logo-linkedin" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.importBtnText, { color: colors.primary }]}>Import Profile from LinkedIn</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Experience</Text>
            <TouchableOpacity onPress={() => openExpModal(null)}>
              <Text style={[styles.editLink, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.experienceList}>
            {workHistory.length === 0 ? (
              <Text style={[styles.roleDesc, { color: colors.textBody }]}>No work experience added yet.</Text>
            ) : (
              workHistory.map((job, index) => (
                <View key={job.id || index} style={[styles.experienceCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                  <View style={[styles.experienceIconBox, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                    <Ionicons name="briefcase-outline" size={24} color={index === 0 ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={[styles.experienceDetails, { flex: 1 }]}>
                    <Text style={[styles.companyName, { color: colors.textPrimary }]}>{job.company}</Text>
                    <Text style={[styles.roleDate, { color: colors.textMuted }]}>
                      {job.title} • {job.start_date} — {job.current ? 'Present' : (job.end_date || '')}
                    </Text>
                    <Text style={[styles.roleDesc, { color: colors.textBody }]} numberOfLines={2}>{job.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openExpModal(index)} style={{ padding: Spacing.sm }}>
                     <Text style={{ color: colors.textMuted }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteExperience(index)} style={{ padding: Spacing.sm }}>
                     <Text style={{ color: colors.error }}>Del</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Core Skills</Text>
            <TouchableOpacity onPress={openSkillsModal}>
              <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.skillsCloud}>
            {techSkills.length === 0 && softSkills.length === 0 && (
              <Text style={[styles.roleDesc, { color: colors.textBody }]}>No skills added yet.</Text>
            )}
            {techSkills.map((skill, i) => renderSkillPill(skill, 'primary'))}
            {softSkills.map((skill, i) => renderSkillPill(skill, 'secondary'))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Education</Text>
            <TouchableOpacity onPress={() => openEduModal(null)}>
              <Text style={[styles.editLink, { color: colors.primary }]}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.experienceList}>
            {education.length === 0 ? (
              <Text style={[styles.roleDesc, { color: colors.textBody }]}>No education added yet.</Text>
            ) : (
              education.map((edu, index) => (
                <View key={edu.id || index} style={[styles.experienceCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                  <View style={[styles.experienceIconBox, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                     <Ionicons name="school-outline" size={24} color={index === 0 ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={[styles.experienceDetails, { flex: 1 }]}>
                    <Text style={[styles.companyName, { color: colors.textPrimary }]}>{edu.school}</Text>
                    <Text style={[styles.roleDate, { color: colors.textMuted }]}>
                      {edu.degree} in {edu.field} • {edu.start_date} — {edu.end_date || 'Present'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => openEduModal(index)} style={{ padding: Spacing.sm }}>
                     <Text style={{ color: colors.textMuted }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteEducation(index)} style={{ padding: Spacing.sm }}>
                     <Text style={{ color: colors.error }}>Del</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.settingsGrid}>
          <TouchableOpacity style={[styles.settingsCard, { backgroundColor: colors.bgSecondary }]}>
            <View style={[styles.settingsIconBox, { backgroundColor: colors.bgPrimary }]}>
               <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
            </View>
            <Text style={[styles.settingsText, { color: colors.textPrimary }]}>Account Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsCard, { backgroundColor: colors.bgSecondary }]}>
            <View style={[styles.settingsIconBox, { backgroundColor: colors.bgPrimary }]}>
               <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
            </View>
            <Text style={[styles.settingsText, { color: colors.textPrimary }]}>Support Center</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
          <Button 
            title="Sign Out" 
            variant="outline" 
            onPress={handleSignOut} 
            fullWidth
          />
          <Button 
            title={deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            variant="danger" 
            onPress={handleDeleteAccount} 
            fullWidth
            disabled={deleteAccountMutation.isPending}
          />
        </View>

      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Basic Info</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Text style={{ color: colors.textMuted, ...Typography.headingMd }}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>First Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="Enter first name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Last Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Enter last name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Current Role</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                  value={editRole}
                  onChangeText={setEditRole}
                  placeholder="e.g. Software Engineer"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Location</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="e.g. San Francisco, CA"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Professional Summary</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, height: 100, textAlignVertical: 'top' }]}
                  value={editSummary}
                  onChangeText={setEditSummary}
                  placeholder="A short summary of your background"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>

              <Button 
                title={updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                onPress={handleSaveProfile}
                fullWidth
                disabled={updateProfileMutation.isPending}
              />
              <View style={{ height: Spacing.xl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Experience Modal */}
      <Modal
        visible={isExpModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsExpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{editingExpIndex !== null ? 'Edit Experience' : 'Add Experience'}</Text>
              <TouchableOpacity onPress={() => setIsExpModalVisible(false)}>
                <Text style={{ color: colors.textMuted, ...Typography.headingMd }}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Company</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} value={expCompany} onChangeText={setExpCompany} placeholder="E.g. Google" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Job Title</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} value={expTitle} onChangeText={setExpTitle} placeholder="E.g. Senior Developer" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Start Date</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} value={expStartDate} onChangeText={setExpStartDate} placeholder="MM/YYYY" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>End Date</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }, expCurrent && { opacity: 0.5 }]} value={expEndDate} onChangeText={setExpEndDate} placeholder="MM/YYYY" placeholderTextColor={colors.textMuted} editable={!expCurrent} />
                </View>
              </View>
              <View style={styles.formGroup}>
                <TouchableOpacity onPress={() => setExpCurrent(!expCurrent)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View style={{ width: 20, height: 20, borderWidth: 2, borderColor: colors.primary, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                    {expCurrent && <View style={{ width: 10, height: 10, backgroundColor: colors.primary, borderRadius: 2 }} />}
                  </View>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>I currently work here</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Description</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, height: 100, textAlignVertical: 'top' }]} value={expDesc} onChangeText={setExpDesc} placeholder="What did you do?" placeholderTextColor={colors.textMuted} multiline />
              </View>

              <Button title="Save Experience" onPress={handleSaveExperience} fullWidth />
              <View style={{ height: Spacing.xl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Skills Modal */}
      <Modal
        visible={isSkillsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSkillsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Skills</Text>
              <TouchableOpacity onPress={() => setIsSkillsModalVisible(false)}>
                <Text style={{ color: colors.textMuted, ...Typography.headingMd }}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.textPrimary, fontSize: 16, marginTop: Spacing.md }]}>Technical Skills</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md }}>
                {editingTechSkills.map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.primary}${isDark ? '33' : '1A'}`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full }}>
                    <Text style={{ color: colors.primary, marginRight: 4 }}>{s}</Text>
                    <TouchableOpacity onPress={() => setEditingTechSkills(editingTechSkills.filter((_, idx) => idx !== i))}>
                      <Text style={{ color: colors.primary, ...Typography.bodySm }}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, flex: 1 }]} value={newTechSkill} onChangeText={setNewTechSkill} placeholder="Add a technical skill..." placeholderTextColor={colors.textMuted} onSubmitEditing={() => { if(newTechSkill) { setEditingTechSkills([...editingTechSkills, newTechSkill]); setNewTechSkill(''); } }} />
                <Button title="Add" onPress={() => { if(newTechSkill) { setEditingTechSkills([...editingTechSkills, newTechSkill]); setNewTechSkill(''); } }} />
              </View>

              <Text style={[styles.label, { color: colors.textPrimary, fontSize: 16, marginTop: Spacing.xl }]}>Soft Skills</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md }}>
                {editingSoftSkills.map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full }}>
                    <Text style={{ color: colors.textPrimary, marginRight: 4 }}>{s}</Text>
                    <TouchableOpacity onPress={() => setEditingSoftSkills(editingSoftSkills.filter((_, idx) => idx !== i))}>
                       <Text style={{ color: colors.textPrimary, ...Typography.bodySm }}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl }}>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, flex: 1 }]} value={newSoftSkill} onChangeText={setNewSoftSkill} placeholder="Add a soft skill..." placeholderTextColor={colors.textMuted} onSubmitEditing={() => { if(newSoftSkill) { setEditingSoftSkills([...editingSoftSkills, newSoftSkill]); setNewSoftSkill(''); } }} />
                <Button title="Add" onPress={() => { if(newSoftSkill) { setEditingSoftSkills([...editingSoftSkills, newSoftSkill]); setNewSoftSkill(''); } }} />
              </View>

              <Button title="Save Skills" onPress={handleSaveSkills} fullWidth />
              <View style={{ height: Spacing.xl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Education Modal */}
      <Modal
        visible={isEduModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEduModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgPrimary, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{editingEduIndex !== null ? 'Edit Education' : 'Add Education'}</Text>
              <TouchableOpacity onPress={() => setIsEduModalVisible(false)}>
                <Text style={{ color: colors.textMuted, ...Typography.headingMd }}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>School / University</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} value={eduSchool} onChangeText={setEduSchool} placeholder="E.g. Stanford University" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Degree</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} value={eduDegree} onChangeText={setEduDegree} placeholder="E.g. Bachelor of Science" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Field of Study</Text>
                <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} value={eduField} onChangeText={setEduField} placeholder="E.g. Computer Science" placeholderTextColor={colors.textMuted} />
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Start Date</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} value={eduStartDate} onChangeText={setEduStartDate} placeholder="YYYY" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>End Date</Text>
                  <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]} value={eduEndDate} onChangeText={setEduEndDate} placeholder="YYYY" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <Button title="Save Education" onPress={handleSaveEducation} fullWidth />
              <View style={{ height: Spacing.xl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.headingLg,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.bodyMd,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  bioSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  avatarImageContainer: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...Typography.displayLg,
  },
  progressBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 4,
  },
  progressBadgeText: {
    ...Typography.label,
    color: '#ffffff',
  },
  bioTextSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: 4,
  },
  nameText: {
    ...Typography.headingLg,
  },
  titleText: {
    ...Typography.bodyMd,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    marginTop: 4,
  },
  locationText: {
    ...Typography.label,
  },
  premiumCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadow.card,
  },
  premiumWatermark: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  premiumContent: {
    position: 'relative',
    zIndex: 1,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  planBadgeText: {
    ...Typography.label,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 1,
  },
  planTitle: {
    ...Typography.displayMd,
    color: '#ffffff',
  },
  creditsContainer: {
    alignItems: 'flex-end',
  },
  creditsValue: {
    ...Typography.displayMd,
    color: '#ffffff',
  },
  creditsLabel: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.7)',
  },
  premiumActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  upgradeBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  upgradeBtnText: {
    ...Typography.headingMd,
  },
  addCreditsBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  addCreditsBtnText: {
    ...Typography.headingMd,
    color: '#ffffff',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  importBtnText: {
    ...Typography.headingMd,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headingLg,
  },
  editLink: {
    ...Typography.label,
  },
  experienceList: {
    gap: Spacing.md,
  },
  experienceCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadow.card,
    gap: Spacing.md,
  },
  experienceIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  experienceDetails: {
    flex: 1,
  },
  companyName: {
    ...Typography.headingMd,
  },
  roleDate: {
    ...Typography.bodyMd,
    marginBottom: 4,
  },
  roleDesc: {
    ...Typography.bodySm,
    lineHeight: 20,
  },
  skillsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.sm,
  },
  skillPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  skillText: {
    ...Typography.label,
  },
  settingsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  settingsCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  settingsIconBox: {
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  settingsText: {
    ...Typography.headingMd,
    flex: 1,
  },
});
