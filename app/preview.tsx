import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Colors, Typography, Spacing, Shadow, Radius, useTheme } from '../src/theme';
import { usePreviewStore } from '../src/store/previewStore';
import { exportResumePDF, exportResumeDOCX } from '../src/lib/resumeExport';
import { exportCoverLetterPDF, exportCoverLetterDOCX } from '../src/lib/coverLetterExport';
import Toast from 'react-native-toast-message';
import { Button } from '../src/components/ui';
import { Ionicons } from '@expo/vector-icons';

export default function PreviewScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { documentType, documentData, htmlPreview, templateId, clearPreview } = usePreviewStore();

  if (!documentType || !documentData || !htmlPreview) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>No document available to preview.</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    clearPreview();
    router.back();
  };

  const handleDownloadPDF = async () => {
    try {
      if (documentType === 'resume') {
        await exportResumePDF(documentData, templateId || undefined);
      } else {
        await exportCoverLetterPDF(documentData);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Export Failed', text2: e.message });
    }
  };

  const handleDownloadDOCX = async () => {
    try {
      if (documentType === 'resume') {
        await exportResumeDOCX(documentData, templateId || undefined);
      } else {
        await exportCoverLetterDOCX(documentData);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Export Failed', text2: e.message });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
           <Text style={{ ...Typography.headingLg, color: colors.textBody }}>←</Text>
        </TouchableOpacity>
        <Ionicons name="document-text" size={24} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Document Preview</Text>
      </View>

      <View style={[styles.previewContainer, { backgroundColor: colors.bgPrimary }]}>
        {Platform.OS === 'web' ? (
          <iframe 
            srcDoc={htmlPreview} 
            style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff', borderRadius: Radius.md }}
          />
        ) : (
          <WebView
            source={{ html: htmlPreview }}
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: Radius.md }}
            scalesPageToFit={false}
          />
        )}
      </View>

      <View style={[
        styles.footer, 
        { 
          backgroundColor: colors.bgPrimary, 
          borderTopColor: colors.border,
        }
      ]}>
        <Button 
          title="Download PDF" 
          onPress={handleDownloadPDF} 
          variant="secondary" 
          style={styles.flex1}
        />
        <Button 
          title="Download DOCX" 
          onPress={handleDownloadDOCX} 
          variant="primary" 
          style={styles.flex1}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    ...Typography.headingMd,
  },
  previewContainer: {
    flex: 1,
    margin: Spacing.md,
    ...Shadow.md,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  flex1: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.bodyLg,
    marginBottom: Spacing.lg,
  },
});
