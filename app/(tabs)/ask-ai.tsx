import React, { useState, useEffect } from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Typography, Spacing, Radius, useTheme } from '../../src/theme';
import { useAnswerQuestionMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import Toast from 'react-native-toast-message';
import { useFilePicker } from '../../src/hooks/useFilePicker';import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/stores/auth-store';
import { handleApiError, isInsufficientCreditsError, getUserFriendlyErrorMessage } from '../../src/lib/errorHandler';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { fetchFileArrayBuffer } from '../../src/lib/api';
import { FileAttachmentBadge } from '../../src/components/ui';
import { useCreditGuard } from '../../src/lib/creditGuard';


type Message = { id: string; role: 'user' | 'ai'; text: string; };

export default function AskAIScreen() {
  const { colors } = useTheme();
  const { requireCredits } = useCreditGuard();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      text: 'Hello! Paste a job application question here and I will help you craft the perfect answer tailored from your profile or resume.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuthStore();


  const insets = useSafeAreaInsets();
  const tabBarHeight = 72;
  const tabBarBottomOffset = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const bottomNavPadding = tabBarHeight + tabBarBottomOffset + 70; // +60 for AdBanner

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const extractJd = useExtractJdMutation();
  const answerQuestionMutation = useAnswerQuestionMutation();

  const copyToClipboard = (text: string) => {
    Clipboard.setStringAsync(text);
    Toast.show({
      type: 'success',
      text1: 'Copied to clipboard',
    });
  };

  const handleSend = async () => {
    const question = inputText.trim();
    const fileContext = jdFileText.trim();

    if (!question && !fileContext) {
      Toast.show({ type: 'error', text1: 'Question Required', text2: 'Please provide a question via text or file attachment.' });
      return;
    }

    if (!requireCredits('Ask AI')) return;

    // If user pasted a link, inform them to paste only application questions or job descriptions directly.
    const urlRegex = /(https?:\/\/[^\s]+|www\.[a-zA-Z0-9-]+\.[^\s]+)/i;
    if (urlRegex.test(question)) {
      const userMsgText = question || `[Analyze attached file: ${jdFileName || 'document'}]`;
      const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userMsgText };
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Please paste only application questions or job descriptions.'
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      setInputText('');
      return;
    }

    // If only a file is attached, ask the AI to analyze it thoroughly.
    const effectiveQuestion = question || 'Please analyze the attached document thoroughly and provide a clear, detailed summary of the key points, requirements, and anything notable.';

    const userMsgText = question || `[Analyze attached file: ${jdFileName || 'document'}]`;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userMsgText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    // Keep the attached file so the user can ask follow-up questions about it.
    setIsTyping(true);

    try {
      const response = await answerQuestionMutation.mutateAsync({
        question: effectiveQuestion,
        context_source: 'profile',
        file_context: fileContext || undefined,
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response.answer || "I generated an answer but it was empty."
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      if (isInsufficientCreditsError(error.message)) {
        // Remove the user message we just appended since the request failed
        setMessages(prev => prev.slice(0, -1));
        handleApiError(error.message);
      } else {
        setMessages(prev => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: 'ai', text: `Sorry, I couldn't generate an answer right now. ${getUserFriendlyErrorMessage(error.message, 'Please try asking again in a moment.')}` }
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

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

  const renderMessage = (msg: Message) => {
    const isUser = msg.role === 'user';
    return (
      <View key={msg.id} style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAi]}>
        {!isUser && (
          <View style={[styles.avatarAi, { backgroundColor: colors.primary }]}>
             <MaterialCommunityIcons name="robot" size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.messageContainer, isUser ? styles.messageContainerUser : styles.messageContainerAi]}>
          <View style={[
            styles.messageBubble, 
            isUser ? [styles.messageBubbleUser, { backgroundColor: colors.primary }] 
                   : [styles.messageBubbleAi, { backgroundColor: colors.bgCard, borderColor: colors.border }]
          ]}>
            {isUser ? (
              <Text style={[styles.messageText, styles.messageTextUser]}>{msg.text}</Text>
            ) : (
              <Markdown style={{
                body: { ...Typography.bodyMd, color: colors.textPrimary, lineHeight: 22 },
                code_inline: { backgroundColor: colors.bgSecondary, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, ...Typography.bodySm },
                code_block: { backgroundColor: colors.bgSecondary, padding: 12, borderRadius: 8, ...Typography.bodySm },
                heading1: { ...Typography.headingLg, color: colors.textPrimary, marginVertical: Spacing.sm },
                heading2: { ...Typography.headingMd, color: colors.textPrimary, marginVertical: Spacing.sm },
                heading3: { ...Typography.headingMd, color: colors.textPrimary, marginVertical: Spacing.xs },
                paragraph: { ...Typography.bodyMd, color: colors.textPrimary, marginVertical: Spacing.xs, lineHeight: 22 },
                list_item: { ...Typography.bodyMd, color: colors.textPrimary, lineHeight: 22 },
                link: { color: colors.primary, textDecorationLine: 'underline' },
                strong: { fontWeight: '700' },
              }}>
                {msg.text}
              </Markdown>
            )}
          </View>
          <Pressable 
            onPress={() => copyToClipboard(msg.text)} 
            style={[
              styles.copyActionBtn,
              { 
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                marginLeft: isUser ? 0 : 8,
                marginRight: isUser ? 8 : 0,
              }
            ]}
          >
            <Ionicons name="copy-outline" size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 11, color: colors.textMuted, marginLeft: 3 }}>Copy</Text>
          </Pressable>
        </View>
        {isUser && (
          <View style={[styles.avatarUser, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
             <Ionicons name="person" size={14} color={colors.primary} />
          </View>
        )}
      </View>
    );
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: '1',
        role: 'ai',
        text: 'Hello! Paste a job application question here and I will help you craft the perfect answer tailored from your profile or resume.'
      }
    ]);
    setInputText('');
    setJdFileText('');
    setJdFileName(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      >
        <ScrollView 
          style={styles.chatArea} 
          contentContainerStyle={[styles.chatContent, { paddingBottom: Spacing.xl }]}
        >
          
          {/* Page Header */}
          <View style={styles.pageHeader}>
            {messages.length > 1 && (
              <Pressable
                style={[styles.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={handleResetChat}
                accessibilityRole="button"
                accessibilityLabel="Reset chat"
              >
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </Pressable>
            )}
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Ask AI</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Chat with AI to answer application questions flawlessly.</Text>
          </View>

          {messages.map(renderMessage)}
          
          {isTyping && (
            <View style={[styles.messageWrapper, styles.messageWrapperAi]}>
              <View style={[styles.avatarAi, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="robot" size={16} color="#fff" />
              </View>
              <View style={[styles.messageBubble, styles.messageBubbleAi, { minWidth: 64, backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>
        
        <View style={[
          styles.inputArea, 
          { 
            backgroundColor: 'transparent', 
            borderTopColor: 'transparent',
            paddingBottom: keyboardVisible ? (Platform.OS === 'ios' ? Spacing.sm : Spacing.lg) : 0, 
          }
        ]}>
          {(jdFileName || extractJdLoading) ? (
            <View style={[styles.attachmentShelf, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
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

          <View style={styles.inputRow}>
            <Pressable
              style={[
                styles.attachBtn,
                {
                  backgroundColor: jdFileName ? `${colors.primary}15` : colors.bgCard,
                  borderColor: jdFileName ? colors.primary : colors.border,
                },
                extractJdLoading && { opacity: 0.5 }
              ]}
              onPress={handleAttachJdFile}
              disabled={extractJdLoading}
              accessibilityLabel={jdFileName ? 'Replace attached document' : 'Attach document'}
              accessibilityRole="button"
            >
              {extractJdLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name={jdFileName ? 'document-text' : 'attach'}
                  size={20}
                  color={colors.primary}
                />
              )}
            </Pressable>
            <View style={[styles.textInputContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <TextInput
                 style={[styles.textInput, { color: colors.textPrimary }]}
                 placeholder="Ask a question..."
                 placeholderTextColor={colors.textMuted}
                 value={inputText}
                 onChangeText={setInputText}
                 multiline
                 accessibilityLabel="Ask a question"
              />
            </View>
            <Pressable
              style={[
                styles.sendBtn,
                { backgroundColor: colors.primary },
                ((!inputText.trim() && !jdFileText.trim()) || isTyping) && { opacity: 0.4 }
              ]}
              onPress={handleSend}
              disabled={(!inputText.trim() && !jdFileText.trim()) || isTyping}
              accessibilityLabel="Send question"
              accessibilityRole="button"
            >
               <Ionicons name="send" size={18} color="#fff" style={{ transform: [{ translateX: 2 }] }} />
            </Pressable>
          </View>
          <Text style={[styles.supportedFormatsText, { color: colors.textMuted }]}>
            PDF, DOCX, PNG, JPG (Max 5MB)
          </Text>
        </View>
      </KeyboardAvoidingView>

      {!keyboardVisible && (
        <View style={{ height: bottomNavPadding }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1
  },
  chatContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
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
  },
  pageTitle: {
    ...Typography.displayMd,
    marginBottom: 4
  },
  pageSubtitle: {
    ...Typography.bodyMd,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    width: '100%',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperAi: {
    justifyContent: 'flex-start',
  },
  messageContainer: {
    flexShrink: 1,
    maxWidth: '85%',
  },
  messageContainerUser: {
    alignItems: 'flex-end',
  },
  messageContainerAi: {
    alignItems: 'flex-start',
  },
  avatarAi: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  messageBubble: {
    minWidth: '45%',
    maxWidth: '100%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.lg + 4,
  },
  messageBubbleAi: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  messageBubbleUser: {
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  messageText: {
    ...Typography.bodyMd,
    lineHeight: 22,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  copyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    opacity: 0.6,
  },
  inputArea: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  attachedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  attachedChipText: {
    ...Typography.bodyMd,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center'
  },
  textInputContainer: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    textAlignVertical: 'center',
    ...Typography.bodyLg,
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  attachBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
  },
  attachBtnText: {
    ...Typography.label,
    marginLeft: 4,
  },
  attachmentShelf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  attachmentShelfLabel: {
    ...Typography.label,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  supportedFormatsText: {
    ...Typography.caption,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
});

