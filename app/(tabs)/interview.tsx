import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Animated, Easing, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useStartInterviewMutation, useInterviewMessageMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import Toast from 'react-native-toast-message';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import * as DocumentPicker from 'expo-document-picker';

// Mock Message Data
type Message = {
  id: string;
  role: 'ai' | 'user';
  text: string;
};

export default function InterviewScreen() {
  const router = useRouter();
  const { role = 'General', type = 'Behavioral', difficulty = 'Intermediate', jobDescription = '' } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [extractJdLoading, setExtractJdLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const startMutation = useStartInterviewMutation();
  const messageMutation = useInterviewMessageMutation();
  const extractJd = useExtractJdMutation();

  useEffect(() => {
    // Start interview session when screen mounts
    const startInterview = async () => {
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

        const res = await startMutation.mutateAsync(payload);
        setSessionId(res.interview?.id || res.id);
        const initialMsg = res.interview?.messages?.[0]?.content || res.message || "Hello! I am your AI interviewer. Shall we begin?";
        setMessages([{
          id: Date.now().toString(),
          role: 'ai',
          text: initialMsg
        }]);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Failed to start', text2: e.message });
      } finally {
        setIsTyping(false);
      }
    };
    startInterview();
  }, []);

  // Timer Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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

  const handleSend = async () => {
    if (!inputText.trim() || !sessionId) return;
    
    const newMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await messageMutation.mutateAsync({
        session_id: sessionId,
        content: newMsg.text
      });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: res.message?.content || res.content || "Thank you for your response."
      }]);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Message Failed', text2: e.message });
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndSession = () => {
    if (sessionId) {
      router.push({ pathname: '/feedback', params: { sessionId } });
    } else {
      router.back();
    }
  };

  const TypingIndicator = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animateDot = (anim: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              delay: delay,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.delay(400) // pause between loops
          ])
        ).start();
      };

      animateDot(dot1, 0);
      animateDot(dot2, 200);
      animateDot(dot3, 400);
    }, []);

    return (
      <View style={styles.messageRowLeft}>
        <View style={styles.messageMetaLeft}>
          <View style={[styles.botIconWrapper, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1 }]}>
            <MaterialCommunityIcons name="robot" size={12} color={colors.primary} />
          </View>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Analyzing Response...</Text>
        </View>
        <View style={[styles.typingBubble, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, transform: [{ scale: dot1 }] }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, transform: [{ scale: dot2 }] }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: colors.primary, transform: [{ scale: dot3 }] }]} />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.bgPrimary }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Background Auras */}
      <View style={[styles.auraTopLeft, { backgroundColor: `${colors.primary}0D` }]} pointerEvents="none" />
      <View style={[styles.auraBottomRight, { backgroundColor: `${colors.primary}0D` }]} pointerEvents="none" />

      {/* Chat Canvas */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroller}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderTitleArea}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Product Manager Role</Text>
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
            <TouchableOpacity style={[styles.endSessionBtn, { backgroundColor: colors.errorLight }]} onPress={handleEndSession}>
              <Text style={[styles.endSessionText, { color: colors.error }]}>END SESSION</Text>
            </TouchableOpacity>
          </View>
        </View>

        {messages.map((msg) => {
          const isAi = msg.role === 'ai';
          return (
            <View key={msg.id} style={isAi ? styles.messageRowLeft : styles.messageRowRight}>
              
              {/* Meta Row */}
              <View style={isAi ? styles.messageMetaLeft : styles.messageMetaRight}>
                {isAi ? (
                  <>
                    <View style={[styles.botIconWrapper, { backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1 }]}>
                      <MaterialCommunityIcons name="robot" size={12} color={colors.primary} />
                    </View>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Interview AI</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>You</Text>
                    <View style={[styles.userIconWrapper, { backgroundColor: colors.primary }]}>
                      <Ionicons name="person" size={12} color="#fff" />
                    </View>
                  </>
                )}
              </View>

              {/* Bubble */}
              <View style={[styles.bubble, isAi ? [styles.bubbleLeft, { backgroundColor: colors.bgCard, borderColor: colors.border }] : [styles.bubbleRight, { backgroundColor: colors.primary }]]}>
                {isAi ? (
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
                ) : (
                  <Text style={[styles.bubbleText, styles.bubbleTextRight, { color: '#fff' }]}>
                    {msg.text}
                  </Text>
                )}
              </View>

            </View>
          );
        })}

        {isTyping && <TypingIndicator />}
      </ScrollView>

      {/* Bottom Input Area */}
      <View style={[styles.inputArea, { backgroundColor: colors.bgPrimary, borderTopColor: colors.border }]}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={[styles.attachBtn, extractJdLoading && { opacity: 0.5 }]} onPress={handleAttachJdFile} disabled={extractJdLoading}>
            {extractJdLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="attach" size={16} color={colors.primary} />
                <Text style={styles.attachBtnText}>Attach file</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Type your response..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
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

            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={handleSend}>
              <Ionicons name="send" size={14} color="#fff" style={{ transform: [{ translateX: 1 }] }} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.poweredByText, { color: colors.textMuted }]}>POWERED BY INTERVIEWREADY AI</Text>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  auraTopLeft: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '60%',
    height: '40%',
    borderRadius: 9999,
  },
  auraBottomRight: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '60%',
    height: '40%',
    borderRadius: 9999,
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
  headerActions: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
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
  chatScroller: {
    flex: 1,
  },
  chatContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.xl,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  messageMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  messageMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  botIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    padding: Spacing.md,
    borderRadius: 16,
    ...Shadow.sm,
  },
  bubbleLeft: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
    ...Shadow.card,
  },
  bubbleText: {
    ...Typography.bodyLg,
    lineHeight: 28,
  },
  bubbleTextLeft: {
  },
  bubbleTextRight: {
  },
  typingBubble: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inputArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingRight: 56,
    ...Typography.bodyLg,
  },
  sendBtn: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  poweredByText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.sm,
    letterSpacing: 1,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107,70,254,0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  attachBtnText: {
    ...Typography.label,
    marginLeft: 4,
  },
});
