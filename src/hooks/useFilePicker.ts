import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

export interface FilePickerOptions {
  type: string[];
  maxSizeMb?: number;
  allowedTypes?: string[];
  onFilePicked: (file: { fileUri: string; fileName: string; mimeType: string; webFile: Blob | null }) => Promise<void>;
  successMessage?: { text1: string; text2?: string };
}

export function useFilePicker() {
  const [isPicking, setIsPicking] = useState(false);

  const pickFile = async (options: FilePickerOptions) => {
    try {
      setIsPicking(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: options.type,
        // copyToCacheDirectory: false prevents a crash on Android 12 (API 31) where
        // DocumentsUI PickActivity throws FileNotFoundException when attempting to
        // restore the last-accessed Images root during a cache-copy operation.
        // The native upload path in api.ts sends the file URI directly via FormData,
        // so no cache copy is required on any platform.
        copyToCacheDirectory: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];
      const maxSize = (options.maxSizeMb || 5) * 1024 * 1024;

      if (fileAsset.size && fileAsset.size > maxSize) {
        Toast.show({ type: 'error', text1: 'File too large', text2: `Please upload a file smaller than ${options.maxSizeMb || 5}MB.` });
        return;
      }

      // If allowedTypes is provided, validate strictly, otherwise rely on the 'type' filter
      if (options.allowedTypes && options.allowedTypes.length > 0) {
        const isValid = options.allowedTypes.some(type => {
          if (type === 'application/pdf') return fileAsset.mimeType === 'application/pdf' || fileAsset.name.toLowerCase().endsWith('.pdf');
          if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return fileAsset.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileAsset.name.toLowerCase().endsWith('.docx');
          return fileAsset.mimeType === type;
        });

        if (!isValid) {
          Toast.show({ type: 'error', text1: 'Invalid file type', text2: 'Please check the allowed file types.' });
          return;
        }
      }

      // Infer mimeType if missing
      let mimeType = fileAsset.mimeType || 'application/octet-stream';
      if (!fileAsset.mimeType) {
        if (fileAsset.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
        else if (fileAsset.name.toLowerCase().endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (fileAsset.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
        else if (fileAsset.name.toLowerCase().endsWith('.jpg') || fileAsset.name.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
      }

      const payload = {
        fileUri: fileAsset.uri,
        fileName: fileAsset.name,
        mimeType,
        webFile: Platform.OS === 'web' && fileAsset.file ? (fileAsset.file as unknown as Blob) : null,
      };

      await options.onFilePicked(payload);

      if (options.successMessage) {
        Toast.show({ type: 'success', text1: options.successMessage.text1, text2: options.successMessage.text2 });
      }

    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to process file', text2: error.message || 'Please check your file and try again.' });
    } finally {
      setIsPicking(false);
    }
  };

  return { pickFile, isPicking };
}
