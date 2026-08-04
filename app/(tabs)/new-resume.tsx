import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Image, Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '../../src/components/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useProfileStore } from '../../src/stores/profile-store';
import {
  useResumeQuery, useUpdateResumeMutation,
  useRewriteSectionMutation, useCreateResumeMutation, useAnalyzeJobMutation, useDeleteResumeMutation,
  useExtractJdMutation, useParseResumeMutation
} from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { handleApiError } from '../../src/lib/errorHandler';
import { useNotificationStore } from '../../src/stores/notification-store';
import { usePreviewStore } from '../../src/store/previewStore';
import { buildResumeHTML } from '../../src/lib/resumeHTML';
import { supabase } from '../../src/lib/supabase';
import { useUIStore } from '../../src/stores/ui-store';
import { useInterstitialAd } from '../../src/lib/useInterstitialAd';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFilePicker } from '../../src/hooks/useFilePicker';
// ─── Types ────────────────────────────────────────────────────────────────────

interface Header {
  name: string; title: string; subtitle?: string; email: string;
  phone: string; linkedin: string; portfolio?: string; location: string;
}

interface ExperienceEntry {
  id: string; title: string; company: string;
  date_range: string; location?: string; bullets: string[];
}

interface SkillCategory { id: string; category: string; items: string[]; }

interface EducationEntry {
  id: string; degree: string; institution: string; year: string; note?: string;
}

interface CertificationEntry {
  id: string; name: string; issuer: string; year: string;
}

interface AwardEntry {
  id: string; name: string; issuer: string; year: string;
}

interface FeaturedProject {
  include: boolean; name: string; tech_stack: string; bullet: string;
}

