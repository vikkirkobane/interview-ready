import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
  Pressable,
  Modal } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Card, Button, ScoreRing } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';
import {
  useLinkedinAnalyzeMutation,
  useLinkedinOptimizeMutation,
  useLinkedinEngagementPlanMutation,
  useLinkedinScrapeMutation,
  LinkedInSpikeInput,
  LinkedInTone,
} from '../../src/hooks/useApi';
import { useAuthStore } from '../../src/stores/auth-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { useNotificationStore } from '../../src/stores/notification-store';
import { supabase } from '../../src/lib/supabase';
import { useLocalSearchParams } from 'expo-router';

import Toast from 'react-native-toast-message';
import { handleApiError, getUserFriendlyErrorMessage } from '../../src/lib/errorHandler';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exportLinkedInAnalysisPDF } from '../../src/lib/linkedinExport';
import { useCreditGuard } from '../../src/lib/creditGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 'prefill' | 'content' | 'spike' | 'results';
type ActiveTab  = 'overview' | 'keywords' | 'skills' | 'featured' | 'outreach' | 'plan';

interface WizardState {
  targetRoles:     string[];
  targetCompanies: string[];
  yearsExp:        string;
  tone:            LinkedInTone;
  headline:        string;
  about:           string;
  experience:      { title: string; company: string; description: string }[];
  skills:          string[];
  spike:           LinkedInSpikeInput;
}

const TONE_OPTIONS: { value: LinkedInTone; label: string; icon: string }[] = [
  { value: 'PROFESSIONAL',  label: 'Professional',  icon: 'briefcase-outline'  },
  { value: 'APPROACHABLE',  label: 'Approachable',  icon: 'people-outline'     },
  { value: 'DATA_DRIVEN',   label: 'Data-Driven',   icon: 'analytics-outline'  },
  { value: 'NARRATIVE',     label: 'Narrative',     icon: 'book-outline'       },
  { value: 'INSPIRATIONAL', label: 'Inspirational', icon: 'rocket-outline'     },
];

