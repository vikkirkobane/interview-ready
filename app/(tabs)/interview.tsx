import React, { useState, useEffect, useRef } from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, TextInput, Platform, Animated, Easing, KeyboardAvoidingView, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useStartInterviewMutation, useInterviewMessageMutation, useExtractJdMutation } from '../../src/hooks/useApi';
import { useAuthStore } from '../../src/stores/auth-store';


import { handleApiError } from '../../src/lib/errorHandler';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useFilePicker } from '../../src/hooks/useFilePicker';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '../../src/stores/ui-store';
import { useInterstitialAd } from '../../src/lib/useInterstitialAd';

const TypingIndicator = ({ colors }: { colors: any }) => {
  const [dot1] = useState(() => new Animated.Value(0));
  const [dot2] = useState(() => new Animated.Value(0));
  const [dot3] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      dot1.setValue(1);
      dot2.setValue(1);
      dot3.setValue(1);
      return;
    }
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, {
          toValue: 1,
          duration: 400,
          delay: 0,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dot1, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(400)
      ])
    );
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.timing(dot2, {
          toValue: 1,
          duration: 400,
          delay: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dot2, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(400)
      ])
    );
    const anim3 = Animated.loop(
      Animated.sequence([
        Animated.timing(dot3, {
          toValue: 1,
          duration: 400,
          delay: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dot3, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(400)
      ])
    );
    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

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

// Mock Message Data
type Message = {
  id: string;
  role: 'ai' | 'user';
  text: string;
};

export default function InterviewScreen() {
  const router = useRouter();
  const { role = 'General', type = 'Behavioral', difficulty = 'Intermediate', jobDescription = '', jobUrl = '' } = useLocalSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jdFileText, setJdFileText] = useState('');
  const [jdFileName, setJdFileName] = useState<string | null>(null);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const startMutation = useStartInterviewMutation();
  const messageMutation = useInterviewMessageMutation();
  const extractJd = useExtractJdMutation();

  const { showAd: showInterstitialAd, loaded: interstitialLoaded } = useInterstitialAd();
  const { incrementInterstitialCount, resetInterstitialCount } = useUIStore();

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

  const handleRemoveAttachedJd = () => {
    setJdFileText('');
    setJdFileName(null);
  };

  const messageCounter = useRef(0);

  const handleSend = async () => {
    if (!inputText.trim() || !sessionId) return;

    messageCounter.current += 1;
    const newMsg: Message = { id: `msg-${messageCounter.current}-${Date.now()}`, role: 'user', text: inputText };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await messageMutation.mutateAsync({
        session_id: sessionId,
        content: newMsg.text
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
      handleApiError(e.message, { fallbackTitle: 'Message Failed' });
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
            onPress: () => router.push({ pathname: '/feedback', params: { sessionId } }),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgPrimary }]}>
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
            <Pressable style={[styles.endSessionBtn, { backgroundColor: colors.errorLight }]} onPress={handleEndSession}>
              <Text style={[styles.endSessionText, { color: colors.error }]}>END SESSION</Text>
            </Pressable>
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

        {isTyping && <TypingIndicator colors={colors} />}
        </ScrollView>

      {/* Bottom Input Area */}
      <View style={[
        styles.inputArea, 
        { 
          backgroundColor: colors.bgPrimary, 
          borderTopColor: colors.border,
          paddingBottom: keyboardVisible ? (Platform.OS === 'ios' ? Spacing.sm : Spacing.lg) : 0, 
        }
      ]}>
        <View style={[styles.inputContainer, { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.xs }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary, paddingLeft: 24 }]}
              placeholder="Type your response..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <Pressable style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={handleSend}>
              <Ionicons name="send" size={14} color="#fff" style={{ transform: [{ translateX: 1 }] }} />
            </Pressable>
          </View>
          
          <View style={styles.inputActions}>
            <Pressable style={styles.attachBtn} onPress={handleAttachJdFile} disabled={extractJdLoading}>
              {extractJdLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="attach" size={20} color={colors.textMuted} />
              )}
            </Pressable>

            {/* Attached File Info */}
            {jdFileName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.sm }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{jdFileName}</Text>
                <Pressable onPress={handleRemoveAttachedJd} style={{ marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.error} />
                </Pressable>
              </View>
            )}

            {/* Attach JD File Loading State */}
            {extractJdLoading && (
              <View style={{ marginLeft: Spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Extracting text...</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.poweredByText, { color: colors.textMuted }]}>POWERED BY INTERVIEWREADY AI</Text>
      </View>

      </KeyboardAvoidingView>

      {!keyboardVisible && (
        <View style={{ height: bottomNavPadding }} />
      )}
    </View>
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
    paddingLeft: 46,
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
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
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
  attachBtnText: {
    ...Typography.label,
    marginLeft: 4,
  },
});
