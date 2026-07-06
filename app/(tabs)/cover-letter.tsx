import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { Card, Button } from '../../src/components/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCreateCoverLetterMutation, useCoverLetterQuery, useDeleteCoverLetterMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { useNotificationStore } from '../../src/stores/notification-store';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as DocumentPicker from 'expo-document-picker';
import { usePreviewStore } from '../../src/store/previewStore';
import { buildCoverLetterHTML } from '../../src/lib/coverLetterHTML';
import { CoverLetter } from '../../src/types/schemas';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const TONES = ['Professional', 'Enthusiastic', 'Concise', 'Storytelling', 'Formal'];

export default function CoverLetterGeneratorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { addNotification } = useNotificationStore();
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [coverLetterObj, setCoverLetterObj] = useState<CoverLetter | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [extractJdLoading, setExtractJdLoading] = useState(false);

  const { id, fromList } = useLocalSearchParams();

  const coverLetterMutation = useCreateCoverLetterMutation();
  const deleteMutation = useDeleteCoverLetterMutation();
  const extractJd = useExtractJdMutation();
  const { data: pastCoverLetter } = useCoverLetterQuery(id as string);


  React.useEffect(() => {
    if (pastCoverLetter) {
      if (pastCoverLetter.title) setTargetRole(pastCoverLetter.title.split(' - ')[0] || ''); // Attempt to parse title
      if (pastCoverLetter.tone) {
        const toneStr = pastCoverLetter.tone.charAt(0) + pastCoverLetter.tone.slice(1).toLowerCase();
        setSelectedTone(toneStr);
      }
      if (pastCoverLetter.body) {
        setGeneratedLetter(pastCoverLetter.body);
        setCoverLetterObj(pastCoverLetter as CoverLetter);
      }
    }
  }, [pastCoverLetter]);

  // ── File Attachment Handlers ────────────────────────────────────────
  const handleAttachJdFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];

      if (fileAsset.size && fileAsset.size > 1 * 1024 * 1024) {
        Toast.show({ type: 'error', text1: 'File too large', text2: 'Please upload a file smaller than 1MB.' });
        return;
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
      if (!fileAsset.mimeType || !allowedTypes.includes(fileAsset.mimeType)) {
        Toast.show({ type: 'error', text1: 'Invalid file type', text2: 'Only PNG, JPEG, and PDF files are allowed.' });
        return;
      }

      setExtractJdLoading(true);

      const formData = new FormData();
      if (Platform.OS === 'web' && fileAsset.file) {
        formData.append('file', fileAsset.file as unknown as Blob);
      } else {
        formData.append('file', {
          uri: fileAsset.uri,
          name: fileAsset.name,
          type: fileAsset.mimeType,
        } as any);
      }

      const { extracted_text } = await extractJd.mutateAsync(formData);

      setJdFileText(extracted_text);
      setJdFileName(fileAsset.name);

      Toast.show({ type: 'success', text1: 'Text extracted', text2: 'Text has been extracted from the file and is ready for use.' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to extract text', text2: error.message || 'Please check your file and try again.' });
    } finally {
      setExtractJdLoading(false);
    }
  };

  const handleRemoveAttachedJd = () => {
    setJdFileText('');
    setJdFileName(null);
  };

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      // Use file text if available, otherwise use text input
      const finalJobDescription = jdFileText.trim().length > 0 ? jdFileText : jobDescription.trim();

      if (finalJobDescription.length === 0) {
        Toast.show({ type: 'error', text1: 'Job Description Required', text2: 'Please provide a job description via text or file attachment.' });
        setGenerating(false);
        return;
      }

      const result = await coverLetterMutation.mutateAsync({
        tone: selectedTone,
        job_description: finalJobDescription,
        target_company: targetCompany,
        target_role: targetRole,
      });
      const letterData: CoverLetter = result.cover_letter || result.coverLetter;
      
      setCoverLetterObj(letterData);

      const p = letterData.paragraphs;
      const formattedLetter = letterData ? `${letterData.salutation}\n\n${p.opening?.text}\n\n${p.body_1?.text}\n\n${p.body_2?.text}\n\n${p.closing?.text}\n\n${letterData.sign_off?.closing_phrase}\n${letterData.sign_off?.name}` : "Your customized cover letter goes here.";
      setGeneratedLetter(formattedLetter);
      addNotification({
        title: 'Cover Letter Generated',
        description: `Successfully tailored a letter for the provided job description.`,
        type: 'success',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Generation Failed', text2: e.message });
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
              Alert.alert('Error', e.message);
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
    return {
      ...coverLetterObj,
      salutation: '',
      paragraphs: {
        opening: { text: generatedLetter },
        body_1: { text: '' },
        body_2: { text: '' },
        closing: { text: '' },
      },
      sign_off: { closing_phrase: '', name: '' }
    };
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
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Company Name</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]} 
                value={targetCompany}
                onChangeText={setTargetCompany}
                placeholder="e.g. Acme Corp"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Role / Job Title</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]} 
                value={targetRole}
                onChangeText={setTargetRole}
                placeholder="e.g. Senior Software Engineer"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Job Description</Text>
                <TouchableOpacity style={[styles.attachBtn, { backgroundColor: `${colors.primary}1A` }]} onPress={handleAttachJdFile} disabled={extractJdLoading}>
                  {extractJdLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="attach" size={16} color={colors.primary} />
                      <Text style={[styles.attachBtnText, { color: colors.primary }]}>Attach file</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                value={jobDescription}
                onChangeText={setJobDescription}
                placeholder="Paste the full job description here..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              {/* Attached File Info */}
              {jdFileName && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{jdFileName}</Text>
                  <TouchableOpacity onPress={handleRemoveAttachedJd} style={{ marginLeft: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Attach JD File Loading State */}
              {extractJdLoading && (
                <View style={{ marginTop: 4 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ marginLeft: 4, color: colors.textMuted, fontSize: 12 }}>Extracting text...</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Select Tone</Text>
            <View style={styles.toneGrid}>
              {TONES.map(tone => (
                <TouchableOpacity 
                  key={tone}
                  style={[styles.toneChip, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, selectedTone === tone && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setSelectedTone(tone)}
                >
                  <Text style={[styles.toneText, { color: colors.textPrimary }, selectedTone === tone && styles.toneTextActive]}>
                    {tone}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, { marginTop: Spacing.xl, height: 54 }]} 
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
            </TouchableOpacity>
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
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={handlePreview}>
                  <Ionicons name="eye-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
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
    paddingBottom: 120,
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
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  attachBtnText: {
    ...Typography.label,
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