const KW_COLOR: Record<string, string> = {
  ROLE_TITLE: '#6366f1',
  SKILL:      '#10b981',
  IMPACT:     '#f59e0b',
  INDUSTRY:   '#0A66C2',
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LinkedinOptimizerScreen() {
  const { colors } = useTheme();
  const { user, signInWithOAuth } = useAuthStore();
  const { profile, fetchProfile, updateProfile } = useProfileStore();
  const { requireCredits } = useCreditGuard();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  // Detect LinkedIn OAuth user — must be computed BEFORE state that depends on it
  const isLinkedInUser = user?.app_metadata?.provider === 'linkedin_oidc';
  const oauthName   = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const oauthAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';

  const [step, setStep]           = useState<WizardStep>('prefill');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const { addNotification } = useNotificationStore();
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  // When arriving via the "Import Profile from LinkedIn" button we go straight
  // to the URL importer instead of the full-screen connect prompt.
  const [showLinkedInPrompt, setShowLinkedInPrompt] = useState(mode === 'import' ? false : !isLinkedInUser);

  const [liConnecting, setLiConnecting] = useState(false);

  // ── Build initial wizard from existing profile data ────────────────────────
  const buildInitialWizard = (): WizardState => {
    const p = profile as any;
    const workHistory: { title: string; company: string; description: string }[] =
      (p?.work_history || p?.workHistory || []).map((w: any) => ({
        title:       w.title || w.job_title || '',
        company:     w.company || w.company_name || '',
        description: w.description || w.responsibilities || '',
      }));

    const allSkills: string[] = [
      ...(p?.technical_skills || p?.technicalSkills || []),
      ...(p?.soft_skills      || p?.softSkills      || []),
    ];

    return {
      targetRoles:     p?.target_roles     || p?.targetRoles     || [],
      targetCompanies: p?.target_industries || p?.targetIndustries || [],
      yearsExp:        String(p?.years_experience || p?.yearsExperience || ''),
      tone:            'PROFESSIONAL',
      headline:        '',   // User must paste their actual LinkedIn headline
      about:           p?.summary || '',
      experience:      workHistory.length > 0 ? workHistory : [{ title: '', company: '', description: '' }],
      skills:          allSkills,
      spike: { differentiator: '', praised_for: '', problems_solved: '' },
    };
  };

  const [wizard, setWizard] = useState<WizardState>(() => buildInitialWizard());
  const [analysis, setAnalysis]             = useState<any>(null);
  const [sectionResults, setSectionResults] = useState<Record<string, any>>({});
  const [engagementPlan, setEngagementPlan] = useState<any>(null);
  const [optimizingSection, setOptimizingSection] = useState<string | null>(null);
  const [roleInput,    setRoleInput]    = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [companyInput, setCompanyInput] = useState('');
  const [skillInput,   setSkillInput]   = useState('');
  const [linkedinUrl,  setLinkedinUrl]  = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const analyzeMutation    = useLinkedinAnalyzeMutation();
  const optimizeMutation   = useLinkedinOptimizeMutation();
  const engagementMutation = useLinkedinEngagementPlanMutation();
  const scrapeMutation     = useLinkedinScrapeMutation();

  // Track if the user has imported data via scraping — prevents profile refetch from overwriting it
  const [hasScraped, setHasScraped] = React.useState(false);

  // Load from database if ID is provided
  useEffect(() => {
    const loadFromId = async () => {
      if (!id) return;
      const { data, error } = await supabase.from('linkedin_tasks').select('*').eq('id', id).single();
      if (!error && data) {
        if (data.task_type === 'analyze') {
          setAnalysis(data.result_data);
          setStep('results');
          setActiveTab('overview');
        } else if (data.task_type.startsWith('optimize_')) {
          const section = data.task_type.split('_')[1];
          setSectionResults(prev => ({ ...prev, [section]: data.result_data }));
          // We can't jump directly to optimize view cleanly without full analysis context, but we can set the result
          Toast.show({ type: 'success', text1: 'Optimization result loaded' });
        }
      }
    };
    loadFromId();
  }, [id]);

  // Sync showLinkedInPrompt when user connects LinkedIn via OAuth
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLinkedInUser) setShowLinkedInPrompt(false);
  }, [isLinkedInUser]);

  // Refresh profile data when screen mounts so pre-fill is up-to-date
  useEffect(() => {
    fetchProfile().then(() => {
      // Only reset wizard from profile if the user hasn't already imported via URL
      if (!hasScraped) {
        setWizard(buildInitialWizard());
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const addTag = (field: 'targetRoles' | 'targetCompanies' | 'skills', value: string, max?: number) => {
    if (!value.trim()) return;
    if (max && (wizard[field] as string[]).length >= max) return;
    setWizard(w => ({ ...w, [field]: [...(w[field] as string[]), value.trim()] }));
    if (field === 'targetRoles')     setRoleInput('');
    if (field === 'targetCompanies') setCompanyInput('');
    if (field === 'skills')          setSkillInput('');
  };

  const removeTag = (field: 'targetRoles' | 'targetCompanies' | 'skills', index: number) => {
    setWizard(w => ({ ...w, [field]: (w[field] as string[]).filter((_, i) => i !== index) }));
  };

  const updateExp = (index: number, field: string, value: string) => {
    setWizard(w => {
      const exp = [...w.experience];
      exp[index] = { ...exp[index], [field]: value };
      return { ...w, experience: exp };
    });
  };

  const addExpRole = () =>
    setWizard(w => ({ ...w, experience: [...w.experience, { title: '', company: '', description: '' }] }));

  const handleNextToSpike = () => {
    if (wizard.targetRoles.length === 0) {
      Toast.show({ type: 'error', text1: 'Add at least one target role' });
      return;
    }
    if (!wizard.headline?.trim()) {
      Toast.show({ type: 'error', text1: 'LinkedIn headline is required' });
      return;
    }
    setStep('spike');
  };

  const handleAnalyze = async () => {
    if (!requireCredits('LinkedIn Optimizer')) return;

    if (wizard.targetRoles.length === 0) {
      Toast.show({ type: 'error', text1: 'Add at least one target role' });
      return;
    }
    if (!wizard.headline?.trim()) {
      Toast.show({ type: 'error', text1: 'LinkedIn headline is required' });
      return;
    }
    if (!wizard.spike?.differentiator?.trim()) {
      Toast.show({ type: 'error', text1: 'Please describe what sets you apart' });
      return;
    }
    if (!wizard.spike?.praised_for?.trim()) {
      Toast.show({ type: 'error', text1: 'Please specify what colleagues/clients praise' });
      return;
    }
    if (!wizard.spike?.problems_solved?.trim()) {
      Toast.show({ type: 'error', text1: 'Please specify problems you solve best' });
      return;
    }
    // Clear stale optimization results when re-analyzing
    setSectionResults({});
    setEngagementPlan(null);
    try {
      const result = await analyzeMutation.mutateAsync({
        headline:         wizard.headline.trim(),
        about:            wizard.about?.trim() || undefined,
        experience:       wizard.experience.filter(e => e.title && e.company),
        skills:           wizard.skills.length > 0 ? wizard.skills : undefined,
        target_roles:     wizard.targetRoles,
        target_companies: wizard.targetCompanies.length > 0 ? wizard.targetCompanies : undefined,
        years_experience: wizard.yearsExp ? (parseInt(wizard.yearsExp) || undefined) : undefined,
        spike:            {
          differentiator: wizard.spike.differentiator.trim(),
          praised_for:    wizard.spike.praised_for.trim(),
          problems_solved: wizard.spike.problems_solved.trim(),
        },
        tone:             wizard.tone,
      });
      setAnalysis(result.analysis);
      setStep('results');
      setActiveTab('overview');
      addNotification({
        title: 'LinkedIn Analysis Saved',
        description: 'Your profile analysis is ready.',
        type: 'success',
      });
    } catch (e: any) {
      handleApiError(e.message, { fallbackTitle: 'Analysis Failed' });
    }
  };

  const handleOptimizeSection = async (section: string) => {
    if (!requireCredits('LinkedIn Optimizer')) return;

    setOptimizingSection(section);
    try {
      const targetRoles = wizard.targetRoles.length > 0
        ? wizard.targetRoles
        : (profile?.target_roles && profile.target_roles.length > 0 ? profile.target_roles : ['Professional']);

      const payload: any = {
        section,
        target_roles:     targetRoles,
        target_companies: wizard.targetCompanies.length > 0 ? wizard.targetCompanies : undefined,
        years_experience: wizard.yearsExp ? (parseInt(wizard.yearsExp) || undefined) : undefined,
        spike:            wizard.spike?.differentiator ? wizard.spike : undefined,
        tone:             wizard.tone || 'PROFESSIONAL',
      };
      if (section === 'HEADLINE')         payload.current_content = wizard.headline || profile?.title || '';
      if (section === 'ABOUT')            payload.current_content = wizard.about || profile?.summary || '';
      if (section === 'SKILLS')           payload.current_content = wizard.skills.length > 0 ? wizard.skills.join(', ') : (profile?.skills?.join(', ') || '');
      if (section === 'FEATURED')         payload.current_content = wizard.about || profile?.summary || '';
      if (section === 'OUTREACH_KIT')     payload.current_content = wizard.about || profile?.summary || '';
      if (section === 'EXPERIENCE_BULLETS') {
        const validHistory = wizard.experience.filter(e => e.title && e.company);
        if (validHistory.length > 0) {
          payload.work_history = validHistory;
        } else if (profile?.experience && profile.experience.length > 0) {
          payload.work_history = profile.experience.map((e: any) => ({
            title: e.title || e.job_title || 'Role',
            company: e.company || e.company_name || 'Company',
            description: e.description || e.responsibilities || '',
          }));
        } else {
          payload.work_history = [
            {
              title: targetRoles[0] || 'Professional',
              company: 'Current Role',
              description: wizard.about || 'Delivered key initiatives, led cross-functional projects, and achieved measurable outcomes.',
            },
          ];
        }
      }
      const result = await optimizeMutation.mutateAsync(payload);
      setSectionResults(prev => ({ ...prev, [section]: result.result }));
      Toast.show({ type: 'success', text1: `${section.replace(/_/g, ' ')} optimized!` });
      addNotification({
        title: 'LinkedIn Optimization Saved',
        description: `${section.replace(/_/g, ' ')} has been optimized.`,
        type: 'success',
      });
    } catch (e: any) {
      handleApiError(e.message, { fallbackTitle: 'Optimization Failed' });
    } finally {
      setOptimizingSection(null);
    }
  };

  const handleScrape = async () => {
    if (!linkedinUrl.includes('linkedin.com/in/')) {
      Toast.show({ type: 'error', text1: 'Invalid URL', text2: 'Please enter a valid LinkedIn profile URL (https://linkedin.com/in/...)' });
      return;
    }
    let formattedUrl = linkedinUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const result = await scrapeMutation.mutateAsync({ linkedin_url: formattedUrl });
      const data = result.data;

      // Mark that scrape data is now loaded — prevents profile refetch from overwriting
      setHasScraped(true);

      setWizard(w => ({
        ...w,
        headline:   data.headline   || w.headline,
        about:      data.about      || w.about,
        experience: (data.experience && data.experience.length > 0) ? data.experience : w.experience,
        skills:     (data.skills    && data.skills.length    > 0) ? data.skills    : w.skills,
      }));

      // Persist the imported data to the user's app profile so the Profile tab
      // reflects the LinkedIn import too (about → summary, experience → work
      // history, skills → technical skills).
      if (data.about || (data.experience && data.experience.length > 0) || (data.skills && data.skills.length > 0)) {
        try {
          if (!profile) await fetchProfile();
          const { error: profileError } = await updateProfile({
            summary: data.about || undefined,
            work_history: data.experience && data.experience.length > 0
              ? data.experience.map((e: any) => ({
                  company: e.company || '',
                  title: e.title || '',
                  description: e.description || '',
                  start_date: '',
                  end_date: null,
                  current: false,
                }))
              : undefined,
            technical_skills: data.skills && data.skills.length > 0
              ? Array.from(new Set([...(profile?.technical_skills || []), ...data.skills]))
              : undefined,
          });
          if (profileError) {
            console.warn('[LinkedIn] Failed to save imported profile:', profileError);
          }
        } catch (e) {
          console.warn('[LinkedIn] Failed to save imported profile:', e);
        }
      }

      Toast.show({ type: 'success', text1: 'Profile Imported successfully!', text2: 'Your profile and review content have been updated.' });
      setStep('content');
    } catch (e: any) {
      handleApiError(e.message, { fallbackTitle: 'Import Failed' });
    }
  };

  const handleEngagementPlan = async () => {
    if (!requireCredits('LinkedIn Optimizer')) return;

    try {
      const targetRoles = wizard.targetRoles.length > 0
        ? wizard.targetRoles
        : (profile?.target_roles && profile.target_roles.length > 0 ? profile.target_roles : ['Professional']);
      const result = await engagementMutation.mutateAsync({
        target_roles:     targetRoles,
        target_companies: wizard.targetCompanies.length > 0 ? wizard.targetCompanies : undefined,
        tone:             wizard.tone || 'PROFESSIONAL',
        top_achievement:  wizard.spike?.differentiator || undefined,
      });
      setEngagementPlan(result.plan);
      setActiveTab('plan');
    } catch (e: any) {
      handleApiError(e.message, { fallbackTitle: 'Plan Generation Failed' });
    }
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({ type: 'success', text1: 'Copied to clipboard!' });
  };

  const handleDownload = async () => {
    if (!analysis) return;
    try {
      setIsDownloading(true);
      await exportLinkedInAnalysisPDF(analysis, {
        candidateName: oauthName || user?.email || '',
        targetRoles: wizard.targetRoles,
        targetCompanies: wizard.targetCompanies,
      });
      Toast.show({ type: 'success', text1: 'Report Downloaded!', text2: 'Your LinkedIn optimization PDF has been exported.' });
      addNotification({
        title: 'LinkedIn Report Downloaded',
        description: 'Your LinkedIn optimization report has been exported as PDF',
        type: 'success',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Export Failed', text2: getUserFriendlyErrorMessage(e.message, 'Failed to export LinkedIn analysis.') });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConnectLinkedIn = async () => {
    setLiConnecting(true);
    try {
      const { error } = await signInWithOAuth('linkedin_oidc');
      if (error) {
        Toast.show({ type: 'error', text1: 'LinkedIn connection failed', text2: getUserFriendlyErrorMessage(error, 'Please try again.') });
      }
      // OAuth redirects — session will update automatically via onAuthStateChange
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'LinkedIn connection failed', text2: getUserFriendlyErrorMessage(e.message, 'Please try again.') });
    } finally {
      setLiConnecting(false);
    }
  };

  // ── LinkedIn Connect Prompt (shown once for non-LinkedIn users) ───────────
  if (showLinkedInPrompt) {
    return (
      <View style={[s.screen, { backgroundColor: colors.bgSecondary }]}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={Platform.OS === 'web'}>
          {/* Header */}
          <View style={s.pageHeader}>
            <View style={[s.liIcon, { backgroundColor: '#0A66C2' }]}>
              <Ionicons name="logo-linkedin" size={36} color="#fff" />
            </View>
            <Text style={[s.pageTitle, { color: colors.textPrimary }]}>LinkedIn Optimizer</Text>
            <Text style={[s.pageSubtitle, { color: colors.textMuted }]}>
              Connect LinkedIn for the best experience, or continue manually.
            </Text>
          </View>

          {/* Connect Card */}
          <Card style={[s.connectCard, { backgroundColor: '#0A66C2' }]}>
            <Ionicons name="logo-linkedin" size={40} color="#fff" style={{ marginBottom: Spacing.md }} />
            <Text style={s.connectTitle}>Connect with LinkedIn</Text>
            <Text style={s.connectBody}>
              Signing in with LinkedIn pre-fills your name and photo, and unlocks the best-optimised output by letting us personalise
              your profile recommendations.
            </Text>

            <View style={[s.whatYouGet, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              {[
                { icon: 'person-outline',   text: 'Name & profile photo pre-filled' },
                { icon: 'mail-outline',     text: 'Email confirmed automatically'    },
                { icon: 'shield-checkmark-outline', text: 'Secure — we never post on your behalf' },
              ].map((item, i) => (
                <View key={i} style={s.whatRow}>
                  <Ionicons name={item.icon as any} size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={s.whatText}>{item.text}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[s.connectBtn, { backgroundColor: '#fff' }]}
              onPress={handleConnectLinkedIn}
              disabled={liConnecting}
            >
              {liConnecting
                ? <ActivityIndicator size="small" color="#0A66C2" />
                : <><Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
                    <Text style={s.connectBtnText}>Sign in with LinkedIn</Text></>
              }
            </Pressable>
          </Card>

          {/* Limitation note */}
          <Card style={[s.limitCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <Text style={[s.limitTitle, { color: colors.textPrimary }]}>📋 What LinkedIn login provides</Text>
            <Text style={[s.limitBody, { color: colors.textSecondary }]}>
              LinkedIn login only shares your basic identity data — your name, email, and photo.
              {`\n\n`}In the next step, you can use our AI Importer to automatically extract your profile content (headline, about, experience, skills) using your public profile URL.
            </Text>
          </Card>

          {/* Skip */}
          <Pressable onPress={() => setShowLinkedInPrompt(false)} style={s.skipBtn}>
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            <Text style={[s.skipText, { color: colors.textMuted }]}>Skip — I'll enter my content manually →</Text>
          </Pressable>
          </ScrollView>
          <View style={{ height: bottomNavPadding }} />
      </View>
    );
  }

  // ── STEP: Pre-fill review ─────────────────────────────────────────────────
  if (step === 'prefill') {
    const hasProfileData = wizard.targetRoles.length > 0 || wizard.experience.some(e => e.title);
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgSecondary }}>
<ScrollView style={[s.screen, { backgroundColor: colors.bgSecondary }]} contentContainerStyle={s.content} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        {/* Header */}
        <View style={s.pageHeader}>
          <View style={[s.liIcon, { backgroundColor: colors.bgPrimary }]}>
            <Ionicons name="logo-linkedin" size={32} color="#0A66C2" />
          </View>
          <Text style={[s.pageTitle, { color: colors.textPrimary }]}>LinkedIn Optimizer</Text>
          <Text style={[s.pageSubtitle, { color: colors.textMuted }]}>
            AI-powered profile optimisation using 2026 recruiter search intelligence.
          </Text>
        </View>

        {/* LinkedIn account banner */}
        <Card style={[s.accountCard, { backgroundColor: isLinkedInUser ? '#0A66C2' : colors.bgPrimary, borderColor: isLinkedInUser ? '#0A66C2' : colors.border }]}>
          <View style={s.accountRow}>
            {oauthAvatar
              ? <Image source={{ uri: oauthAvatar }} style={s.avatar} />
              : <View style={[s.avatarPlaceholder, { backgroundColor: isLinkedInUser ? 'rgba(255,255,255,0.2)' : colors.bgSecondary }]}>
                  <Ionicons name="person" size={20} color={isLinkedInUser ? '#fff' : colors.textMuted} />
                </View>
            }
            <View style={{ flex: 1 }}>
              {isLinkedInUser ? (
                <>
                  <Text style={[s.accountName, { color: '#fff' }]}>{oauthName || 'LinkedIn Account'}</Text>
                  <Text style={[s.accountDetail, { color: 'rgba(255,255,255,0.8)' }]}>
                    ✓ Signed in with LinkedIn · Basic info pre-filled
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[s.accountName, { color: colors.textPrimary }]}>
                    {oauthName || user?.email || 'Your Account'}
                  </Text>
                  <Text style={[s.accountDetail, { color: colors.textMuted }]}>
                    Sign in with LinkedIn to pre-fill your name & photo
                  </Text>
                </>
              )}
            </View>
          </View>
          {/* What LinkedIn login provides */}
          <View style={[s.oauthInfoBox, { backgroundColor: isLinkedInUser ? 'rgba(255,255,255,0.15)' : colors.bgSecondary }]}>
            <Text style={[s.oauthInfoTitle, { color: isLinkedInUser ? '#fff' : colors.textPrimary }]}>
              ℹ️ LinkedIn Data Sync
            </Text>
            <Text style={[s.oauthInfoText, { color: isLinkedInUser ? 'rgba(255,255,255,0.85)' : colors.textSecondary }]}>
              {isLinkedInUser
                ? '✓ Name  ✓ Email  ✓ Profile photo\n\nUse the importer below to pull in your headline, about, experience, and skills.'
                : 'LinkedIn login only shares your name, email and photo. Use the AI Importer below to pull in your full profile content.'}
            </Text>
          </View>
        </Card>

        {/* Profile data pre-fill status */}
        <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Auto-Import Profile</Text>
        <Card style={[s.prefillCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <Text style={[s.hint, { color: colors.textMuted, marginBottom: Spacing.md }]}>
            Enter your public LinkedIn URL to automatically extract your profile content.
          </Text>
          <TextInput 
            style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary, marginBottom: Spacing.md }]}
            placeholder="https://linkedin.com/in/your-profile" 
            placeholderTextColor={colors.textMuted}
            value={linkedinUrl} 
            onChangeText={setLinkedinUrl} 
            autoCapitalize="none"
          />
          <Button 
            title={scrapeMutation.isPending ? 'Importing Profile...' : 'Import My LinkedIn'} 
            onPress={handleScrape} 
            disabled={scrapeMutation.isPending || !linkedinUrl.trim()} 
          />
        </Card>

        {!hasProfileData && (
          <Card style={[s.warnCard, { backgroundColor: colors.bgPrimary, borderColor: '#f59e0b' }]}>
            <Ionicons name="warning-outline" size={20} color="#f59e0b" />
            <Text style={[s.warnText, { color: colors.textSecondary }]}>
              Your profile is mostly empty. Fill in your profile in the Profile tab first for better auto-fill, or continue and add everything manually.
            </Text>
          </Card>
        )}

        <Button title="Continue → Review & Add Content" onPress={() => setStep('content')} style={{ marginTop: Spacing.lg }} />
        </ScrollView>
        <View style={{ height: bottomNavPadding }} />
    
</View>);
  }

  // ── STEP: Content ─────────────────────────────────────────────────────────
  if (step === 'content') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgSecondary }}>
<ScrollView style={[s.screen, { backgroundColor: colors.bgSecondary }]} contentContainerStyle={s.content} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
          <Pressable
            style={[s.backBtn, { marginRight: Spacing.sm, backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
            onPress={() => setStep('prefill')}
            accessibilityRole="button"
            accessibilityLabel="Back to profile import"
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1, marginRight: 32 }}>
            <StepDots current={1} total={3} colors={colors} />
          </View>
        </View>
        <Text style={[s.stepTitle, { color: colors.textPrimary }]}>Review & Complete Content</Text>
        <Text style={[s.stepSubtitle, { color: colors.textMuted }]}>
          We pre-filled from your profile. Add your actual LinkedIn headline and verify the rest.
        </Text>

        <Card style={[s.wizardCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          {/* Target Roles */}
          <FieldLabel label="Target Job Titles (up to 3) *" colors={colors} />
          <View style={s.tagInputRow}>
            <TextInput style={[s.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
              placeholder="e.g. Product Manager" placeholderTextColor={colors.textMuted}
              value={roleInput} onChangeText={setRoleInput} onSubmitEditing={() => addTag('targetRoles', roleInput, 3)} />
            <Pressable style={s.addBtn} onPress={() => addTag('targetRoles', roleInput, 3)} disabled={wizard.targetRoles.length >= 3}>
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>
          <TagRow tags={wizard.targetRoles} onRemove={(i) => removeTag('targetRoles', i)} />

          {/* Tone */}
          <FieldLabel label="Communication Tone" colors={colors} style={{ marginTop: Spacing.lg }} />
          <View style={s.toneGrid}>
            {TONE_OPTIONS.map(t => (
              <Pressable key={t.value}
                style={[s.tonePill, { borderColor: wizard.tone === t.value ? '#0A66C2' : colors.border, backgroundColor: wizard.tone === t.value ? '#0A66C2' : colors.bgSecondary }]}
                onPress={() => setWizard(w => ({ ...w, tone: t.value }))}>
                <Ionicons name={t.icon as any} size={13} color={wizard.tone === t.value ? '#fff' : colors.textMuted} />
                <Text style={[s.tonePillText, { color: wizard.tone === t.value ? '#fff' : colors.textMuted }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* LinkedIn Headline */}
          <FieldLabel label="LinkedIn Headline *" colors={colors} style={{ marginTop: Spacing.lg }} />
          <Text style={[s.hint, { color: colors.textMuted }]}>
            { }
            {hasScraped && wizard.headline
              ? '✓ Imported from your LinkedIn profile. Review and edit if needed.'
              : 'Copy this from your LinkedIn profile header. This is required for accurate scoring.'}
          </Text>
          <TextInput style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
            placeholder='e.g. "Senior Product Manager | SaaS | ex-Google"'
            placeholderTextColor={colors.textMuted}
            value={wizard.headline}
            onChangeText={(v) => setWizard(w => ({ ...w, headline: v }))} />

          {/* About */}
          <FieldLabel label="About / Summary" colors={colors} style={{ marginTop: Spacing.lg }} />
          <Text style={[s.hint, { color: colors.textMuted }]}>
            { }
            {hasScraped && wizard.about
              ? '✓ Imported from your LinkedIn profile. Review and edit if needed.'
              : wizard.about ? 'Loaded from profile. Review and edit as needed.' : 'Paste your LinkedIn About section.'}
          </Text>
          <TextInput style={[s.input, s.multiline, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
            placeholder="Paste your About section here..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={wizard.about}
            onChangeText={(v) => setWizard(w => ({ ...w, about: v }))} />

          {/* Experience */}
          <FieldLabel label="Work History" colors={colors} style={{ marginTop: Spacing.lg }} />
          {wizard.experience.map((exp, i) => (
            <View key={i} style={[s.expBlock, { borderColor: colors.border }]}>
              <Text style={[s.expNum, { color: colors.textMuted }]}>Role {i + 1}</Text>
              <TextInput style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary, marginBottom: Spacing.xs }]}
                placeholder="Job Title" placeholderTextColor={colors.textMuted}
                value={exp.title} onChangeText={(v) => updateExp(i, 'title', v)} />
              <TextInput style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary, marginBottom: Spacing.xs }]}
                placeholder="Company" placeholderTextColor={colors.textMuted}
                value={exp.company} onChangeText={(v) => updateExp(i, 'company', v)} />
              <TextInput style={[s.input, s.multilineSm, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
                placeholder="Role description or bullet points" placeholderTextColor={colors.textMuted}
                multiline value={exp.description} onChangeText={(v) => updateExp(i, 'description', v)} />
            </View>
          ))}
          <Pressable onPress={addExpRole} style={s.addRoleBtn}>
            <Ionicons name="add-circle-outline" size={18} color="#0A66C2" />
            <Text style={[s.addRoleText, { color: '#0A66C2' }]}>Add Another Role</Text>
          </Pressable>

          {/* Skills */}
          <FieldLabel label="Skills" colors={colors} style={{ marginTop: Spacing.lg }} />
          <View style={s.tagInputRow}>
            <TextInput style={[s.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
              placeholder="Type a skill and press +"
              placeholderTextColor={colors.textMuted}
              value={skillInput} onChangeText={setSkillInput}
              onSubmitEditing={() => addTag('skills', skillInput)} />
            <Pressable style={s.addBtn} onPress={() => addTag('skills', skillInput)}>
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>
          <TagRow tags={wizard.skills} onRemove={(i) => removeTag('skills', i)} />
        </Card>

        <View style={s.navRow}>
          <Button title="← Back" variant="outline" onPress={() => setStep('prefill')} style={{ flex: 1, marginRight: Spacing.sm }} />
          <Button title="Next → Custom Spike" onPress={handleNextToSpike} style={{ flex: 1.5 }} />
        </View>
        </ScrollView>
        <View style={{ height: bottomNavPadding }} />
    
</View>);
  }

  // ── STEP: SPIKE ───────────────────────────────────────────────────────────
  if (step === 'spike') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgSecondary }}>
<ScrollView style={[s.screen, { backgroundColor: colors.bgSecondary }]} contentContainerStyle={s.content} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
          <Pressable
            style={[s.backBtn, { marginRight: Spacing.sm, backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
            onPress={() => setStep('content')}
            accessibilityRole="button"
            accessibilityLabel="Back to content step"
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1, marginRight: 32 }}>
            <StepDots current={2} total={3} colors={colors} />
          </View>
        </View>
        <Text style={[s.stepTitle, { color: colors.textPrimary }]}>Your SPIKE Differentiator</Text>
        <Text style={[s.stepSubtitle, { color: colors.textMuted }]}>
          Profiles with a SPIKE score 40% higher. This powers your headline, About, and differentiator sections.
        </Text>

        <Card style={[s.wizardCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <FieldLabel label="What sets you apart from other candidates? *" colors={colors} />
          <Text style={[s.hint, { color: colors.textMuted }]}>The one thing no one else can easily replicate about your background.</Text>
          <TextInput style={[s.input, s.multilineSm, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
            placeholder={"e.g. \"I'm the only PM with both an engineering degree and 5 years in emerging markets fintech\""}
            placeholderTextColor={colors.textMuted} multiline
            value={wizard.spike.differentiator}
            onChangeText={(v) => setWizard(w => ({ ...w, spike: { ...w.spike, differentiator: v } }))} />

          <FieldLabel label="What do colleagues / clients consistently praise? *" colors={colors} style={{ marginTop: Spacing.lg }} />
          <TextInput style={[s.input, s.multilineSm, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
            placeholder='e.g. "My ability to translate technical complexity into business language"'
            placeholderTextColor={colors.textMuted} multiline
            value={wizard.spike.praised_for}
            onChangeText={(v) => setWizard(w => ({ ...w, spike: { ...w.spike, praised_for: v } }))} />

          <FieldLabel label="Problems you solve better than most *" colors={colors} style={{ marginTop: Spacing.lg }} />
          <TextInput style={[s.input, s.multilineSm, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
            placeholder='e.g. "Turning underperforming products into category leaders"'
            placeholderTextColor={colors.textMuted} multiline
            value={wizard.spike.problems_solved}
            onChangeText={(v) => setWizard(w => ({ ...w, spike: { ...w.spike, problems_solved: v } }))} />
        </Card>

        <View style={s.navRow}>
          <Button title="← Back" variant="outline" onPress={() => setStep('content')} style={{ flex: 1 }} />
          <View style={{ width: Spacing.md }} />
          <Button
            title={analyzeMutation.isPending ? 'Analysing...' : 'Analyse Profile'}
            onPress={handleAnalyze} disabled={analyzeMutation.isPending} style={{ flex: 1 }} />
        </View>
        {analyzeMutation.isPending && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#0A66C2" />
            <Text style={[s.loadingText, { color: colors.textSecondary }]}>
              Running full profile analysis with 2026 keyword intelligence…
            </Text>
          </View>
        )}
        </ScrollView>
        <View style={{ height: bottomNavPadding }} />
    
</View>);
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  const scores = analysis?.section_scores       || {};
  const kwi    = analysis?.keyword_intelligence || {};
  const spike  = analysis?.spike;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSecondary }}>
      {/* Results Header */}
      <View style={[s.resultsHeader, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => setStep('spike')} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={[s.resultsTitle, { color: colors.textPrimary }]}>Optimisation Results</Text>
        <Pressable
          onPress={handleDownload}
          disabled={isDownloading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: Spacing.xs }}
          accessibilityRole="button"
          accessibilityLabel="Download LinkedIn optimization report"
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#0A66C2" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#0A66C2" />
          )}
        </Pressable>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[s.tabBar, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.border }]}
        contentContainerStyle={s.tabBarContent}>
        {([
          { id: 'overview', label: 'Overview',   icon: 'home-outline'     },
          { id: 'keywords', label: 'Keywords',   icon: 'search-outline'   },
          { id: 'skills',   label: 'Skills',     icon: 'ribbon-outline'   },
          { id: 'featured', label: 'Featured',   icon: 'star-outline'     },
          { id: 'outreach', label: 'Outreach',   icon: 'mail-outline'     },
          { id: 'plan',     label: '30-Day Plan',icon: 'calendar-outline' },
        ] as const).map(tab => (
          <Pressable key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id as ActiveTab)}>
            <Ionicons name={tab.icon as any} size={15}
              color={activeTab === tab.id ? '#0A66C2' : colors.textMuted} />
            <Text style={[s.tabLabel, { color: activeTab === tab.id ? '#0A66C2' : colors.textMuted }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.resultsContent} showsVerticalScrollIndicator={Platform.OS === 'web'}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={s.gap}>
            <Card style={[s.overallCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <ScoreRing score={analysis?.overall_score || 0} size={120} />
              <Text style={[s.overallLabel, { color: colors.textPrimary }]}>Overall Profile Score</Text>
              <View style={s.projectedRow}>
                <Ionicons name="trending-up" size={16} color="#10b981" />
                <Text style={[s.projectedText, { color: '#10b981' }]}>
                  Projected after optimisation: {analysis?.estimated_score_after_optimization || 0}/100
                </Text>
              </View>
            </Card>

            {spike && (
              <Card style={[s.spikeCard, { backgroundColor: '#0A66C2' }]}>
                <View style={s.spikeHeader}>
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={s.spikeTitle}>Your SPIKE Differentiator</Text>
                </View>
                <Text style={s.spikeDiff}>{spike.identified_differentiator}</Text>
                <Text style={s.spikeUvp}>{spike.unique_value_proposition}</Text>
              </Card>
            )}

            <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Section Breakdown</Text>
            {(['headline', 'about', 'experience', 'skills'] as const).map(section => (
              <SectionCard key={section}
                section={section}
                score={scores[section] || 0}
                issues={analysis?.issues?.[section] || []}
                suggestion={analysis?.suggestions?.[section]}
                optimizing={optimizingSection === (section === 'experience' ? 'EXPERIENCE_BULLETS' : section.toUpperCase())}
                done={!!sectionResults[section === 'experience' ? 'EXPERIENCE_BULLETS' : section.toUpperCase()]}
                onOptimize={() => handleOptimizeSection(section === 'experience' ? 'EXPERIENCE_BULLETS' : section.toUpperCase())}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* KEYWORDS */}
        {activeTab === 'keywords' && (
          <View style={s.gap}>
            <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Keyword Intelligence</Text>
            {kwi.missing_high_priority?.length > 0 && (
              <Card style={[s.warnCard, { backgroundColor: colors.bgPrimary, borderColor: '#f59e0b' }]}>
                <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                <Text style={[s.warnText, { color: colors.textSecondary }]}>
                  Missing high-priority: {kwi.missing_high_priority.join(' · ')}
                </Text>
              </Card>
            )}
            {kwi.top_keywords?.map((kw: any, i: number) => (
              <View key={i} style={[s.kwRow, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                <View style={[s.kwBadge, { backgroundColor: KW_COLOR[kw.category] + '22' }]}>
                  <Text style={[s.kwBadgeText, { color: KW_COLOR[kw.category] }]}>
                    {kw.category.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={[s.kwWord, { color: colors.textPrimary }]}>{kw.keyword}</Text>
                <Ionicons name={kw.present_in_profile ? 'checkmark-circle' : 'close-circle'} size={20}
                  color={kw.present_in_profile ? '#10b981' : '#ef4444'} />
              </View>
            ))}
          </View>
        )}

        {/* SKILLS */}
        {activeTab === 'skills' && (
          <View style={s.gap}>
            <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Skills Strategy</Text>
            {sectionResults['SKILLS'] ? (
              <>
                <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                  <Text style={[s.cardTitle, { color: colors.textPrimary }]}>📌 Pin These Top 5</Text>
                  {sectionResults['SKILLS'].pinned_top_5?.map((skill: string, i: number) => (
                    <View key={i} style={s.pinnedRow}>
                      <Text style={[s.pinnedNum, { color: '#0A66C2' }]}>{i + 1}.</Text>
                      <Text style={[s.pinnedSkill, { color: colors.textPrimary }]}>{skill}</Text>
                    </View>
                  ))}
                </Card>
                {Object.entries(sectionResults['SKILLS'].categorized || {}).map(([cat, items]) => (
                  <Card key={cat} style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                    <Text style={[s.catLabel, { color: colors.textMuted }]}>{cat.replace(/_/g, ' ').toUpperCase()}</Text>
                    <View style={s.pillRow}>
                      {(items as string[]).map((sk, i) => (
                        <View key={i} style={[s.pill, { backgroundColor: colors.bgSecondary }]}>
                          <Text style={[s.pillText, { color: colors.textPrimary }]}>{sk}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                ))}
              </>
            ) : (
              <CtaCard label="Generate Skills Strategy" description="Top-5 pinned skills + categorised list of 30-50+ skills." loading={optimizingSection === 'SKILLS'} onPress={() => handleOptimizeSection('SKILLS')} colors={colors} />
            )}
          </View>
        )}

        {/* FEATURED */}
        {activeTab === 'featured' && (
          <View style={s.gap}>
            <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Featured Section</Text>
            {sectionResults['FEATURED'] ? sectionResults['FEATURED'].recommended_items?.map((item: any, i: number) => (
              <Card key={i} style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                <View style={[s.featuredBadge, { backgroundColor: '#0A66C2' }]}>
                  <Text style={s.featuredBadgeText}>{item.type.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={[s.cardTitle, { color: colors.textPrimary, marginTop: Spacing.sm }]}>{item.title}</Text>
                <Text style={[s.bodyText, { color: colors.textSecondary }]}>{item.description}</Text>
                <Text style={[s.cta, { color: '#0A66C2' }]}>→ {item.cta}</Text>
              </Card>
            )) : (
              <CtaCard label="Get Featured Recommendations" description="3-5 proof artifact recommendations ordered by recruiter impact." loading={optimizingSection === 'FEATURED'} onPress={() => handleOptimizeSection('FEATURED')} colors={colors} />
            )}
          </View>
        )}

        {/* OUTREACH */}
        {activeTab === 'outreach' && (
          <View style={s.gap}>
            <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Outreach Kit</Text>
            {sectionResults['OUTREACH_KIT'] ? (
              [
                { key: 'inbound_response',   label: 'Responding to a Recruiter', icon: 'mail'   },
                { key: 'proactive_outreach',  label: 'Proactive Outreach',        icon: 'send'   },
                { key: 'referral_request',    label: 'Referral Request',          icon: 'people' },
              ].map(({ key, label, icon }) => (
                <Card key={key} style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                  <View style={s.outreachHeader}>
                    <Ionicons name={icon as any} size={18} color="#0A66C2" />
                    <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{label}</Text>
                  </View>
                  <Text style={[s.bodyText, { color: colors.textSecondary }]}>{sectionResults['OUTREACH_KIT'][key]}</Text>
                  <Button title="Copy" variant="outline" size="sm" onPress={() => copy(sectionResults['OUTREACH_KIT'][key])} style={{ marginTop: Spacing.sm }} />
                </Card>
              ))
            ) : (
              <CtaCard label="Generate Outreach Kit" description="3 personalised recruiter message templates with [PLACEHOLDERS] to customise." loading={optimizingSection === 'OUTREACH_KIT'} onPress={() => handleOptimizeSection('OUTREACH_KIT')} colors={colors} />
            )}
          </View>
        )}

        {/* 30-DAY PLAN */}
        {activeTab === 'plan' && (
          <View style={s.gap}>
            <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>30-Day Engagement Plan</Text>
            {engagementPlan ? (
              <>
                {engagementPlan.weeks?.map((week: any, wi: number) => (
                  <Card key={wi} style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                    <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{week.week_label}</Text>
                    <Text style={[s.weekTheme, { color: '#0A66C2' }]}>{week.theme}</Text>
                    {week.tasks?.map((task: any, ti: number) => (
                      <View key={ti} style={[s.taskRow, { borderTopColor: colors.border }]}>
                        <View style={s.taskMeta}>
                          <Text style={[s.taskDay,  { color: colors.textMuted }]}>{task.day}</Text>
                          <Text style={[s.taskTime, { color: colors.textMuted }]}>{task.time_needed}</Text>
                        </View>
                        <Text style={[s.bodyText, { color: colors.textPrimary }]}>{task.action}</Text>
                      </View>
                    ))}
                  </Card>
                ))}
                {engagementPlan.monthly_cadence?.map((h: string, i: number) => (
                  <Text key={i} style={[s.habitItem, { color: colors.textSecondary }]}>• {h}</Text>
                ))}
              </>
            ) : (
              <Card style={[s.planCta, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={48} color="#0A66C2" style={{ marginBottom: Spacing.md }} />
                <Text style={[s.cardTitle, { color: colors.textPrimary, textAlign: 'center' }]}>30-Day Engagement Plan</Text>
                <Text style={[s.bodyText, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs }]}>
                  Weekly posting, commenting, and networking schedule to maximise visibility after optimisation.
                </Text>
                <Button 
                  title={engagementMutation.isPending ? 'Generating…' : 'Generate Plan'}
                  onPress={handleEngagementPlan}
                  disabled={engagementMutation.isPending}
                  style={{ marginTop: Spacing.lg }}
                />
              </Card>
            )}
          </View>
        )}

        {/* Download CTA */}
        <Pressable
          style={[s.downloadBtn, { backgroundColor: '#0A66C2' }, isDownloading && { opacity: 0.6 }]}
          onPress={handleDownload}
          disabled={isDownloading}
          accessibilityRole="button"
          accessibilityLabel="Download LinkedIn optimization report"
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={s.downloadBtnText}>Download PDF Report</Text>
            </>
          )}
        </Pressable>

        </ScrollView>

        <View style={{ height: bottomNavPadding }} />
    </View>
  );
}

// ─── Small Components ─────────────────────────────────────────────────────────

function StepDots({ current, total, colors }: { current: number; total: number; colors: any }) {
  return (
    <View style={s.stepDots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.dot, { backgroundColor: i <= current ? '#0A66C2' : colors.border }]} />
      ))}
    </View>
  );
}

function FieldLabel({ label, colors, style }: { label: string; colors: any; style?: any }) {
  return <Text style={[s.fieldLabel, { color: colors.textPrimary }, style]}>{label}</Text>;
}

function TagRow({ tags, onRemove }: { tags: string[]; onRemove: (i: number) => void }) {
  return (
    <View style={s.pillRow}>
      {tags.map((t, i) => (
        <View key={i} style={[s.pill, { backgroundColor: '#0A66C2' }]}>
          <Text style={[s.pillText, { color: '#fff' }]}>{t}</Text>
          <Pressable onPress={() => onRemove(i)} style={{ marginLeft: 4 }}>
            <Ionicons name="close" size={13} color="#fff" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function SectionCard({ section, score, issues, suggestion, optimizing, done, onOptimize, colors }: any) {
  const [open, setOpen] = useState(false);
  const label = section === 'about' ? 'About / Summary' : section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
      <Pressable onPress={() => setOpen(o => !o)} style={s.sectionRow}>
        <ScoreRing score={score} size={48} hideText />
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[s.scoreText, { color: colors.textSecondary }]}>{score}/100</Text>
        </View>
        <Ionicons name={score >= 80 ? 'checkmark-circle' : 'warning-outline'} size={20} color={score >= 80 ? '#10b981' : '#f59e0b'} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textMuted} style={{ marginLeft: 4 }} />
      </Pressable>
      {open && (
        <View style={{ marginTop: Spacing.md }}>
          {suggestion && (
            <View style={[s.suggBox, { backgroundColor: '#0A66C2' + '15', borderColor: '#0A66C2' }]}>
              <Text style={[s.bodyText, { color: colors.textPrimary }]}>💡 {suggestion}</Text>
            </View>
          )}
          {issues.map((iss: string, i: number) => (
            <Text key={i} style={[s.issueItem, { color: colors.textSecondary }]}>• {iss}</Text>
          ))}
          <Button
            title={optimizing ? 'Optimizing…' : done ? '✓ Optimized — see tab' : 'AI Rewrite & Enhance'}
            variant="outline" size="sm" onPress={onOptimize} disabled={optimizing}
            style={{ marginTop: Spacing.md }} />
        </View>
      )}
    </Card>
  );
}

function CtaCard({ label, description, loading, onPress, colors }: any) {
  return (
    <Card style={[s.card, { backgroundColor: colors.bgPrimary, borderColor: colors.border, alignItems: 'center' }]}>
      <Text style={[s.cardTitle, { color: colors.textPrimary, textAlign: 'center' }]}>{label}</Text>
      <Text style={[s.bodyText, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs }]}>{description}</Text>
      <Button title={loading ? 'Generating…' : 'Generate'} onPress={onPress} disabled={loading} style={{ marginTop: Spacing.md }} />
    </Card>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:          { flex: 1 },
  content:         { padding: Spacing.lg, paddingBottom: Spacing.xl, maxWidth: 800, width: '100%', alignSelf: 'center' },
  pageHeader:      { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
  liIcon:          { width: 64, height: 64, borderRadius: Radius.full, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  pageTitle:       { ...Typography.headingLg, marginBottom: Spacing.xs, textAlign: 'center' },
  pageSubtitle:    { ...Typography.bodyMd, textAlign: 'center', paddingHorizontal: Spacing.lg },
  accountCard:     { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.lg },
  accountRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatar:          { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder:{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  accountName:     { ...Typography.subtitle1 },
  accountDetail:   { ...Typography.bodySm, marginTop: 2 },
  oauthInfoBox:    { borderRadius: Radius.md, padding: Spacing.md },
  oauthInfoTitle:  { ...Typography.bodySm, fontWeight: '700', marginBottom: 4 },
  oauthInfoText:   { ...Typography.bodySm, lineHeight: 20 },
  sectionLabel:    { ...Typography.headingMd, marginBottom: Spacing.sm },
  prefillCard:     { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.lg },
  prefillRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md },
  prefillLabel:    { ...Typography.bodySm },
  prefillValue:    { ...Typography.bodyMd },
  warnCard:        { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, marginBottom: Spacing.md },
  warnText:        { ...Typography.bodyMd, flex: 1, lineHeight: 20 },
  stepDots:        { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.lg },
  dot:             { width: 36, height: 4, borderRadius: 2 },
  stepTitle:       { ...Typography.headingLg, textAlign: 'center', marginBottom: Spacing.xs },
  stepSubtitle:    { ...Typography.bodyMd, textAlign: 'center', marginBottom: Spacing.xl },
  wizardCard:      { padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1 },
  fieldLabel:      { ...Typography.subtitle1, marginBottom: Spacing.xs },
  hint:            { ...Typography.bodySm, marginBottom: Spacing.xs },
  input:           { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, ...Typography.bodyMd },
  multiline:       { minHeight: 120, maxHeight: 180, textAlignVertical: 'top' },
  multilineSm:     { minHeight: 80, maxHeight: 140, textAlignVertical: 'top' },
  tagInputRow:     { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm },
  addBtn:          { backgroundColor: '#0A66C2', borderRadius: Radius.md, padding: Spacing.md },
  toneGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tonePill:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  tonePillText:    { ...Typography.bodySm },
  expBlock:        { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  expNum:          { ...Typography.bodySm, marginBottom: Spacing.xs },
  addRoleBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  addRoleText:     { ...Typography.bodyMd },
  navRow:          { flexDirection: 'row', marginTop: Spacing.lg },
  loadingBox:      { alignItems: 'center', padding: Spacing.xl },
  loadingText:     { ...Typography.bodyMd, marginTop: Spacing.md, textAlign: 'center' },
  resultsHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1 },
  resultsTitle:    { ...Typography.headingMd },
  backBtn:         { padding: Spacing.xs },
  tabBar:          { flexGrow: 0, borderBottomWidth: 1 },
  tabBarContent:   { paddingHorizontal: Spacing.md },
  tab:             { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  tabActive:       { borderBottomColor: '#0A66C2', borderBottomWidth: 2 },
  tabLabel:        { ...Typography.bodySm },
  resultsContent:  { padding: Spacing.lg, paddingBottom: Spacing.xl, maxWidth: 800, width: '100%', alignSelf: 'center' },
  gap:             { gap: Spacing.lg },
  overallCard:     { alignItems: 'center', padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1 },
  overallLabel:    { ...Typography.headingMd, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  projectedRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  projectedText:   { ...Typography.bodyMd, fontWeight: '600' },
  spikeCard:       { padding: Spacing.xl, borderRadius: Radius.lg },
  spikeHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  spikeTitle:      { ...Typography.subtitle1, color: '#fff' },
  spikeDiff:       { ...Typography.bodyMd, color: '#fff', fontWeight: '600', marginBottom: Spacing.xs },
  spikeUvp:        { ...Typography.bodySm, color: 'rgba(255,255,255,0.85)' },
  card:            { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1 },
  cardTitle:       { ...Typography.subtitle1, marginBottom: Spacing.xs },
  bodyText:        { ...Typography.bodyMd, lineHeight: 20 },
  scoreText:       { ...Typography.bodySm, fontWeight: '600' },
  sectionRow:      { flexDirection: 'row', alignItems: 'center' },
  suggBox:         { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  issueItem:       { ...Typography.bodyMd, marginBottom: 4 },
  kwRow:           { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: Spacing.sm },
  kwBadge:         { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  kwBadgeText:     { ...Typography.bodySm, fontWeight: '700', fontSize: 10 },
  kwWord:          { ...Typography.bodyMd, flex: 1 },
  pinnedRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  pinnedNum:       { ...Typography.subtitle1, width: 24 },
  pinnedSkill:     { ...Typography.bodyMd },
  catLabel:        { ...Typography.bodySm, fontWeight: '700', marginBottom: Spacing.sm },
  pillRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  pill:            { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  pillText:        { ...Typography.bodySm },
  featuredBadge:   { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  featuredBadgeText:{ ...Typography.bodySm, color: '#fff', fontWeight: '700', fontSize: 10 },
  cta:             { ...Typography.bodyMd, fontWeight: '700', marginTop: Spacing.xs },
  outreachHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  weekTheme:       { ...Typography.bodyMd, fontWeight: '600', marginBottom: Spacing.md },
  taskRow:         { borderTopWidth: 1, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  taskMeta:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  taskDay:         { ...Typography.bodySm, fontWeight: '700' },
  taskTime:        { ...Typography.bodySm },
  habitItem:       { ...Typography.bodyMd, marginBottom: Spacing.xs },
  planCta:         { padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center' },
  downloadBtn:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full, gap: 8, marginTop: Spacing.sm, ...Shadow.card,
  },
  downloadBtnText: { ...Typography.headingMd, color: '#fff' },
  // ── LinkedIn Connect Prompt styles ────────────────────────────────────────
  connectCard:     { padding: Spacing.xl, borderRadius: Radius.xl, alignItems: 'center', marginBottom: Spacing.lg },
  connectTitle:    { ...Typography.headingLg, color: '#fff', textAlign: 'center', marginBottom: Spacing.sm },
  connectBody:     { ...Typography.bodyMd, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
  whatYouGet:      { borderRadius: Radius.lg, padding: Spacing.lg, width: '100%', gap: Spacing.sm, marginBottom: Spacing.xl },
  whatRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  whatText:        { ...Typography.bodyMd, color: 'rgba(255,255,255,0.9)' },
  connectBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: Radius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, width: '100%' },
  connectBtnText:  { ...Typography.bodyLg, fontWeight: '700', color: '#0A66C2' },
  limitCard:       { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.lg },
  limitTitle:      { ...Typography.subtitle1, marginBottom: Spacing.sm },
  limitBody:       { ...Typography.bodyMd, lineHeight: 22 },
  skipBtn:         { alignItems: 'center', paddingVertical: Spacing.lg },
  skipText:        { ...Typography.bodyMd, textDecorationLine: 'underline' },
});
