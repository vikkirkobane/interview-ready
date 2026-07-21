import React, { useState, useEffect } from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Typography, Spacing, Radius, useTheme } from '../../src/theme';
import { useAnswerQuestionMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import Toast from 'react-native-toast-message';
import { useFilePicker } from '../../src/hooks/useFilePicker';import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/stores/auth-store';
import { handleApiError, isInsufficientCreditsError } from '../../src/lib/errorHandler';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Message = { id: string; role: 'user' | 'ai'; text: string; };

export default function AskAIScreen() {
  const { colors } = useTheme();
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [extractJdLoading, setExtractJdLoading] = useState(false);
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
    // Determine final question: use file text if available, otherwise input text
    const finalQuestion = jdFileText.trim().length > 0 ? jdFileText : inputText.trim();

    if (!finalQuestion) {
      Toast.show({ type: 'error', text1: 'Question Required', text2: 'Please provide a question via text or file attachment.' });
      return;
    }

    // Extract URL from question if present
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = finalQuestion.match(urlRegex);
    const extractedUrl = urls ? urls[0] : undefined;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: finalQuestion };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setJdFileText(''); // Clear file text after send to prevent stale data on next message
    setJdFileName(null);
    setIsTyping(true);

    try {
      const response = await answerQuestionMutation.mutateAsync({
        question: userMsg.text,
        context_source: 'profile',
        job_url: extractedUrl,
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
          { id: (Date.now() + 1).toString(), role: 'ai', text: `Sorry, I failed to generate an answer. Error: ${error.message}` }
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
        const { extracted_text } = await extractJd.mutateAsync(payload);
        setJdFileText(extracted_text);
        setJdFileName(payload.fileName);
      },
      successMessage: { text1: 'Text extracted', text2: 'Text has been extracted from the file and is ready for use.' }
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        <View style={{ flexShrink: 1, maxWidth: '95%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.messageBubble, isUser ? [styles.messageBubbleUser, { backgroundColor: colors.primary }] : [styles.messageBubbleAi, { backgroundColor: colors.bgCard, borderColor: colors.border }]]}>
            {isUser ? (
              <Text style={[styles.messageText, { color: '#fff' }]}>{msg.text}</Text>
            ) : (
              <Markdown style={{
                body: { ...Typography.bodyMd, color: colors.textPrimary },
                code_inline: { backgroundColor: colors.bgSecondary, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, ...Typography.bodySm },
                code_block: { backgroundColor: colors.bgSecondary, padding: 12, borderRadius: 8, ...Typography.bodySm },
                heading1: { ...Typography.headingLg, color: colors.textPrimary, marginVertical: Spacing.sm },
                heading2: { ...Typography.headingMd, color: colors.textPrimary, marginVertical: Spacing.sm },
                heading3: { ...Typography.headingMd, color: colors.textPrimary, marginVertical: Spacing.xs },
                paragraph: { ...Typography.bodyMd, color: colors.textPrimary, marginVertical: Spacing.xs },
                list_item: { ...Typography.bodyMd, color: colors.textPrimary },
                link: { color: colors.primary, textDecorationLine: 'underline' },
                strong: { fontWeight: '700' },
              }}>
                {msg.text}
              </Markdown>
            )}
          </View>
          <Pressable 
            onPress={() => copyToClipboard(msg.text)} 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginTop: 4, 
              marginLeft: isUser ? 0 : 8,
              marginRight: isUser ? 8 : 0,
              opacity: 0.6 
            }}
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
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Ask AI</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Chat with AI to answer application questions flawlessly.</Text>
          </View>

          {messages.map(renderMessage)}
          
          {isTyping && (
            <View style={[styles.messageWrapper, styles.messageWrapperAi]}>
              <View style={[styles.avatarAi, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="robot" size={16} color="#fff" />
              </View>
              <View style={[styles.messageBubble, styles.messageBubbleAi, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
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
          <View style={styles.inputRow}>
            <Pressable
              style={[styles.attachBtn, extractJdLoading && { opacity: 0.5 }]}
              onPress={handleAttachJdFile}
              disabled={extractJdLoading}
            >
              {extractJdLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="attach" size={20} color={colors.primary} />
                </>
              )}
            </Pressable>
            <View style={[styles.textInputContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <TextInput
                 style={[styles.textInput, { color: colors.textPrimary }]}
                 placeholder="Ask a question"
                 placeholderTextColor={colors.textMuted}
                 value={inputText}
                 onChangeText={setInputText}
                 multiline
              />
            </View>
            <Pressable
              style={[styles.sendBtn, { backgroundColor: colors.primary }, (!inputText.trim() && !jdFileText.trim() || isTyping) && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={(!inputText.trim() && !jdFileText.trim()) || isTyping}
            >
               <Ionicons name="send" size={18} color="#fff" style={{ transform: [{ translateX: 2 }] }} />
            </Pressable>
          </View>
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
    marginBottom: Spacing.xl
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
    marginBottom: Spacing.md
  },
  messageWrapperUser: {
    justifyContent: 'flex-end'
  },
  messageWrapperAi: {
    justifyContent: 'flex-start'
  },
  avatarAi: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  messageBubble: {
    maxWidth: '95%',
    padding: Spacing.md,
    borderRadius: Radius.lg
  },
  messageBubbleAi: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageBubbleUser: {
    borderBottomRightRadius: 4
  },
  messageText: {
    ...Typography.bodyLg,
    lineHeight: 24
  },
  inputArea: {
    padding: Spacing.md,
    borderTopWidth: 1,
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
  },
  textInput: {
    flex: 1,
    minHeight: 52,
    backgroundColor: 'transparent',
    paddingTop: 14,
    paddingBottom: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107,70,254,0.08)',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  attachBtnText: {
    ...Typography.label,
    marginLeft: 4,
  },
});