interface DraftResume {
  templateId?: string;
  header: Header;
  summary: string;
  experience: ExperienceEntry[];
  skills: SkillCategory[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  awards: AwardEntry[];
  featuredProject?: FeaturedProject;
  sections_to_include?: {
    summary: boolean;
    skills: boolean;
    experience: boolean;
    featured_project: boolean;
    education: boolean;
    certifications: boolean;
    recognition: boolean;
  };
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { 
    id: 'executive', 
    name: 'Executive', 
    description: 'Clean single-column, leadership-focused',
    atsScore: 95,
    isPremium: false,
    image: require('../../assets/logo.png')
  },
  { 
    id: 'minimal', 
    name: 'Minimal', 
    description: 'Whitespace-heavy, typography-driven',
    atsScore: 94,
    isPremium: false,
    image: require('../../assets/logo.png')
  },
  { 
    id: 'tech-stack', 
    name: 'Tech Stack', 
    description: 'Projects-first, GitHub-linked',
    atsScore: 90,
    isPremium: false,
    image: require('../../assets/logo.png')
  },
  { 
    id: 'academic', 
    name: 'Academic', 
    description: 'Publications and research focus',
    atsScore: 93,
    isPremium: true,
    image: require('../../assets/logo.png')
  },
];

// ─── Blank resume scaffold ─────────────────────────────────────────────────────

const blankResume = (templateId: string | null): DraftResume => ({
  templateId: templateId || 'executive',
  header: { name: '', title: '', subtitle: '', email: '', phone: '', linkedin: '', portfolio: '', location: '' },
  summary: '',
  experience: [],
  skills: [],
  education: [],
  certifications: [],
  awards: [],
  featuredProject: { include: false, name: '', tech_stack: '', bullet: '' },
  sections_to_include: {
    summary: true,
    skills: true,
    experience: true,
    featured_project: false,
    education: true,
    certifications: false,
    recognition: false,
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const aiResume = (templateId: string | null): DraftResume => ({
  templateId: templateId || 'executive',
  header: {
    name: 'Alex Morgan',
    title: 'Senior Product Strategy Lead',
    subtitle: '',
    email: 'alex.morgan@email.com',
    phone: '+1 (555) 234-5678',
    linkedin: 'linkedin.com/in/alexmorgan',
    portfolio: '',
    location: 'San Francisco, CA',
  },
  summary: 'Senior Product Strategy Lead with 5+ years of experience scaling SaaS platforms, driving $20M+ in revenue growth, and leading cross-functional teams across EMEA.',
  experience: [
    {
      id: '1',
      title: 'Senior Strategy Lead',
      company: 'Global Tech Solutions',
      date_range: '2021 – Present',
      location: '',
      bullets: [
        'Led digital transformation initiatives across 12 product teams',
        'Managed $20M+ product portfolio driving 40% YoY growth',
        'Built and mentored a team of 8 product managers',
      ],
    },
    {
      id: '2',
      title: 'Product Manager',
      company: 'InnovateCo',
      date_range: '2019 – 2021',
      location: '',
      bullets: [
        'Launched 3 core B2B features adopted by 500+ enterprise clients',
        'Reduced churn by 18% through data-driven roadmap prioritization',
      ],
    },
  ],
  skills: [
    { id: '1', category: 'Core Competencies', items: ['Product Strategy', 'Leadership', 'Data Analysis', 'Roadmapping', 'Stakeholder Management'] },
  ],
  education: [
    { id: '1', degree: 'MBA', institution: 'Stanford University', year: '2016 – 2018', note: 'GPA: 3.9' },
    { id: '2', degree: 'BSc Computer Science', institution: 'UC Berkeley', year: '2012 – 2016', note: 'GPA: 3.7' },
  ],
  certifications: [],
  awards: [],
  featuredProject: { include: false, name: '', tech_stack: '', bullet: '' },
  sections_to_include: {
    summary: true,
    skills: true,
    experience: true,
    featured_project: false,
    education: true,
    certifications: false,
    recognition: false,
  }
});

// ─── Utility ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResumeBuilderScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, template, fromList } = useLocalSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  const [isEditMode, setIsEditMode] = useState(true);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('executive');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);

  const [aiGeneratedContent, setAiGeneratedContent] = useState<any>(null);
  const [expandedExp, setExpandedExp] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [expandedEdu, setExpandedEdu] = useState<string | null>(null);
  const [expandedCert, setExpandedCert] = useState<string | null>(null);
  const [expandedAward, setExpandedAward] = useState<string | null>(null);
  const { addNotification } = useNotificationStore();

  const updateMutation = useUpdateResumeMutation();
  const rewriteMutation = useRewriteSectionMutation();
  const createResumeMutation = useCreateResumeMutation();
  const analyzeJobMutation = useAnalyzeJobMutation();
  const extractJd = useExtractJdMutation();
  const parseResume = useParseResumeMutation();
  const deleteMutation = useDeleteResumeMutation();
  const [isImportingResume, setIsImportingResume] = useState(false);

  const { showAd: showInterstitialAd, loaded: interstitialLoaded } = useInterstitialAd();
  const { incrementInterstitialCount, resetInterstitialCount } = useUIStore();

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      Toast.show({ type: 'error', text1: 'Please select a template.' });
      return;
    }
    try {
      Toast.show({ type: 'info', text1: 'Generating tailored resume...', text2: 'This may take a moment' });
      let job_analysis_id = undefined;

      // Use file text if available, otherwise use text input
      const finalJobDescription = jdFileText.trim().length > 0 ? jdFileText : jobDescription.trim();
      const finalJobUrl = jobUrl.trim();

      if (finalJobDescription.length > 10 || finalJobUrl.length > 5) {
        const analyzeRes = await analyzeJobMutation.mutateAsync({ 
          jdText: finalJobDescription.length > 10 ? finalJobDescription : undefined,
          jdUrl: finalJobUrl.length > 5 ? finalJobUrl : undefined,
          profileData: profile
        });
        job_analysis_id = analyzeRes.job_id;
      }

      const res = await createResumeMutation.mutateAsync({
        title: (jobDescription.trim().length > 10 || finalJobUrl.length > 5) ? 'Tailored Resume' : 'Base Resume',
        template_id: selectedTemplateId,
        job_analysis_id,
        is_base: jobDescription.trim().length === 0 && jdFileText.trim().length === 0 && finalJobUrl.length === 0
      });

      router.setParams({ id: res.resume_id });
      Toast.show({ type: 'success', text1: 'Resume generated!' });

      incrementInterstitialCount();
      const updatedCount = useUIStore.getState().interstitialActionCount;
      if (!isPro && interstitialLoaded && updatedCount >= 2) {
        showInterstitialAd();
        resetInterstitialCount();
      }
    } catch (e: any) {
      handleApiError(e.message, { fallbackTitle: 'Generation Failed' });
    }
  };

  const { data: resumeData, isLoading } = useResumeQuery(id as string);
  const remoteResume = resumeData?.resume_contents?.[0];
  const { profile } = useProfileStore();

  const [draft, setDraft] = useState<DraftResume | null>(null);
  const generationChannelRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (generationChannelRef.current) {
        supabase.removeChannel(generationChannelRef.current);
      }
    };
  }, []);

  // Sync from remote when loaded
  React.useEffect(() => {
    if (remoteResume && !draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({
        templateId: remoteResume.templateId || 'modern',
        header: remoteResume.contact || { name: remoteResume.name || '', title: remoteResume.title || '', subtitle: '', email: '', phone: '', linkedin: '', portfolio: '', location: '' },
        summary: remoteResume.summary || '',
        experience: (remoteResume.experience || []).map((e: any) => ({ ...e, id: e.id || uid(), bullets: e.bullets || [] })),
        skills: (remoteResume.skills || []).map((s: any) => ({ ...s, id: s.id || uid(), items: s.items || [] })),
        education: (remoteResume.education || []).map((e: any) => ({ ...e, id: e.id || uid() })),
        certifications: (remoteResume.certifications || []).map((c: any) => {
          if (typeof c === 'string') {
            return { id: uid(), name: c, issuer: '', year: '' };
          }
          return { ...c, id: c.id || uid() };
        }),
        awards: (remoteResume.awards || []).map((a: any) => ({ ...a, id: a.id || uid() })),
        featuredProject: (remoteResume.projects && remoteResume.projects.length > 0) 
          ? remoteResume.projects[0] 
          : { include: false, name: '', tech_stack: '', bullet: '' },
        sections_to_include: remoteResume.sections_to_include || {
          summary: true,
          skills: true,
          experience: true,
          featured_project: false,
          education: true,
          certifications: remoteResume.certifications?.length > 0,
          recognition: remoteResume.awards?.length > 0,
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteResume]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!draft) return;
    try {
      if (id) {
        await updateMutation.mutateAsync({ id: id as string, resume_contents: [draft] });
      }
      Toast.show({ type: 'success', text1: 'Resume saved!' });
      addNotification({ title: 'Resume Saved', description: 'Your resume has been saved to the cloud.', type: 'success' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: e.message });
    }
  };

  // ── AI Rewrite Summary ────────────────────────────────────────────────────
  const handleAIRewrite = async () => {
    if (!draft?.summary) return;
    try {
      Toast.show({ type: 'info', text1: 'AI is polishing your summary...' });
      const res = await rewriteMutation.mutateAsync({ text: draft.summary, section_type: 'summary' });
      setDraft(prev => prev ? { ...prev, summary: res.rewritten } : prev);
      Toast.show({ type: 'success', text1: 'Summary improved!' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'AI rewrite failed', text2: e.message });
    }
  };

  const handleRewriteItem = async (sectionType: string, text: string, onUpdate: (rewritten: string) => void) => {
    if (!text || text.trim() === '') {
       Toast.show({ type: 'error', text1: 'Nothing to rewrite.' });
       return;
    }
    try {
      Toast.show({ type: 'info', text1: 'AI is polishing...' });
      const res = await rewriteMutation.mutateAsync({ text, section_type: sectionType });
      onUpdate(res.rewritten);
      Toast.show({ type: 'success', text1: 'Polished!' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'AI rewrite failed', text2: e.message });
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────────
  const handlePreview = () => {
    if (!draft) return;
    try {
      const data: any = {
        header: draft.header,
        summary: { text: draft.summary },
        experience: draft.experience,
        skills: draft.skills,
        education: draft.education,
        featured_project: draft.featuredProject,
        certifications: draft.certifications.map(c => [c.name, c.issuer, c.year].filter(Boolean).join(' - ')),
        recognition: draft.awards.map(a => [a.name, a.issuer, a.year].filter(Boolean).join(' - ')),
        sections_to_include: {
          summary: draft.sections_to_include?.summary !== false && !!draft.summary,
          skills: draft.sections_to_include?.skills !== false && draft.skills.length > 0,
          experience: draft.sections_to_include?.experience !== false && draft.experience.length > 0,
          featured_project: draft.sections_to_include?.featured_project !== false && !!draft.featuredProject?.include,
          education: draft.sections_to_include?.education !== false && draft.education.length > 0,
          certifications: draft.sections_to_include?.certifications !== false && draft.certifications.length > 0,
          languages: false,
          recognition: draft.sections_to_include?.recognition !== false && draft.awards.length > 0,
        }
      };
      
      const htmlString = buildResumeHTML(data, draft.templateId);
      usePreviewStore.getState().setPreview('resume', data, htmlString, draft.templateId);
      router.push('/preview' as any);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Preview generation failed', text2: e.message });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      "Delete Resume",
      "Are you sure you want to delete this resume? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              if (!id) return;
              await deleteMutation.mutateAsync(id as string);
              router.back();
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Delete Failed', text2: e.message });
            }
          }
        }
      ]
    );
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!draft) return;
    
    setIsExporting(true);
    
    try {
      // First save the resume
      if (id) {
        await updateMutation.mutateAsync({ id: id as string, resume_contents: [draft] });
      }

      // Prepare resume data for export
      const resumeData: any = {
        header: draft.header,
        summary: { text: draft.summary },
        experience: draft.experience,
        skills: draft.skills,
        education: draft.education,
        featured_project: draft.featuredProject,
        certifications: draft.certifications.map(c => [c.name, c.issuer, c.year].filter(Boolean).join(' - ')),
        recognition: draft.awards.map(a => [a.name, a.issuer, a.year].filter(Boolean).join(' - ')),
        sections_to_include: {
          summary: draft.sections_to_include?.summary !== false && !!draft.summary,
          skills: draft.sections_to_include?.skills !== false && draft.skills.length > 0,
          experience: draft.sections_to_include?.experience !== false && draft.experience.length > 0,
          featured_project: draft.sections_to_include?.featured_project !== false && !!draft.featuredProject?.include,
          education: draft.sections_to_include?.education !== false && draft.education.length > 0,
          certifications: draft.sections_to_include?.certifications !== false && draft.certifications.length > 0,
          languages: false,
          recognition: draft.sections_to_include?.recognition !== false && draft.awards.length > 0,
        }
      };

      // Dynamic import of export functions
      const { exportResumePDF, exportResumeDOCX } = await import('../../src/lib/resumeExport');

      // Export based on format
      if (format === 'pdf') {
        await exportResumePDF(resumeData, draft.templateId);
        Toast.show({ type: 'success', text1: 'PDF Downloaded!', text2: 'Check your downloads folder' });
      } else {
        await exportResumeDOCX(resumeData, draft.templateId);
        Toast.show({ type: 'success', text1: 'DOCX Downloaded!', text2: 'Check your downloads folder' });
      }

      addNotification({
        title: 'Resume Downloaded',
        description: `Your resume has been exported as ${format.toUpperCase()}`,
        type: 'success',
      });

      setIsExportModalVisible(false);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Export Failed', text2: error.message });
    } finally {
      setIsExporting(false);
    }
  };



  // ── File Attachment Handlers ────────────────────────────────────────
  const { pickFile, isPicking: isJdFilePicking } = useFilePicker();
  const extractJdLoading = isJdFilePicking || extractJd.isPending;

  /**
   * Import resume file → parse with AI → auto-populate form fields.
   * Called from the template-selection modal.
   */
  const handleImportResumeFile = async () => {
    setIsImportingResume(true);
    await pickFile({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      maxSizeMb: 5,
      onFilePicked: async (payload) => {
        Toast.show({ type: 'info', text1: 'Reading resume...', text2: 'AI is extracting your details.' });
        try {
          // 1. Upload file to storage
          const { user } = useAuthStore.getState();
          const userId = user?.id;
          if (!userId) throw new Error('User not authenticated');
          const storagePath = `resume-uploads/${userId}/${Date.now()}-${payload.fileName}`;
          // Use ArrayBuffer on mobile — Android's fetch().blob() returns type='text/plain'
          // which causes "Unsupported FormDataPart implementation" in Supabase Storage.
          // ArrayBuffer bypasses blob type inference; contentType option controls MIME.
          let uploadBody: Blob | ArrayBuffer;
          if (payload.webFile) {
            uploadBody = payload.webFile;
          } else {
            const resp = await fetch(payload.fileUri);
            uploadBody = await resp.arrayBuffer();
          }
          const { error: uploadError } = await supabase
            .storage
            .from('interview-ready-files')
            .upload(storagePath, uploadBody, { contentType: payload.mimeType, upsert: false });
          if (uploadError) throw uploadError;

          // 2. Parse with AI
          const parsed = await parseResume.mutateAsync(payload);

          // 3. Map parsed data → DraftResume fields
          const importedDraft: DraftResume = {
            templateId: selectedTemplateId || 'executive',
            header: {
              name: '',
              title: parsed.current_role || '',
              subtitle: parsed.company || '',
              email: '',
              phone: '',
              linkedin: '',
              portfolio: '',
              location: '',
            },
            summary: parsed.summary || '',
            experience: (parsed.work_history || []).map((w: any) => ({
              id: uid(),
              title: w.title || '',
              company: w.company || '',
              date_range: [w.start_date, w.current ? 'Present' : w.end_date].filter(Boolean).join(' – '),
              location: '',
              bullets: w.description
                ? w.description.split('\n').map((s: string) => s.trim()).filter(Boolean)
                : [],
            })),
            skills: [
              ...(parsed.technical_skills?.length
                ? [{ id: uid(), category: 'Technical Skills', items: parsed.technical_skills }]
                : []),
              ...(parsed.soft_skills?.length
                ? [{ id: uid(), category: 'Soft Skills', items: parsed.soft_skills }]
                : []),
            ],
            education: (parsed.education || []).map((e: any) => ({
              id: uid(),
              degree: [e.degree, e.field].filter(Boolean).join(' in '),
              institution: e.school || '',
              year: e.end_date || e.start_date || '',
              note: e.gpa ? `GPA: ${e.gpa}` : undefined,
            })),
            certifications: [],
            awards: [],
            featuredProject: { include: false, name: '', tech_stack: '', bullet: '' },
            sections_to_include: {
              summary: !!parsed.summary,
              skills: (parsed.technical_skills?.length > 0 || parsed.soft_skills?.length > 0),
              experience: (parsed.work_history?.length > 0),
              featured_project: false,
              education: (parsed.education?.length > 0),
              certifications: false,
              recognition: false,
            },
          };

          setDraft(importedDraft);
          setIsTemplateModalVisible(false);
          Toast.show({
            type: 'success',
            text1: 'Resume imported!',
            text2: 'Review and fill in any remaining details.',
          });
        } catch (err: any) {
          Toast.show({ type: 'error', text1: 'Import failed', text2: err.message || 'Please try again.' });
        } finally {
          setIsImportingResume(false);
        }
      },
      successMessage: { text1: 'Resume parsed', text2: 'Fields have been populated from your file.' },
    });
    setIsImportingResume(false);
  };

  const handleAttachJdFile = async () => {
    await pickFile({
      type: ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      allowedTypes: ['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      maxSizeMb: 5,
      onFilePicked: async (payload) => {
        Toast.show({ type: 'info', text1: 'Uploading File...', text2: 'Saving your file to secure storage.' });
        try {
          const fileName = payload.fileName;
          const { user } = useAuthStore.getState();
          const userId = user?.id;
          if (!userId) {
            throw new Error('User not authenticated');
          }
          const storagePath = `jd-uploads/${userId}/${Date.now()}-${fileName}`;
          // Use ArrayBuffer on mobile — Android's fetch().blob() returns type='text/plain'
          // which causes "Unsupported FormDataPart implementation" in Supabase Storage.
          // ArrayBuffer bypasses blob type inference; contentType option controls MIME.
          let uploadBody: Blob | ArrayBuffer;
          if (payload.webFile) {
            uploadBody = payload.webFile;
          } else {
            const response = await fetch(payload.fileUri);
            uploadBody = await response.arrayBuffer();
          }
          const { error: uploadError } = await supabase
            .storage
            .from('interview-ready-files')
            .upload(storagePath, uploadBody, {
              contentType: payload.mimeType,
              upsert: false
            });
          if (uploadError) throw uploadError;
          // Proceed with original extraction
          const { extracted_text } = await extractJd.mutateAsync(payload);
          setJdFileText(extracted_text);
          setJdFileName(payload.fileName);
        } catch (error: any) {
          Toast.show({ type: 'error', text1: 'Upload or extraction failed', text2: error.message || 'Please try again.' });
        }
      },
      successMessage: { text1: 'Text extracted', text2: 'Text has been extracted from the file and is ready for use.' }
    });
  };

  const handleRemoveAttachedJd = () => {
    setJdFileText('');
    setJdFileName(null);
  };

  // ── Experience helpers ────────────────────────────────────────────────────
  const addExperience = () => {
    const newEntry: ExperienceEntry = { id: uid(), title: '', company: '', date_range: '', location: '', bullets: [''] };
    setDraft(prev => prev ? { ...prev, experience: [...prev.experience, newEntry] } : prev);
    setExpandedExp(newEntry.id);
  };
  const deleteExperience = (expId: string) => {
    setDraft(prev => prev ? { ...prev, experience: prev.experience.filter(e => e.id !== expId) } : prev);
  };
  const updateExp = (expId: string, field: keyof ExperienceEntry, value: string | string[]) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, experience: prev.experience.map(e => e.id === expId ? { ...e, [field]: value } : e) };
    });
  };
  const addBullet = (expId: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, experience: prev.experience.map(e => e.id === expId ? { ...e, bullets: [...e.bullets, ''] } : e) };
    });
  };
  const updateBullet = (expId: string, idx: number, val: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        experience: prev.experience.map(e =>
          e.id === expId
            ? { ...e, bullets: e.bullets.map((b: string, i: number) => i === idx ? val : b) }
            : e
        )
      };
    });
  };
  const deleteBullet = (expId: string, idx: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, experience: prev.experience.map(e => e.id === expId ? { ...e, bullets: e.bullets.filter((_: string, i: number) => i !== idx) } : e) };
    });
  };

  // ── Skill helpers ─────────────────────────────────────────────────────────
  const addSkill = () => {
    const newSkill = { id: uid(), category: '', items: [] };
    setDraft(prev => prev ? { ...prev, skills: [...prev.skills, newSkill] } : prev);
    setExpandedSkill(newSkill.id);
  };
  const updateSkill = (skillId: string, category: string) => {
    setDraft(prev => prev ? { ...prev, skills: prev.skills.map(s => s.id === skillId ? { ...s, category } : s) } : prev);
  };
  const deleteSkill = (skillId: string) => {
    setDraft(prev => prev ? { ...prev, skills: prev.skills.filter(s => s.id !== skillId) } : prev);
  };
  const addSkillItem = (skillId: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, skills: prev.skills.map(s => s.id === skillId ? { ...s, items: [...s.items, ''] } : s) };
    });
  };
  const updateSkillItem = (skillId: string, itemIndex: number, value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { 
        ...prev, 
        skills: prev.skills.map(s => 
          s.id === skillId 
            ? { ...s, items: s.items.map((item, idx) => idx === itemIndex ? value : item) } 
            : s
        ) 
      };
    });
  };
  const deleteSkillItem = (skillId: string, itemIndex: number) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { 
        ...prev, 
        skills: prev.skills.map(s => 
          s.id === skillId 
            ? { ...s, items: s.items.filter((_, idx) => idx !== itemIndex) } 
            : s
        ) 
      };
    });
  };

  // ── Education helpers ─────────────────────────────────────────────────────
  const addEducation = () => {
    const newEdu: EducationEntry = { id: uid(), degree: '', institution: '', year: '', note: '' };
    setDraft(prev => prev ? { ...prev, education: [...prev.education, newEdu] } : prev);
    setExpandedEdu(newEdu.id);
  };
  const deleteEducation = (eduId: string) => {
    setDraft(prev => prev ? { ...prev, education: prev.education.filter(e => e.id !== eduId) } : prev);
  };
  const updateEdu = (eduId: string, field: keyof EducationEntry, value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, education: prev.education.map(e => e.id === eduId ? { ...e, [field]: value } : e) };
    });
  };

  // ── Certifications helpers ──────────────────────────────────────────────────
  const addCertification = () => {
    const newCert: CertificationEntry = { id: uid(), name: '', issuer: '', year: '' };
    setDraft(prev => prev ? { ...prev, certifications: [...prev.certifications, newCert] } : prev);
    setExpandedCert(newCert.id);
  };
  const deleteCertification = (certId: string) => {
    setDraft(prev => prev ? { ...prev, certifications: prev.certifications.filter(c => c.id !== certId) } : prev);
  };
  const updateCertification = (certId: string, field: keyof CertificationEntry, value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, certifications: prev.certifications.map(c => c.id === certId ? { ...c, [field]: value } : c) };
    });
  };

  // ── Awards helpers ──────────────────────────────────────────────────────────
  const addAward = () => {
    const newAward: AwardEntry = { id: uid(), name: '', issuer: '', year: '' };
    setDraft(prev => prev ? { ...prev, awards: [...prev.awards, newAward] } : prev);
    setExpandedAward(newAward.id);
  };
  const deleteAward = (awardId: string) => {
    setDraft(prev => prev ? { ...prev, awards: prev.awards.filter(a => a.id !== awardId) } : prev);
  };
  const updateAward = (awardId: string, field: keyof AwardEntry, value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      return { ...prev, awards: prev.awards.map(a => a.id === awardId ? { ...a, [field]: value } : a) };
    });
  };

  // ── Render: No draft yet → Form State ───────────────────────────────────
  if (!id && !draft) {
    return (
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderPageHeader()}
          
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>1. Target Job Description (Optional)</Text>
            <Text style={{ color: colors.textMuted, marginBottom: Spacing.md, fontSize: 14 }}>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              Paste the job description you're targeting. Our AI will analyze the requirements and automatically tailor your resume.
            </Text>
            <View style={[styles.inputContainer, { marginBottom: Spacing.md }]}>
              <Text style={{ color: colors.textPrimary, marginBottom: 8, fontSize: 14, fontWeight: '500' }}>Job URL (Optional)</Text>
              <TextInput
                style={[styles.input, urlError ? { borderColor: colors.error } : null]}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, padding: 8, backgroundColor: `${colors.error}1A`, borderRadius: 4 }}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
                  <Text style={{ marginLeft: 4, color: colors.error, fontSize: 12 }}>{urlError}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.inputContainer}>
              <Text style={{ color: colors.textPrimary, marginBottom: 8, fontSize: 14, fontWeight: '500' }}>Job Description (Optional if URL provided)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={jobDescription}
                onChangeText={setJobDescription}
                placeholder="Or paste the full job description here..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
              />
              <View style={styles.inputActions}>
                {/* Attach JD File Button */}
                <TouchableOpacity style={styles.attachBtn} onPress={handleAttachJdFile} disabled={extractJdLoading}>
                  {extractJdLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="attach" size={24} color={colors.textMuted} />
                    </>
                  )}
                </TouchableOpacity>

                {/* Attached File Info Badge */}
                {jdFileName && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginLeft: Spacing.sm,
                    backgroundColor: `${colors.primary}1A`, // 10% opacity primary color
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    maxWidth: '75%', // Ensure it doesn't push out of bounds
                  }}>
                    <Text 
                      style={{ color: colors.primary, fontSize: 12, fontWeight: '500', marginRight: 4, flexShrink: 1 }}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {jdFileName}
                    </Text>
                    <TouchableOpacity onPress={handleRemoveAttachedJd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>2. Choose a Template</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md }}>
              {TEMPLATES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    { width: '47%', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
                    selectedTemplateId === t.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ]}
                  onPress={() => setSelectedTemplateId(t.id)}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 16 }}>{t.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{t.description}</Text>
                  {t.isPremium && (
                    <View style={{ backgroundColor: '#FFD70030', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 8 }}>
                      <Text style={{ color: '#B8860B', fontSize: 10, fontWeight: 'bold' }}>PRO</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryBtn, { marginVertical: Spacing.xl, height: 54 }]} 
            onPress={handleGenerate}
            disabled={createResumeMutation.isPending || analyzeJobMutation.isPending}
          >
            {createResumeMutation.isPending || analyzeJobMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="star-four-points" size={20} color="#fff" />
                <Text style={[styles.primaryBtnText, { fontSize: 16, marginLeft: 8 }]}>
                  {jobDescription.trim().length > 10 || jobUrl.trim().length > 5 ? 'Generate Tailored Resume' : 'Generate Resume'}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.flex, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textMuted }}>Loading resume...</Text>
      </View>
    );
  }

  // ── Render: Editor ────────────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {renderPageHeader()}

        {/* Personal Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Personal Info</Text>
            </View>
          </View>
          <View style={styles.fieldGrid}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput style={styles.input} value={draft?.header.name} onChangeText={v => setDraft(p => p ? { ...p, header: { ...p.header, name: v } } : p)} placeholder="Jane Smith" placeholderTextColor={colors.textMuted} editable={isEditMode} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Job Title</Text>
              <TextInput style={styles.input} value={draft?.header.title} onChangeText={v => setDraft(p => p ? { ...p, header: { ...p.header, title: v } } : p)} placeholder="Product Manager" placeholderTextColor={colors.textMuted} editable={isEditMode} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Subtitle (optional)</Text>
              <TextInput style={styles.input} value={draft?.header.subtitle} onChangeText={v => setDraft(p => p ? { ...p, header: { ...p.header, subtitle: v } } : p)} placeholder="e.g. B2B SaaS Expert" placeholderTextColor={colors.textMuted} editable={isEditMode} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={draft?.header.email} onChangeText={v => setDraft(p => p ? { ...p, header: { ...p.header, email: v } } : p)} placeholder="jane@email.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" editable={isEditMode} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput style={styles.input} value={draft?.header.phone} onChangeText={v => setDraft(p => p ? { ...p, header: { ...p.header, phone: v } } : p)} placeholder="+1 555 000 0000" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" editable={isEditMode} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>LinkedIn URL</Text>
              <TextInput style={styles.input} value={draft?.header.linkedin} onChangeText={v => setDraft(p => p ? { ...p, header: { ...p.header, linkedin: v } } : p)} placeholder="linkedin.com/in/jane" placeholderTextColor={colors.textMuted} autoCapitalize="none" editable={isEditMode} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Portfolio URL (optional)</Text>
              <TextInput style={styles.input} value={draft?.header.portfolio} onChangeText={v => setDraft(p => p ? { ...p, header: { ...p.header, portfolio: v } } : p)} placeholder="janedoe.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" editable={isEditMode} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>City / Location</Text>
              <TextInput style={styles.input} value={draft?.header.location} onChangeText={v => setDraft(p => p ? { ...p, header: { ...p.header, location: v } } : p)} placeholder="San Francisco, CA" placeholderTextColor={colors.textMuted} editable={isEditMode} />
            </View>
          </View>
        </View>

        {/* Summary */}
        {draft?.sections_to_include?.summary !== false && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Summary</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isEditMode && (
                <TouchableOpacity style={styles.aiBtn} onPress={handleAIRewrite} disabled={rewriteMutation.isPending}>
                  {rewriteMutation.isPending
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <><MaterialCommunityIcons name="star-four-points-outline" size={18} color={colors.primary} /><Text style={styles.aiBtnText}>AI Rewrite</Text></>
                  }
                </TouchableOpacity>
              )}
              {isEditMode && (
                <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, summary: false } } as any : p)}>
                  <Ionicons name="eye-off-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <TextInput
            style={[styles.textArea, !isEditMode && styles.textAreaReadonly]}
            value={draft?.summary}
            onChangeText={v => setDraft(p => p ? { ...p, summary: v } : p)}
            placeholder="Write a compelling professional summary..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            editable={isEditMode}
          />
        </View>

        )}
        {/* Experience */}
        {draft?.sections_to_include?.experience !== false && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Experience</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isEditMode && (
                <TouchableOpacity style={styles.addBtn} onPress={addExperience}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              )}
              {isEditMode && (
                <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, experience: false } } as any : p)}>
                  <Ionicons name="eye-off-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(draft?.experience || []).length === 0 && (
            <Text style={styles.emptyHint}>No experience added yet. Tap &quot;Add&quot; to get started.</Text>
          )}

          {(draft?.experience || []).map((exp, index) => (
            <View key={exp.id} style={[styles.entryCard, index > 0 && styles.entryCardBorder]}>
              <TouchableOpacity style={styles.entryHeader} onPress={() => setExpandedExp(expandedExp === exp.id ? null : exp.id)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle} numberOfLines={1}>{exp.title || 'New Position'}</Text>
                  <Text style={styles.entrySub} numberOfLines={1}>{exp.company}{exp.date_range ? ' · ' + exp.date_range : ''}</Text>
                </View>
                <View style={styles.entryActions}>
                  {isEditMode && (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => deleteExperience(exp.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              {expandedExp === exp.id && (
                <View style={styles.entryForm}>
                  <View style={styles.fieldGrid}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Job Title</Text>
                      <TextInput style={styles.input} value={exp.title} onChangeText={v => updateExp(exp.id, 'title', v)} placeholder="Software Engineer" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Company</Text>
                      <TextInput style={styles.input} value={exp.company} onChangeText={v => updateExp(exp.id, 'company', v)} placeholder="Acme Inc." placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Date Range</Text>
                      <TextInput style={styles.input} value={exp.date_range} onChangeText={v => updateExp(exp.id, 'date_range', v)} placeholder="Jan 2022 – Present" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Location (optional)</Text>
                      <TextInput style={styles.input} value={exp.location} onChangeText={v => updateExp(exp.id, 'location', v)} placeholder="Remote" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: 8 }}>
                    <Text style={[styles.fieldLabel, { marginTop: 0 }]}>Bullet Points</Text>
                    {isEditMode && (
                      <TouchableOpacity 
                        style={styles.inlineAddBtn} 
                        onPress={() => handleRewriteItem('experience', exp.bullets.join('\n'), (rewritten) => {
                          const newBullets = rewritten.split('\n').map(s => s.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
                          setDraft(p => p ? { ...p, experience: p.experience.map(e => e.id === exp.id ? { ...e, bullets: newBullets } : e) } : p);
                        })}
                        disabled={rewriteMutation.isPending}
                      >
                        <MaterialCommunityIcons name="star-four-points-outline" size={14} color={colors.primary} />
                        <Text style={[styles.inlineAddBtnText, { marginLeft: 4 }]}>AI Rewrite Role</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {exp.bullets.map((bullet, bi) => (
                    <View key={bi} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        value={bullet}
                        onChangeText={v => updateBullet(exp.id, bi, v)}
                        placeholder="Describe an achievement..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        editable={isEditMode}
                      />
                      {isEditMode && exp.bullets.length > 1 && (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => deleteBullet(exp.id, bi)}>
                          <Ionicons name="close" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {isEditMode && (
                    <TouchableOpacity style={styles.inlineAddBtn} onPress={() => addBullet(exp.id)}>
                      <Ionicons name="add" size={16} color={colors.primary} />
                      <Text style={styles.inlineAddBtnText}>Add bullet point</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        )}
        {/* Skills */}
        {draft?.sections_to_include?.skills !== false && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons name="star-four-points-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Skills</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isEditMode && (
                <TouchableOpacity style={styles.addBtn} onPress={addSkill}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              )}
              {isEditMode && (
                <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, skills: false } } as any : p)}>
                  <Ionicons name="eye-off-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(draft?.skills || []).length === 0 && (
            <Text style={styles.emptyHint}>No skills added yet. Tap &quot;Add&quot; to get started.</Text>
          )}

          {(draft?.skills || []).map((skill, index) => {
            const displayName = skill.category?.trim() || 'New Skill Category';
            const itemCount = skill.items.length;
            const displaySub = itemCount > 0 ? `${itemCount} skill${itemCount !== 1 ? 's' : ''}` : 'Tap to add skills';
            return (
              <View key={skill.id} style={[styles.entryCard, index > 0 && styles.entryCardBorder]}>
                <TouchableOpacity 
                  style={styles.entryHeader} 
                  onPress={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)} 
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.entrySub} numberOfLines={1}>{displaySub}</Text>
                  </View>
                  <View style={styles.entryActions}>
                    {isEditMode && (
                      <TouchableOpacity 
                        style={styles.iconBtn} 
                        onPress={(e) => {
                          e.stopPropagation();
                          deleteSkill(skill.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {expandedSkill === skill.id && (
                  <View style={styles.entryForm}>
                    <View style={styles.fieldGrid}>
                      <View style={styles.fieldFull}>
                        <Text style={styles.fieldLabel}>Category Name</Text>
                        <TextInput 
                          style={styles.input} 
                          value={skill.category} 
                          onChangeText={v => updateSkill(skill.id, v)} 
                          placeholder="e.g., Programming Languages, Frameworks, Tools" 
                          placeholderTextColor={colors.textMuted} 
                          editable={isEditMode} 
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: 8 }}>
                      <Text style={[styles.fieldLabel, { marginTop: 0 }]}>Skills</Text>
                      {isEditMode && (
                        <TouchableOpacity 
                          style={styles.inlineAddBtn} 
                          onPress={() => handleRewriteItem('skills', skill.items.join(', '), (rewritten) => {
                            const newItems = rewritten.split(',').map(s => s.trim()).filter(Boolean);
                            setDraft(p => p ? { ...p, skills: p.skills.map(s => s.id === skill.id ? { ...s, items: newItems } : s) } : p);
                          })}
                          disabled={rewriteMutation.isPending}
                        >
                          <MaterialCommunityIcons name="star-four-points-outline" size={14} color={colors.primary} />
                          <Text style={[styles.inlineAddBtnText, { marginLeft: 4 }]}>AI Optimize List</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.skillChipsContainer}>
                      {skill.items.map((item, itemIndex) => (
                        <View key={itemIndex} style={styles.skillChip}>
                          <TextInput
                            style={styles.skillChipInput}
                            value={item}
                            onChangeText={v => updateSkillItem(skill.id, itemIndex, v)}
                            placeholder="Skill name"
                            placeholderTextColor={colors.textMuted}
                            editable={isEditMode}
                          />
                          {isEditMode && skill.items.length > 1 && (
                            <TouchableOpacity 
                              style={styles.skillChipDelete} 
                              onPress={() => deleteSkillItem(skill.id, itemIndex)}
                            >
                              <Ionicons name="close" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                    
                    {isEditMode && (
                      <TouchableOpacity 
                        style={styles.inlineAddBtn} 
                        onPress={() => addSkillItem(skill.id)}
                      >
                        <Ionicons name="add" size={16} color={colors.primary} />
                        <Text style={styles.inlineAddBtnText}>Add skill</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        )}
        {/* Education */}
        {draft?.sections_to_include?.education !== false && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons name="star-four-points-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Education</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isEditMode && (
                <TouchableOpacity style={styles.addBtn} onPress={addEducation}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              )}
              {isEditMode && (
                <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, education: false } } as any : p)}>
                  <Ionicons name="eye-off-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(draft?.education || []).length === 0 && (
            <Text style={styles.emptyHint}>No education added yet. Tap &quot;Add&quot; to get started.</Text>
          )}

          {(draft?.education || []).map((edu, index) => (
            <View key={edu.id} style={[styles.entryCard, index > 0 && styles.entryCardBorder]}>
              <TouchableOpacity style={styles.entryHeader} onPress={() => setExpandedEdu(expandedEdu === edu.id ? null : edu.id)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle} numberOfLines={1}>{edu.degree || 'New Degree'}</Text>
                  <Text style={styles.entrySub} numberOfLines={1}>{edu.institution}{edu.year ? ' · ' + edu.year : ''}</Text>
                </View>
                <View style={styles.entryActions}>
                  {isEditMode && (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => deleteEducation(edu.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              {expandedEdu === edu.id && (
                <View style={styles.entryForm}>
                  <View style={styles.fieldGrid}>
                    <View style={styles.fieldFull}>
                      <Text style={styles.fieldLabel}>Degree / Qualification</Text>
                      <TextInput style={styles.input} value={edu.degree} onChangeText={v => updateEdu(edu.id, 'degree', v)} placeholder="BSc Computer Science" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>School / University</Text>
                      <TextInput style={styles.input} value={edu.institution} onChangeText={v => updateEdu(edu.id, 'institution', v)} placeholder="MIT" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Date Range</Text>
                      <TextInput style={styles.input} value={edu.year} onChangeText={v => updateEdu(edu.id, 'year', v)} placeholder="2018 – 2022" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.fieldLabel}>Note (optional)</Text>
                        {isEditMode && edu.note && (
                          <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center' }} 
                            onPress={() => handleRewriteItem('education', edu.note || '', (rewritten) => updateEdu(edu.id, 'note', rewritten))}
                            disabled={rewriteMutation.isPending}
                          >
                            <MaterialCommunityIcons name="star-four-points-outline" size={12} color={colors.primary} />
                            <Text style={[styles.inlineAddBtnText, { fontSize: 12, marginLeft: 2 }]}>Rewrite</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <TextInput style={styles.input} value={edu.note} onChangeText={v => updateEdu(edu.id, 'note', v)} placeholder="Summa Cum Laude" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        )}
        {/* Featured Project */}
        {draft?.sections_to_include?.featured_project !== false && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Featured Project</Text>
            </View>
            {isEditMode && (
              <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, featured_project: false } } as any : p)}>
                <Ionicons name="eye-off-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.fieldGrid}>
            <View style={styles.fieldFull}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: draft?.featuredProject?.include ? colors.primary : 'transparent' }}
                  onPress={() => setDraft(p => p && p.featuredProject ? { ...p, featuredProject: { ...p.featuredProject, include: !p.featuredProject.include } } : p)}
                >
                  {draft?.featuredProject?.include && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
                <Text style={styles.fieldLabel}>Include Featured Project</Text>
              </View>
            </View>
            {draft?.featuredProject?.include && (
              <>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Project Name</Text>
                  <TextInput style={styles.input} value={draft?.featuredProject?.name} onChangeText={v => setDraft(p => p && p.featuredProject ? { ...p, featuredProject: { ...p.featuredProject, name: v } } : p)} placeholder="AI Resume Builder" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Tech Stack</Text>
                  <TextInput style={styles.input} value={draft?.featuredProject?.tech_stack} onChangeText={v => setDraft(p => p && p.featuredProject ? { ...p, featuredProject: { ...p.featuredProject, tech_stack: v } } : p)} placeholder="React Native, Node.js" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                </View>
                <View style={styles.fieldFull}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Description (Bullets)</Text>
                    {isEditMode && draft?.featuredProject?.bullet && (
                      <TouchableOpacity 
                        style={styles.inlineAddBtn} 
                        onPress={() => handleRewriteItem('projects', draft.featuredProject?.bullet || '', (rewritten) => setDraft(p => p && p.featuredProject ? { ...p, featuredProject: { ...p.featuredProject, bullet: rewritten } } : p))}
                        disabled={rewriteMutation.isPending}
                      >
                        <MaterialCommunityIcons name="star-four-points-outline" size={14} color={colors.primary} />
                        <Text style={[styles.inlineAddBtnText, { marginLeft: 4 }]}>AI Rewrite</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput style={[styles.input, styles.textArea]} value={draft?.featuredProject?.bullet} onChangeText={v => setDraft(p => p && p.featuredProject ? { ...p, featuredProject: { ...p.featuredProject, bullet: v } } : p)} placeholder="• Built a full-stack AI app..." placeholderTextColor={colors.textMuted} editable={isEditMode} multiline />
                </View>
              </>
            )}
          </View>
        </View>

        )}
        {/* Certifications */}
        {draft?.sections_to_include?.certifications !== false && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Certifications</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isEditMode && (
                <TouchableOpacity style={styles.addBtn} onPress={addCertification}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              )}
              {isEditMode && (
                <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, certifications: false } } as any : p)}>
                  <Ionicons name="eye-off-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(draft?.certifications || []).length === 0 && (
            <Text style={styles.emptyHint}>No certifications added yet. Tap &quot;Add&quot; to get started.</Text>
          )}

          {(draft?.certifications || []).reduce((acc: any[], cert) => {
            if (!(cert.id === expandedCert || cert.name?.trim() || cert.issuer?.trim() || cert.year?.trim())) return acc;
            const index = acc.length;
            const displayName = cert.name?.trim() || 'New Certification';
            const displaySub = [cert.issuer || '', cert.year || ''].filter(Boolean).join(' · ') || 'Tap to add details';
            acc.push(
              <View key={cert.id} style={[styles.entryCard, index > 0 && styles.entryCardBorder]}>
                <TouchableOpacity 
                  style={styles.entryHeader} 
                  onPress={() => setExpandedCert(expandedCert === cert.id ? null : cert.id)} 
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.entrySub} numberOfLines={1}>{displaySub}</Text>
                  </View>
                  <View style={styles.entryActions}>
                    {isEditMode && (
                      <TouchableOpacity 
                        style={styles.iconBtn} 
                        onPress={(e) => {
                          e.stopPropagation();
                          deleteCertification(cert.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

              {expandedCert === cert.id && (
                <View style={styles.entryForm}>
                  <View style={styles.fieldGrid}>
                    <View style={styles.fieldFull}>
                      <Text style={styles.fieldLabel}>Certification Name</Text>
                      <TextInput style={styles.input} value={cert.name} onChangeText={v => updateCertification(cert.id, 'name', v)} placeholder="AWS Certified Solutions Architect" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Issuer</Text>
                      <TextInput style={styles.input} value={cert.issuer} onChangeText={v => updateCertification(cert.id, 'issuer', v)} placeholder="Amazon Web Services" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Year</Text>
                      <TextInput style={styles.input} value={cert.year} onChangeText={v => updateCertification(cert.id, 'year', v)} placeholder="2023" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                  </View>
                </View>
              )}
            </View>
            );
            return acc;
          }, [])}
        </View>
        )}
        {/* Awards */}
        {draft?.sections_to_include?.recognition !== false && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons name="star-four-points-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Awards & Recognition</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isEditMode && (
                <TouchableOpacity style={styles.addBtn} onPress={addAward}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              )}
              {isEditMode && (
                <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, recognition: false } } as any : p)}>
                  <Ionicons name="eye-off-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {(draft?.awards || []).length === 0 && (
            <Text style={styles.emptyHint}>No awards added yet. Tap &quot;Add&quot; to get started.</Text>
          )}

          {(draft?.awards || []).reduce((acc: any[], award) => {
            if (!(award.id === expandedAward || award.name?.trim() || award.issuer?.trim() || award.year?.trim())) return acc;
            const index = acc.length;
            const displayName = award.name?.trim() || 'New Award';
            const displaySub = [award.issuer || '', award.year || ''].filter(Boolean).join(' · ') || 'Tap to add details';
            acc.push(
              <View key={award.id} style={[styles.entryCard, index > 0 && styles.entryCardBorder]}>
                <TouchableOpacity 
                  style={styles.entryHeader} 
                  onPress={() => setExpandedAward(expandedAward === award.id ? null : award.id)} 
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.entrySub} numberOfLines={1}>{displaySub}</Text>
                  </View>
                  <View style={styles.entryActions}>
                    {isEditMode && (
                      <TouchableOpacity 
                        style={styles.iconBtn} 
                        onPress={(e) => {
                          e.stopPropagation();
                          deleteAward(award.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>

              {expandedAward === award.id && (
                <View style={styles.entryForm}>
                  <View style={styles.fieldGrid}>
                    <View style={styles.fieldFull}>
                      <Text style={styles.fieldLabel}>Award Name</Text>
                      <TextInput style={styles.input} value={award.name} onChangeText={v => updateAward(award.id, 'name', v)} placeholder="Employee of the Year" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Organization</Text>
                      <TextInput style={styles.input} value={award.issuer} onChangeText={v => updateAward(award.id, 'issuer', v)} placeholder="Acme Corp" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>Year</Text>
                      <TextInput style={styles.input} value={award.year} onChangeText={v => updateAward(award.id, 'year', v)} placeholder="2022" placeholderTextColor={colors.textMuted} editable={isEditMode} />
                    </View>
                  </View>
                </View>
              )}
              </View>
            );
            return acc;
          }, [])}
        </View>
        )}

        {/* Add Sections Area */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 20 }}>
          {draft?.sections_to_include?.summary === false && (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, summary: true } } as any : p)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { fontSize: 13 }]}>Summary</Text>
            </TouchableOpacity>
          )}
          {draft?.sections_to_include?.experience === false && (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, experience: true } } as any : p)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { fontSize: 13 }]}>Experience</Text>
            </TouchableOpacity>
          )}
          {draft?.sections_to_include?.skills === false && (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, skills: true } } as any : p)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { fontSize: 13 }]}>Skills</Text>
            </TouchableOpacity>
          )}
          {draft?.sections_to_include?.education === false && (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, education: true } } as any : p)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { fontSize: 13 }]}>Education</Text>
            </TouchableOpacity>
          )}
          {draft?.sections_to_include?.featured_project === false && (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, featured_project: true } } as any : p)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { fontSize: 13 }]}>Project</Text>
            </TouchableOpacity>
          )}
          {draft?.sections_to_include?.certifications === false && (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, certifications: true } } as any : p)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { fontSize: 13 }]}>Certifications</Text>
            </TouchableOpacity>
          )}
          {draft?.sections_to_include?.recognition === false && (
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setDraft(p => p ? { ...p, sections_to_include: { ...p.sections_to_include, recognition: true } } as any : p)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { fontSize: 13 }]}>Awards</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1, minWidth: '45%' }]} onPress={() => { if (!id) setDraft(null); else router.back(); }}>
            <Text style={styles.outlineBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1, minWidth: '45%' }]} onPress={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.primaryBtnText}>Save</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, { flex: 1, minWidth: '45%' }]} onPress={handlePreview}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={styles.exportBtnText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.exportBtn, { flex: 1, minWidth: '45%' }]} 
            onPress={() => setIsExportModalVisible(true)}
            disabled={!draft || updateMutation.isPending}
          >
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.exportBtnText}>Download</Text>
          </TouchableOpacity>
          {id && fromList === 'true' && (
            <TouchableOpacity 
              style={[styles.exportBtn, { flex: 1, minWidth: '100%', borderColor: colors.error }]} 
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={[styles.exportBtnText, { color: colors.error }]}>Delete Resume</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        </ScrollView>

        <View style={{ height: bottomNavPadding }} />

      {renderTemplateModal()}
      {renderExportModal()}
    </View>
  );

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderPageHeader() {
    return (
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderTop}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.pageTitle}>Resume Builder</Text>
            <Text style={styles.pageSubtitle}>Craft your professional story with AI precision.</Text>
          </View>

        </View>
        {draft && (
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity style={[styles.modeToggleBtn, isEditMode && styles.modeToggleBtnActive]} onPress={() => setIsEditMode(true)}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={[styles.modeToggleText, isEditMode && styles.modeToggleTextActive]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeToggleBtn, !isEditMode && styles.modeToggleBtnActive]} onPress={() => setIsEditMode(false)}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text style={[styles.modeToggleText, !isEditMode && styles.modeToggleTextActive]}>Preview</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function renderTemplateModal() {
    return (
      <Modal visible={isTemplateModalVisible} animationType="slide" transparent onRequestClose={() => setIsTemplateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a Template</Text>
              <TouchableOpacity onPress={() => setIsTemplateModalVisible(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Select an ATS-optimized layout for your resume.</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.templateGrid}>
              {TEMPLATES.map(tmpl => (
                <TouchableOpacity
                  key={tmpl.id}
                  style={[styles.templateCard, selectedTemplateId === tmpl.id && styles.templateCardSelected]}
                  onPress={() => setSelectedTemplateId(tmpl.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.templateImageContainer, selectedTemplateId === tmpl.id && styles.templateImageContainerSelected]}>
                    <Image source={tmpl.image} style={styles.templateImage} />
                    {selectedTemplateId === tmpl.id && (
                      <View style={styles.templateSelectedBadge}><Ionicons name="checkmark" size={16} color="#fff" /></View>
                    )}
                    {tmpl.isPremium && (
                      <View style={styles.premiumBadge}>
                        <MaterialCommunityIcons name="star-four-points-outline" size={18} color={colors.primary} />
                        <Text style={styles.premiumBadgeText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.templateInfo}>
                    <Text style={[styles.templateName, selectedTemplateId === tmpl.id && styles.templateNameSelected]}>
                      {tmpl.name}
                    </Text>
                    <Text style={styles.templateDescription}>{tmpl.description}</Text>
                    
                    <View style={styles.atsScoreBadge}>
                      <Ionicons name="shield-checkmark-outline" size={16} color={tmpl.atsScore >= 90 ? colors.success : colors.warning} />
                      <Text style={[styles.atsScoreText, { color: tmpl.atsScore >= 90 ? colors.success : colors.warning }]}>
                        ATS {tmpl.atsScore}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              {/* Import from existing resume file */}
              <TouchableOpacity
                style={[styles.outlineBtn, { flex: 1 }, (!selectedTemplateId || isImportingResume) && styles.btnDisabled]}
                disabled={!selectedTemplateId || isImportingResume}
                onPress={handleImportResumeFile}
              >
                {isImportingResume
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                }
                <Text style={styles.outlineBtnText}>
                  {isImportingResume ? 'Reading file...' : 'Import from Resume File'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, !selectedTemplateId && styles.btnDisabled]}
                disabled={!selectedTemplateId}
                onPress={() => { setDraft(blankResume(selectedTemplateId)); setIsTemplateModalVisible(false); }}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={styles.primaryBtnText}>Start Blank Canvas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.outlineBtn, { flex: 1 }, !selectedTemplateId && styles.btnDisabled]}
                disabled={!selectedTemplateId}
                onPress={async () => {
                  // If we already have AI-generated content, reuse it with the new template
                  if (aiGeneratedContent) {
                    setDraft({
                      templateId: selectedTemplateId || 'modern',
                      header: aiGeneratedContent.header || { name: '', title: '', subtitle: '', email: '', phone: '', linkedin: '', portfolio: '', location: '' },
                      summary: aiGeneratedContent.summary?.text || '',
                      experience: (aiGeneratedContent.experience || []).map((e: any) => ({ ...e, id: e.id || uid() })),
                      skills: (aiGeneratedContent.skills || []).map((s: any) => ({ ...s, id: s.id || uid() })),
                      education: (aiGeneratedContent.education || []).map((e: any) => ({ ...e, id: e.id || uid() })),
                      certifications: aiGeneratedContent.certifications || [],
                      awards: aiGeneratedContent.recognition || [],
                      featuredProject: aiGeneratedContent.featured_project || { include: false, name: '', tech_stack: '', bullet: '' }
                    });
                    setIsTemplateModalVisible(false);
                    Toast.show({ type: 'success', text1: 'Template applied!', text2: 'Using your AI-generated content' });
                    return;
                  }

                  // Generate new content
                  try {
                    Toast.show({ type: 'info', text1: 'AI is drafting your resume...', text2: 'This may take up to 15 seconds.' });
                    const res = await createResumeMutation.mutateAsync({
                      title: 'AI Tailored Resume'
                    });
                    
                    setIsTemplateModalVisible(false);

                    // Subscribe to the realtime channel
                    const channel = supabase.channel(res.stream_channel);
                    generationChannelRef.current = channel;
                    channel
                      .on('broadcast', { event: 'generation_complete' }, (payload) => {
                        const content = payload.payload.content;
                        
                        // Cache the AI-generated content
                        setAiGeneratedContent(content);
                        
                        setDraft({
                          templateId: selectedTemplateId || 'modern',
                          header: content.header || { name: '', title: '', subtitle: '', email: '', phone: '', linkedin: '', portfolio: '', location: '' },
                          summary: content.summary?.text || '',
                          experience: (content.experience || []).map((e: any) => ({ ...e, id: e.id || uid() })),
                          skills: (content.skills || []).map((s: any) => ({ ...s, id: s.id || uid() })),
                          education: (content.education || []).map((e: any) => ({ ...e, id: e.id || uid() })),
                          certifications: content.certifications || [],
                          awards: content.recognition || [],
                          featuredProject: content.featured_project || { include: false, name: '', tech_stack: '', bullet: '' }
                        });
                        Toast.show({ type: 'success', text1: 'Resume generated!' });
                        supabase.removeChannel(channel);
                      })
                      .on('broadcast', { event: 'generation_failed' }, (payload) => {
                        Toast.show({ type: 'error', text1: 'AI Generation Failed', text2: payload.payload.error });
                        supabase.removeChannel(channel);
                      });
                    channel.subscribe();
                  } catch (e: any) {
                    Toast.show({ type: 'error', text1: 'Request Failed', text2: e.message });
                  }
                }}
              >
                <MaterialCommunityIcons name="star-four-points-outline" size={18} color={colors.primary} />
                <Text style={styles.outlineBtnText}>Auto-Generate with AI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderExportModal() {
    return (
      <Modal visible={isExportModalVisible} animationType="slide" transparent onRequestClose={() => setIsExportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download Resume</Text>
              <TouchableOpacity onPress={() => setIsExportModalVisible(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Choose your preferred format</Text>

            <View style={styles.exportOptions}>
              {/* PDF Option */}
              <TouchableOpacity
                style={styles.exportOptionCard}
                onPress={() => handleExport('pdf')}
                disabled={isExporting}
              >
                <View style={styles.exportOptionIcon}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.exportOptionTitle}>PDF</Text>
                <Text style={styles.exportOptionDesc}>
                  Universal format, best for email & online applications
                </Text>
                {isExporting && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
              </TouchableOpacity>

              {/* DOCX Option */}
              <TouchableOpacity
                style={styles.exportOptionCard}
                onPress={() => handleExport('docx')}
                disabled={isExporting}
              >
                <View style={styles.exportOptionIcon}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.exportOptionTitle}>DOCX</Text>
                <Text style={styles.exportOptionDesc}>
                  Editable format, best for ATS systems & recruiters
                </Text>
                {isExporting && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
              </TouchableOpacity>
            </View>

            <Text style={styles.exportNote}>
              Your resume will be formatted using the <Text style={{ fontWeight: '700' }}>{TEMPLATES.find(t => t.id === draft?.templateId)?.name || 'default'}</Text> template.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: any) => StyleSheet.create({

  flex: { flex: 1, backgroundColor: colors.bgSecondary },
  container: {
    padding: Spacing.lg,
    paddingBottom: 160,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },

  // Page Header
  pageHeader: { marginBottom: Spacing.xl },
  pageHeaderTop: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md,
  },
  pageTitle: { ...Typography.displayMd, color: colors.textPrimary, marginBottom: 4 },
  pageSubtitle: { ...Typography.bodyMd, color: colors.textMuted },

  templatesBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: 8, borderRadius: Radius.lg, gap: 6, ...Shadow.sm,
  },
  templatesBtnText: { ...Typography.bodySm, color: colors.textPrimary, fontWeight: '600' },

  modeToggleContainer: {
    flexDirection: 'row', backgroundColor: colors.bgSecondary, borderWidth: 1,
    borderColor: colors.border, padding: 4, borderRadius: Radius.xl,
    alignSelf: Platform.OS === 'web' ? 'flex-start' : 'center',
  },
  modeToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: Radius.lg, gap: 6 },
  modeToggleBtnActive: { backgroundColor: colors.bgPrimary, ...Shadow.sm },
  modeToggleText: { ...Typography.bodySm, color: colors.textMuted, fontWeight: '500' },
  modeToggleTextActive: { color: colors.primary, fontWeight: '700' },

  // Section Cards
  sectionCard: {
    backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border,
    borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { ...Typography.headingMd, color: colors.textPrimary },

  // Fields
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fieldHalf: { width: Platform.OS === 'web' ? '48%' : '100%' },
  fieldFull: { width: '100%' },
  fieldLabel: { ...Typography.label, color: colors.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyMd, color: colors.textPrimary, marginBottom: Spacing.sm,
  },
  textArea: {
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    ...Typography.bodyMd, color: colors.textPrimary, minHeight: 100, textAlignVertical: 'top',
  },
  textAreaReadonly: { backgroundColor: 'transparent', borderColor: 'transparent' },

  // Entry cards (experience, education)
  entryCard: { paddingTop: Spacing.sm },
  entryCardBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: Spacing.sm },
  entryHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  entryTitle: { ...Typography.headingMd, color: colors.textPrimary },
  entrySub: { ...Typography.bodySm, color: colors.textMuted, marginTop: 2 },
  entryActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  entryForm: { paddingTop: Spacing.sm, paddingBottom: Spacing.sm },

  // Bullets
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: Spacing.xs },
  bulletDot: { ...Typography.bodyMd, color: colors.primary, marginTop: 10 },

  // Skills
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPillEditable: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(107,70,254,0.08)',
    borderWidth: 1, borderColor: 'rgba(107,70,254,0.25)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  skillInput: { ...Typography.bodySm, color: colors.primary, minWidth: 50, maxWidth: 120, fontWeight: '500' },
  skillChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107,70,254,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(107,70,254,0.25)',
    borderRadius: Radius.full,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 6,
  },
  skillChipInput: {
    ...Typography.bodySm,
    color: colors.primary,
    fontWeight: '500',
    minWidth: 60,
    maxWidth: 150,
    padding: 0,
  },
  skillChipDelete: {
    padding: 2,
  },

  // AI & Add Buttons
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(107,70,254,0.08)',
    paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.md, gap: 4,
  },
  aiBtnText: { ...Typography.label, color: colors.primary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(107,70,254,0.08)',
    paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.md, gap: 4,
  },
  addBtnText: { ...Typography.label, color: colors.primary },
  inlineAddBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: 4,
    paddingVertical: 6, paddingHorizontal: 2,
  },
  inlineAddBtnText: { ...Typography.bodySm, color: colors.primary },
  iconBtn: { padding: 4 },
  emptyHint: { ...Typography.bodySm, color: colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },

  // Action Row
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, flexWrap: 'wrap' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full, gap: 8, ...Shadow.card,
  },
  primaryBtnText: { ...Typography.headingMd, color: '#fff' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.borderFocus, paddingVertical: 14,
    paddingHorizontal: Spacing.lg, borderRadius: Radius.full, gap: 8, backgroundColor: colors.bgPrimary,
  },
  outlineBtnText: { ...Typography.headingMd, color: colors.primary },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.border, paddingVertical: 14,
    paddingHorizontal: Spacing.lg, borderRadius: Radius.full, gap: 8, backgroundColor: colors.bgPrimary,
  },
  exportBtnText: { ...Typography.headingMd, color: colors.primary },
  btnDisabled: { opacity: 0.45 },

  // Empty State
  emptyStateContainer: {
    padding: Spacing.xxl, alignItems: 'center', backgroundColor: colors.bgPrimary,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.border, marginTop: Spacing.md, ...Shadow.sm,
  },
  emptyStateIconBg: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(107,70,254,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  emptyStateTitle: { ...Typography.displayMd, color: colors.textPrimary, marginBottom: Spacing.xs, textAlign: 'center' },
  emptyStateDesc: { ...Typography.bodyMd, color: colors.textMuted, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Spacing.xl, paddingBottom: 40, maxHeight: '92%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { ...Typography.headingLg, color: colors.textPrimary },
  modalSubtitle: { ...Typography.bodySm, color: colors.textMuted, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl, flexWrap: 'wrap' },

  // Template picker
  templateList: { gap: Spacing.md, paddingBottom: Spacing.sm },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  templateCard: { 
    width: '48%',
    alignItems: 'flex-start', 
    gap: Spacing.sm, 
    opacity: 0.65 
  },
  templateCardSelected: { opacity: 1 },
  templateImageContainer: {
    width: '100%', 
    aspectRatio: 0.707,
    borderRadius: Radius.md, 
    borderWidth: 2,
    borderColor: colors.border, 
    overflow: 'hidden', 
    backgroundColor: colors.bgSecondary, 
    ...Shadow.sm,
  },
  templateImageContainerSelected: { borderColor: colors.primary, borderWidth: 2.5 },
  templateImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  templateSelectedBadge: {
    position: 'absolute', top: 8, right: 8, backgroundColor: colors.primary,
    borderRadius: Radius.full, padding: 4, ...Shadow.sm,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 3,
  },
  premiumBadgeText: {
    ...Typography.bodySm,
    fontSize: 9,
    color: '#FFD700',
    fontWeight: '700',
  },
  templateInfo: {
    width: '100%',
    gap: 4,
  },
  templateName: { ...Typography.bodySm, color: colors.textMuted, fontWeight: '500' },
  templateNameSelected: { color: colors.primary, fontWeight: '700' },
  templateDescription: {
    ...Typography.bodySm,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 14,
  },
  atsScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  atsScoreText: {
    ...Typography.bodySm,
    fontSize: 10,
    fontWeight: '700',
  },

  // Export modal
  exportOptions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  exportOptionCard: {
    flex: 1, backgroundColor: colors.bgSecondary, borderRadius: Radius.xl, borderWidth: 1,
    borderColor: colors.border, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, ...Shadow.sm,
  },
  exportOptionIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(107,70,254,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  exportOptionTitle: { ...Typography.headingMd, color: colors.textPrimary },
  exportOptionDesc: { ...Typography.bodySm, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  exportNote: { ...Typography.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 18 },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  attachBtn: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
