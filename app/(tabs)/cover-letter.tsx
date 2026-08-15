import React, { useState } from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Card, Button, FileAttachmentBadge } from '../../src/components/ui';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCreateCoverLetterMutation, useCoverLetterQuery, useDeleteCoverLetterMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { handleApiError } from '../../src/lib/errorHandler';
import { useNotificationStore } from '../../src/stores/notification-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { supabase } from '../../src/lib/supabase';
import { fetchFileArrayBuffer } from '../../src/lib/api';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useFilePicker } from '../../src/hooks/useFilePicker';import { usePreviewStore } from '../../src/store/previewStore';
import { buildCoverLetterHTML } from '../../src/lib/coverLetterHTML';
import { CoverLetter } from '../../src/types/schemas';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '../../src/stores/ui-store';
import { useInterstitialAd } from '../../src/lib/useInterstitialAd';

const TONES = ['Professional', 'Enthusiastic', 'Concise', 'Storytelling', 'Formal'];

export default function CoverLetterGeneratorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { addNotification } = useNotificationStore();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [coverLetterObj, setCoverLetterObj] = useState<CoverLetter | null>(null);
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

  const { showAd: showInterstitialAd, loaded: interstitialLoaded } = useInterstitialAd();
  const { incrementInterstitialCount, resetInterstitialCount } = useUIStore();


  React.useEffect(() => {
    if (pastCoverLetter) {
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

        // Map flat DB row → structured CoverLetter type
        const signatureParts = (pastCoverLetter.signature || '').split('\n');
        const mappedCoverLetter: CoverLetter = {
          meta: {
            tone: pastCoverLetter.tone,
            word_count: pastCoverLetter.word_count ?? undefined,
            generated_at: pastCoverLetter.created_at,
          },
          header: {
            candidate_name: '',
            phone: '',
            email: '',
            linkedin: '',
            portfolio: '',
            date: pastCoverLetter.created_at || '',
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
            closing_phrase: signatureParts[0] || '',
            name: signatureParts.slice(1).join(' ').trim(),
          },
        };
        setCoverLetterObj(mappedCoverLetter);
      }
    }
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

  const handleGenerate = async () => {
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
      handleApiError(e.message, { fallbackTitle: 'Generation Failed' });
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
              Toast.show({ type: 'error', text1: 'Delete Failed', text2: e.message });
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
      Toast.show({ type: 'error', text1: 'Preview generation failed', text2: e.message });
    }
  };

  const handleEmail = async () => {
    if (generatedLetter) {
      const subject = encodeURIComponent(`Cover Letter - ${selectedTone}`);
      const body = encodeURIComponent(generatedLetter);
      await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        {/* Page Header */}
        <View style={styles.pageHeader}>
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
              <View style={styles.inputActions}>
                {/* Attach JD File Button */}
                <Pressable style={styles.attachBtn} onPress={handleAttachJdFile} disabled={extractJdLoading}>
                  {extractJdLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="attach" size={24} color={colors.textMuted} />
                  )}
                </Pressable>

                {/* Attached File Info Badge */}
                <FileAttachmentBadge
                  fileName={jdFileName}
                  isLoading={extractJdLoading}
                  loadingText="Extracting file..."
                  onRemove={handleRemoveAttachedJd}
                  style={{ marginLeft: Spacing.xs }}
                />
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
                <Pressable style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                </Pressable>
                <Pressable style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={handlePreview}>
                  <Ionicons name="eye-outline" size={18} color={colors.primary} />
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
                title="Email Letter" 
                variant="primary" 
                onPress={handleEmail}
                style={styles.flex1}
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
    </View>
  );
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
    maxHeight: 200,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
});
