import React, { useState } from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert, Modal, TouchableOpacity, Platform } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Card, Button, FileAttachmentBadge } from '../../src/components/ui';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCreateCoverLetterMutation, useCoverLetterQuery, useDeleteCoverLetterMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { handleApiError, getUserFriendlyErrorMessage } from '../../src/lib/errorHandler';
import { useNotificationStore } from '../../src/stores/notification-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { supabase } from '../../src/lib/supabase';
import { fetchFileArrayBuffer } from '../../src/lib/api';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useFilePicker } from '../../src/hooks/useFilePicker';
import { usePreviewStore } from '../../src/store/previewStore';
import { buildCoverLetterHTML } from '../../src/lib/coverLetterHTML';
import { exportCoverLetterPDF, exportCoverLetterDOCX } from '../../src/lib/coverLetterExport';
import { formatPersonName } from '../../src/lib/exportUtils';
import { CoverLetter } from '../../src/types/schemas';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '../../src/stores/ui-store';
import { useInterstitialAd } from '../../src/lib/useInterstitialAd';
import { useCreditGuard } from '../../src/lib/creditGuard';

const TONES = ['Professional', 'Enthusiastic', 'Concise', 'Storytelling', 'Formal'];

export default function CoverLetterGeneratorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { addNotification } = useNotificationStore();
  const { user } = useAuthStore();
  const { requireCredits } = useCreditGuard();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [coverLetterObj, setCoverLetterObj] = useState<CoverLetter | null>(null);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);


  const { id, fromList } = useLocalSearchParams();

  const coverLetterMutation = useCreateCoverLetterMutation();
  const deleteMutation = useDeleteCoverLetterMutation();
  const extractJd = useExtractJdMutation();
  const { data: pastCoverLetter } = useCoverLetterQuery(id as string);
  const hasResetRef = React.useRef(false);

  const { showAd: showInterstitialAd, loaded: interstitialLoaded } = useInterstitialAd();
  const { incrementInterstitialCount, resetInterstitialCount } = useUIStore();

  React.useEffect(() => {
    if (id) {
      hasResetRef.current = false;
    }
  }, [id]);

  React.useEffect(() => {
    if (pastCoverLetter && !hasResetRef.current) {
      // Parse title: format is "{company_name} - {job_title} Cover Letter"
      if (pastCoverLetter.title) {
        const titleParts = pastCoverLetter.title.split(' - ');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (titleParts[0]) setTargetCompany(titleParts[0]);
        if (titleParts[1]) setTargetRole(titleParts[1].replace(/\s*Cover Letter\s*$/i, ''));
      }

      // Match DB tone (e.g. "PROFESSIONAL") to TONES array values
      if (pastCoverLetter.tone) {
        const matchedTone = TONES.find(t => t.toUpperCase() === pastCoverLetter.tone);
        if (matchedTone) {
          setSelectedTone(matchedTone);
        } else {
          // Fallback: capitalise first letter
          const toneStr = pastCoverLetter.tone.charAt(0) + pastCoverLetter.tone.slice(1).toLowerCase();
          setSelectedTone(toneStr);
        }
      }

      if (pastCoverLetter.body) {
        setGeneratedLetter(pastCoverLetter.body);

        // Map flat DB row → structured CoverLetter type with authenticated candidate details
        const signatureParts = (pastCoverLetter.signature || '').split('\n');
        const candidateName = formatPersonName(
          user?.user_metadata?.full_name ||
          `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() ||
          user?.user_metadata?.name ||
          ''
        );

        const mappedCoverLetter: CoverLetter = {
          meta: {
            tone: pastCoverLetter.tone,
            word_count: pastCoverLetter.word_count ?? undefined,
            generated_at: pastCoverLetter.created_at,
          },
          header: {
            candidate_name: candidateName,
            phone: user?.user_metadata?.phone || '',
            email: user?.email || user?.user_metadata?.email || '',
            linkedin: user?.user_metadata?.linkedin_url || user?.user_metadata?.linkedin || '',
            portfolio: user?.user_metadata?.portfolio_url || user?.user_metadata?.portfolio || '',
            location: user?.user_metadata?.location || '',
            date: pastCoverLetter.created_at
              ? new Date(pastCoverLetter.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            hiring_manager: '',
            company_name: pastCoverLetter.title?.split(' - ')[0] || '',
            company_address: '',
          },
          salutation: pastCoverLetter.greeting || '',
          paragraphs: {
            opening: { text: pastCoverLetter.body },
            body_1: { text: '' },
            body_2: { text: '' },
            closing: { text: '' },
          },
          sign_off: {
            closing_phrase: signatureParts[0] || 'Sincerely,',
            name: signatureParts.slice(1).join(' ').trim() || candidateName,
          },
        };
        setCoverLetterObj(mappedCoverLetter);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastCoverLetter]);

  // ── File Attachment Handlers ────────────────────────────────────────
  const { pickFile, isPicking: isJdFilePicking } = useFilePicker();
  const extractJdLoading = isJdFilePicking || extractJd.isPending;

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
          // Proceed with original extraction
          const { extracted_text } = await extractJd.mutateAsync(payload);
          setJdFileText(extracted_text);
          setJdFileName(payload.fileName);
          setJobDescription(extracted_text);
        } catch (error: any) {
          Toast.show({ type: 'error', text1: 'Upload or extraction failed', text2: getUserFriendlyErrorMessage(error.message, 'Please try again.') });
          throw error;
        }
      },
      successMessage: { text1: 'Text extracted', text2: 'Text has been extracted from the file and is ready for use.' }
    });
  };

  const handleRemoveAttachedJd = () => {
    setJdFileText('');
    setJdFileName(null);
  };

  const handleGenerate = async () => {
    if (!requireCredits('Cover Letter')) return;

    setGenerating(true);
    setUrlError('');

    try {
      if (!targetCompany.trim() || !targetRole.trim()) {
        Toast.show({ type: 'error', text1: 'Input Required', text2: 'Please provide both Company Name and Role / Job Title.' });
        setGenerating(false);
        return;
      }

      // Use file text if available, otherwise use text input
      const finalJobDescription = jdFileText.trim().length > 0 ? jdFileText : jobDescription.trim();
      let finalJobUrl = jobUrl.trim();
      
      if (finalJobUrl) {
        if (!/^https?:\/\//i.test(finalJobUrl)) {
          finalJobUrl = `https://${finalJobUrl}`;
        }
        try {
          new URL(finalJobUrl);
        } catch {
          setUrlError('Please enter a valid URL');
          setGenerating(false);
          return;
        }
      }

      // Require either text/file OR URL
      if (finalJobDescription.length === 0 && !finalJobUrl) {
        Toast.show({ type: 'error', text1: 'Input Required', text2: 'Please provide a job description via text, file, or URL.' });
        setGenerating(false);
        return;
      }

      const result = await coverLetterMutation.mutateAsync({
        tone: selectedTone,
        job_description: finalJobDescription || undefined,
        job_url: finalJobUrl || undefined,
        target_company: targetCompany,
        target_role: targetRole,
      });
      const letterData: CoverLetter | undefined = result.cover_letter || result.coverLetter;

      if (!letterData) {
        throw new Error('No cover letter data returned from the server.');
      }

      if (!letterData.header) {
        letterData.header = {} as any;
      }
      if (!letterData.header.candidate_name) {
        letterData.header.candidate_name = formatPersonName(
          user?.user_metadata?.full_name ||
          `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() ||
          user?.user_metadata?.name ||
          ''
        );
      }
      if (!letterData.header.email) letterData.header.email = user?.email || user?.user_metadata?.email || '';
      if (!letterData.header.phone) letterData.header.phone = user?.user_metadata?.phone || '';
      if (!letterData.header.linkedin) letterData.header.linkedin = user?.user_metadata?.linkedin_url || user?.user_metadata?.linkedin || '';
      if (!letterData.header.portfolio) letterData.header.portfolio = user?.user_metadata?.portfolio_url || user?.user_metadata?.portfolio || '';
      if (!letterData.header.location) letterData.header.location = user?.user_metadata?.location || '';

      setCoverLetterObj(letterData);

      const p = letterData.paragraphs;
      const formattedLetter = `${letterData.salutation || ''}\n\n${p?.opening?.text || ''}\n\n${p?.body_1?.text || ''}\n\n${p?.body_2?.text || ''}\n\n${p?.closing?.text || ''}\n\n${letterData.sign_off?.closing_phrase || ''}\n${letterData.sign_off?.name || ''}`.trim();
      setGeneratedLetter(formattedLetter);
      addNotification({
        title: 'Cover Letter Generated',
        description: `Successfully tailored a letter for the provided job description.`,
        type: 'success',
      });

      incrementInterstitialCount();
      const updatedCount = useUIStore.getState().interstitialActionCount;
      if (!isPro && interstitialLoaded && updatedCount >= 2) {
        showInterstitialAd();
        resetInterstitialCount();
      }
    } catch (e: any) {
      const errMsg = e.message || '';
      if (
        errMsg.includes('Could not read job link') || 
        errMsg.includes('SCRAPE_FAILED') || 
        errMsg.includes('extract content') || 
        errMsg.includes('scrape')
      ) {
        setUrlError('Link inaccessible. Paste text or attach file.');
        Toast.show({
          type: 'error',
          text1: 'Could not read job link',
          text2: 'Please paste the job text or attach a file instead.',
          visibilityTime: 4000,
        });
      } else {
        handleApiError(errMsg, { fallbackTitle: 'Generation Failed' });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Cover Letter",
      "Are you sure you want to delete this cover letter? This action cannot be undone.",
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
              Toast.show({ type: 'error', text1: 'Delete Failed', text2: getUserFriendlyErrorMessage(e.message, 'Failed to delete cover letter.') });
            }
          }
        }
      ]
    );
  };

  const handleCopy = async () => {
    if (generatedLetter) {
      await Clipboard.setStringAsync(generatedLetter);
      Toast.show({ type: 'success', text1: 'Copied to Clipboard' });
    }
  };

  const getExportData = (): CoverLetter | null => {
    if (!coverLetterObj || !generatedLetter) return null;

    // Rebuild the formatted letter from the structured object so we can detect
    // whether the user has edited the text in the editor.
    const p = coverLetterObj.paragraphs || ({} as any);
    const originalFormatted = `${coverLetterObj.salutation || ''}\n\n${p.opening?.text || ''}\n\n${p.body_1?.text || ''}\n\n${p.body_2?.text || ''}\n\n${p.closing?.text || ''}\n\n${coverLetterObj.sign_off?.closing_phrase || ''}\n${coverLetterObj.sign_off?.name || ''}`.trim();

    // If the user has NOT edited the letter, export the structured object as-is
    // so preview / PDF / DOCX preserve the salutation, paragraph breaks, and
    // signature instead of collapsing everything into one giant paragraph.
    if (generatedLetter.trim() === originalFormatted) {
      return coverLetterObj;
    }

    // User edited the text — rebuild paragraphs from the flat text while
    // keeping the header and re-detecting salutation + sign-off.
    const blocks = generatedLetter.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const copy: CoverLetter = JSON.parse(JSON.stringify(coverLetterObj)) as CoverLetter;

    // Salutation detection (short line ending in a comma)
    if (blocks.length && blocks[0].length < 100 && /,$/.test(blocks[0])) {
      copy.salutation = blocks[0];
      blocks.shift();
    }

    // Sign-off detection (last block starting with a closing phrase)
    const signoffRe = /^(Sincerely|Best|Regards|Yours|Thanks|Thank you|Warmly|Respectfully|Kind regards)/i;
    if (blocks.length && signoffRe.test(blocks[blocks.length - 1])) {
      const signoffBlock = blocks.pop()!;
      const lines = signoffBlock.split('\n');
      copy.sign_off = { closing_phrase: lines[0] || '', name: lines.slice(1).join(' ').trim() };
    }

    const paraKeys = ['opening', 'body_1', 'body_2', 'closing'] as const;
    paraKeys.forEach((key, i) => {
      copy.paragraphs[key] = { text: blocks[i] || '' };
    });

    return copy;
  };

  const handlePreview = () => {
    const data = getExportData();
    if (!data) return;
    try {
      const htmlString = buildCoverLetterHTML(data);
      usePreviewStore.getState().setPreview('cover_letter', data, htmlString);
      router.push('/preview' as any);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Preview generation failed', text2: getUserFriendlyErrorMessage(e.message, 'Please try again.') });
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    const data = getExportData();
    if (!data) return;
    setIsExporting(true);
    setIsExportModalVisible(false);
    try {
      if (format === 'pdf') {
        await exportCoverLetterPDF(data);
        Toast.show({ type: 'success', text1: 'PDF Downloaded!', text2: 'Check your downloads folder' });
      } else {
        await exportCoverLetterDOCX(data);
        Toast.show({ type: 'success', text1: 'DOCX Downloaded!', text2: 'Check your downloads folder' });
      }
      addNotification({
        title: 'Cover Letter Downloaded',
        description: `Your cover letter has been exported as ${format.toUpperCase()}`,
        type: 'success',
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: getUserFriendlyErrorMessage(e.message, `Failed to export ${format.toUpperCase()}.`),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmail = async () => {
    if (generatedLetter) {
      const subject = encodeURIComponent(`Cover Letter - ${selectedTone}`);
      const body = encodeURIComponent(generatedLetter);
      await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
    }
  };

  const handleBack = () => {
    if (fromList === 'true' && id) {
      router.back();
    } else {
      hasResetRef.current = true;
      setGeneratedLetter(null);
      setCoverLetterObj(null);
      try {
        router.setParams({ id: '', fromList: '' });
      } catch {
        // ignore
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        
        {/* Page Header */}
        <View style={styles.pageHeader}>
          {(generatedLetter || fromList === 'true') && !generating && (
            <Pressable
              style={[styles.backBtn, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back to cover letter generator"
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </Pressable>
          )}
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Cover Letter</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Generate a highly-tailored cover letter using AI.</Text>
        </View>
        
        {!generatedLetter && !generating && (
          <Card style={[styles.setupCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Target Job</Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Company Name *</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]} 
                value={targetCompany}
                onChangeText={setTargetCompany}
                placeholder="e.g. Acme Corp"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Role / Job Title *</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]} 
                value={targetRole}
                onChangeText={setTargetRole}
                placeholder="e.g. Senior Software Engineer"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Job URL (Optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }, urlError ? { borderColor: colors.error } : null]}
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
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 8 }]}>Job Description (Optional if URL Provided)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                value={jobDescription}
                onChangeText={setJobDescription}
                placeholder="Or paste the full job description here..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
              {/* File Attachment Shelf (Prominently displayed when picking, loading, or attached) */}
              {(jdFileName || extractJdLoading) ? (
                <View style={[styles.attachmentShelf, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                    <Ionicons name="document-attach-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.attachmentShelfLabel, { color: colors.textPrimary }]}>Attached File:</Text>
                  </View>
                  <FileAttachmentBadge
                    fileName={jdFileName}
                    isLoading={extractJdLoading}
                    loadingText="Extracting file text..."
                    onRemove={handleRemoveAttachedJd}
                  />
                </View>
              ) : null}

              {/* Toolbar: Attach Button + Format hint */}
              <View style={styles.toolbarRow}>
                <Pressable
                  style={[styles.attachActionBtn, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
                  onPress={handleAttachJdFile}
                  disabled={extractJdLoading}
                  accessibilityLabel="Attach job description document"
                  accessibilityRole="button"
                >
                  {extractJdLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="attach" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.attachActionText, { color: colors.textPrimary }]}>
                        {jdFileName ? 'Replace Attached File' : 'Attach JD Document'}
                      </Text>
                    </>
                  )}
                </Pressable>
                <Text style={[styles.supportedFormatsText, { color: colors.textMuted }]}>
                  PDF, DOCX, PNG, JPG (Max 5MB)
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Select Tone</Text>
            <View style={styles.toneGrid}>
              {TONES.map(tone => (
                <Pressable 
                  key={tone}
                  style={[styles.toneChip, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, selectedTone === tone && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setSelectedTone(tone)}
                >
                  <Text style={[styles.toneText, { color: colors.textPrimary }, selectedTone === tone && styles.toneTextActive]}>
                    {tone}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable 
              style={[styles.primaryBtn, { marginTop: Spacing.xl, height: 54, backgroundColor: colors.primary }]} 
              onPress={handleGenerate}
              disabled={coverLetterMutation.isPending}
            >
              {coverLetterMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="star-four-points" size={20} color="#fff" />
                  <Text style={[styles.primaryBtnText, { fontSize: 16, marginLeft: 8 }]}>
                    Generate Cover Letter
                  </Text>
                </>
              )}
            </Pressable>
          </Card>
        )}

        {generating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Crafting the perfect letter...</Text>
          </View>
        )}

        {generatedLetter && !generating && (
          <View style={styles.resultContainer}>
            <View style={styles.resultToolbar}>
              <Text style={[styles.resultLabel, { color: colors.textPrimary }]}>Your Cover Letter</Text>
              <View style={styles.actionRow}>
                <Pressable 
                  style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} 
                  onPress={handleCopy}
                  accessibilityRole="button"
                  accessibilityLabel="Copy cover letter"
                >
                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                </Pressable>
                <Pressable 
                  style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} 
                  onPress={handlePreview}
                  accessibilityRole="button"
                  accessibilityLabel="Preview cover letter"
                >
                  <Ionicons name="eye-outline" size={18} color={colors.primary} />
                </Pressable>
                <Pressable 
                  style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} 
                  onPress={() => setIsExportModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Download cover letter"
                >
                  <Ionicons name="download-outline" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.documentContainer, { backgroundColor: colors.bgCard }]}>
              <TextInput 
                style={[styles.documentText, { color: colors.textPrimary }]}
                multiline
                value={generatedLetter}
                onChangeText={setGeneratedLetter}
              />
            </View>

            <View style={styles.bottomActions}>
              <Button 
                title="Try Another Tone" 
                variant="secondary" 
                onPress={() => setGeneratedLetter(null)} 
                style={styles.flex1}
              />
              <Button 
                title="Download" 
                variant="primary" 
                onPress={() => setIsExportModalVisible(true)} 
                style={styles.flex1}
                icon={<Ionicons name="download-outline" size={18} color="#fff" />}
              />
              <Button 
                title="Email Letter" 
                variant="outline" 
                onPress={handleEmail} 
                style={styles.flex1}
                icon={<Ionicons name="mail-outline" size={18} color={colors.primary} />}
              />
            </View>
            {id && fromList === 'true' && (
              <Button
                title={deleteMutation.isPending ? "Deleting..." : "Delete Cover Letter"}
                variant="outline"
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
                style={{ marginTop: Spacing.md, borderColor: colors.error }}
                textStyle={{ color: colors.error }}
              />
            )}
          </View>
        )}

        </ScrollView>

        <View style={{ height: bottomNavPadding }} />

        {renderExportModal()}
    </View>
  );

  function renderExportModal() {
    return (
      <Modal visible={isExportModalVisible} animationType="slide" transparent onRequestClose={() => setIsExportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Download Cover Letter</Text>
              <TouchableOpacity onPress={() => setIsExportModalVisible(false)} style={styles.modalCloseBtn} accessibilityRole="button" accessibilityLabel="Close download modal">
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Choose your preferred format</Text>

            <View style={styles.exportOptions}>
              {/* PDF Option */}
              <TouchableOpacity
                style={[styles.exportOptionCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
                onPress={() => handleExport('pdf')}
                disabled={isExporting}
                accessibilityRole="button"
                accessibilityLabel="Download PDF cover letter"
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.exportOptionTitle, { color: colors.textPrimary }]}>PDF</Text>
                <Text style={[styles.exportOptionDesc, { color: colors.textMuted }]}>
                  Universal format, ready for print & job applications
                </Text>
                {isExporting && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
              </TouchableOpacity>

              {/* DOCX Option */}
              <TouchableOpacity
                style={[styles.exportOptionCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
                onPress={() => handleExport('docx')}
                disabled={isExporting}
                accessibilityRole="button"
                accessibilityLabel="Download DOCX cover letter"
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.exportOptionTitle, { color: colors.textPrimary }]}>DOCX</Text>
                <Text style={[styles.exportOptionDesc, { color: colors.textMuted }]}>
                  Editable format, perfect for Word & custom edits
                </Text>
                {isExporting && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  pageHeader: {
    marginBottom: Spacing.xl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    padding: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    ...Shadow.sm,
  },
  pageTitle: {
    ...Typography.displayMd,
    marginBottom: 4,
  },
  pageSubtitle: {
    ...Typography.bodyMd,
  },
  setupCard: {
    padding: Spacing.xl,
  },
  sectionLabel: {
    ...Typography.headingLg,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.headingMd,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    ...Typography.bodyLg,
  },
  textArea: {
    minHeight: 120,
    maxHeight: 180,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  attachmentShelf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginVertical: Spacing.xs,
  },
  attachmentShelfLabel: {
    ...Typography.bodySm,
    fontWeight: '600',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  attachActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  attachActionText: {
    ...Typography.bodySm,
    fontWeight: '600',
  },
  supportedFormatsText: {
    ...Typography.bodySm,
    fontSize: 11,
  },
  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  toneChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  toneText: {
    ...Typography.bodyLg,
  },
  toneTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    ...Typography.headingMd,
    marginTop: Spacing.md,
  },
  resultContainer: {
    flex: 1,
  },
  resultToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  resultLabel: {
    ...Typography.headingLg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  documentContainer: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    minHeight: 400,
    ...Shadow.card,
    marginBottom: Spacing.xl,
  },
  documentText: {
    ...Typography.bodyLg,
    lineHeight: 28,
    minHeight: 350,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  flex1: {
    flex: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    gap: 8,
    ...Shadow.card,
  },
  primaryBtnText: {
    ...Typography.headingMd,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    ...Shadow.card,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    ...Typography.headingLg,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: Radius.full,
  },
  modalSubtitle: {
    ...Typography.bodySm,
    marginBottom: Spacing.lg,
  },
  exportOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  exportOptionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  exportOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  exportOptionTitle: {
    ...Typography.headingMd,
    marginBottom: 2,
  },
  exportOptionDesc: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 14,
  },
});
