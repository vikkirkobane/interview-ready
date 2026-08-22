import React, { useState, useEffect, useRef } from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Typography, Spacing, Radius, useTheme } from '../../src/theme';
import { useStartInterviewMutation, useInterviewMessageMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import { useAuthStore } from '../../src/stores/auth-store';
import { supabase } from '../../src/lib/supabase';
import { fetchFileArrayBuffer } from '../../src/lib/api';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { handleApiError, isInsufficientCreditsError, getUserFriendlyErrorMessage } from '../../src/lib/errorHandler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useFilePicker } from '../../src/hooks/useFilePicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '../../src/stores/ui-store';
import { useInterstitialAd } from '../../src/lib/useInterstitialAd';
import { FileAttachmentBadge } from '../../src/components/ui';
import { useCreditGuard } from '../../src/lib/creditGuard';

type Message = {
  id: string;
  role: 'ai' | 'user';
  text: string;
};

export default function InterviewScreen() {
  const router = useRouter();
  const { role = 'General', type = 'Behavioral', difficulty = 'Intermediate', jobDescription = '', jobUrl = '' } = useLocalSearchParams();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';

  const insets = useSafeAreaInsets();
  const tabBarHeight = 72;
  const tabBarBottomOffset = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const bottomNavPadding = tabBarHeight + tabBarBottomOffset + (!isPro ? 70 : 0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const messageCounter = useRef(0);

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

  const startMutation = useStartInterviewMutation();
  const messageMutation = useInterviewMessageMutation();
  const extractJd = useExtractJdMutation();

  const { showAd: showInterstitialAd, loaded: interstitialLoaded } = useInterstitialAd();
  const { incrementInterstitialCount, resetInterstitialCount } = useUIStore();
  const { requireCredits } = useCreditGuard();

  useEffect(() => {
    // Start interview session when screen mounts
    const startInterview = async () => {
      if (!requireCredits('Mock Interview')) return;
      try {
        const payload: any = {
          role: role as string,
          interview_type: (type as string).toUpperCase().replace(' ', '_'),
          difficulty: (difficulty as string).toUpperCase()
        };

        // Use file text if available, otherwise use URL parameter
        if (jdFileText.trim().length > 0) {
          payload.job_description = jdFileText;
        } else if (jobDescription) {
          payload.job_description = jobDescription;
        }
        
        if (jobUrl) {
          payload.job_url = jobUrl;
        }

        const res = await startMutation.mutateAsync(payload);
        setSessionId(res.interview?.id || res.id);
        const initialMsg = res.interview?.messages?.[0]?.content || res.message || "Hello! I am your AI interviewer. Shall we begin?";
        setMessages([{
          id: Date.now().toString(),
          role: 'ai',
          text: initialMsg
        }]);
      } catch (e: any) {
        handleApiError(e.message, { fallbackTitle: 'Failed to start interview' });
      } finally {
        setIsTyping(false);
      }
    };
    startInterview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer Effect — only start when session exists
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setStringAsync(text);
    Toast.show({
      type: 'success',
      text1: 'Copied to clipboard',
    });
  };

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
          const { user: currentUser } = useAuthStore.getState();
          const userId = currentUser?.id;
          if (!userId) {
            throw new Error('User not authenticated');
          }
          const storagePath = `jd-uploads/${userId}/${Date.now()}-${fileName}`;
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

  const handleSend = async () => {
    if (!inputText.trim() || !sessionId) return;
    if (!requireCredits('Mock Interview')) return;

    messageCounter.current += 1;
    const newMsg: Message = { id: `msg-${messageCounter.current}-${Date.now()}`, role: 'user', text: inputText.trim() };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await messageMutation.mutateAsync({
        session_id: sessionId,
        content: newMsg.text,
        file_context: jdFileText.trim() ? jdFileText : undefined,
      });
      messageCounter.current += 1;
      setMessages(prev => [...prev, {
        id: `msg-ai-${messageCounter.current}-${Date.now()}`,
        role: 'ai',
        text: res.message?.content || res.content || "Thank you for your response."
      }]);

      incrementInterstitialCount();
      const updatedCount = useUIStore.getState().interstitialActionCount;
      if (!isPro && interstitialLoaded && updatedCount >= 2) {
        showInterstitialAd();
        resetInterstitialCount();
      }
    } catch (e: any) {
      if (isInsufficientCreditsError(e.message)) {
        setMessages(prev => prev.slice(0, -1));
        handleApiError(e.message);
      } else {
        handleApiError(e.message, { fallbackTitle: 'Message Failed' });
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndSession = () => {
    if (sessionId) {
      Alert.alert(
        'End Session?',
        'Are you sure you want to end this interview session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: () => router.push({ pathname: '/feedback', params: { sessionId, duration: String(seconds) } }),
          },
        ]
      );
    } else {
      router.back();
    }
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
            accessibilityRole="button"
            accessibilityLabel="Copy message"
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
          ref={scrollViewRef}
          style={styles.chatArea} 
          contentContainerStyle={[styles.chatContent, { paddingBottom: Spacing.xl }]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Live Interview Header */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderTitleArea}>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{role}</Text>
              <View style={styles.headerBadge}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.liveText, { color: colors.textMuted }]}>LIVE INTERVIEW SESSION</Text>
              </View>
            </View>
            
            <View style={styles.headerActions}>
              <View style={styles.timerContainer}>
                <Text style={[styles.timerText, { color: colors.primary }]}>{formatTime(seconds)}</Text>
                <Text style={[styles.timerLabel, { color: colors.textMuted }]}>DURATION</Text>
              </View>
              <Pressable 
                style={[styles.endSessionBtn, { backgroundColor: colors.errorLight }]} 
                onPress={handleEndSession}
                accessibilityRole="button"
                accessibilityLabel="End Session"
              >
                <Text style={[styles.endSessionText, { color: colors.error }]}>END SESSION</Text>
              </Pressable>
            </View>
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
        
        {/* Input Area */}
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
                <Text style={[styles.attachmentShelfLabel, { color: colors.textPrimary }]}>Attached JD:</Text>
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
              accessibilityLabel={jdFileName ? 'Replace attached document' : 'Attach job description document'}
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
                placeholder="Type your response..."
                placeholderTextColor={colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline
                accessibilityLabel="Type your response"
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
              accessibilityLabel="Send response"
              accessibilityRole="button"
            >
              <Ionicons name="send" size={18} color="#fff" style={{ transform: [{ translateX: 2 }] }} />
            </Pressable>
          </View>
          <Text style={[styles.supportedFormatsText, { color: colors.textMuted }]}>
            PDF, DOCX, PNG, JPG (Max 5MB) • POWERED BY INTERVIEWREADY AI
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
    flex: 1,
  },
  chatContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  pageHeaderTitleArea: {
    flex: 1,
  },
  pageTitle: {
    ...Typography.displayMd,
    marginBottom: 4,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  timerContainer: {
    alignItems: 'flex-end',
  },
  timerText: {
    ...Typography.mono,
    fontSize: 14,
    fontWeight: '700',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  endSessionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  endSessionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
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
    justifyContent: 'center',
  },
  attachBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
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
