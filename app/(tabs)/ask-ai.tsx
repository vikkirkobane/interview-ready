import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Typography, Spacing, Radius, useTheme } from '../../src/theme';
import { useAnswerQuestionMutation } from '../../src/hooks/useApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

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
  const [contextSource, setContextSource] = useState<'profile' | 'resume'>('profile');

  const answerQuestionMutation = useAnswerQuestionMutation();

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await answerQuestionMutation.mutateAsync({
        question: userMsg.text,
        context_source: contextSource,
      });

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: response.answer || "I generated an answer but it was empty."
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: `Sorry, I failed to generate an answer. Error: ${error.message}` }
      ]);
    } finally {
      setIsTyping(false);
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
              heading3: { ...Typography.headingSm, color: colors.textPrimary, marginVertical: Spacing.xs },
              paragraph: { ...Typography.bodyMd, color: colors.textPrimary, marginVertical: Spacing.xs },
              list_item: { ...Typography.bodyMd, color: colors.textPrimary },
              link: { color: colors.primary, textDecorationLine: 'underline' },
              strong: { fontWeight: '700' },
            }}>
              {msg.text}
            </Markdown>
          )}
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
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.bgSecondary }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        
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
      
      <View style={[styles.inputArea, { backgroundColor: colors.bgPrimary, borderTopColor: colors.border }]}>
        <View style={styles.contextToggleRow}>
          <Text style={[styles.contextLabel, { color: colors.textMuted }]}>Using Context:</Text>
          <TouchableOpacity 
             style={[styles.contextChip, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, contextSource === 'profile' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
             onPress={() => setContextSource('profile')}
          >
             <Ionicons name="person-circle" size={16} color={contextSource === 'profile' ? '#fff' : colors.textMuted} />
             <Text style={[styles.contextChipText, { color: colors.textMuted }, contextSource === 'profile' && styles.contextChipTextActive]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
             style={[styles.contextChip, { backgroundColor: colors.bgSecondary, borderColor: colors.border }, contextSource === 'resume' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
             onPress={() => setContextSource('resume')}
          >
             <Ionicons name="document-text" size={16} color={contextSource === 'resume' ? '#fff' : colors.textMuted} />
             <Text style={[styles.contextChipText, { color: colors.textMuted }, contextSource === 'resume' && styles.contextChipTextActive]}>Resume</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputRow}>
          <TextInput 
             style={[styles.textInput, { backgroundColor: colors.bgSecondary, borderColor: colors.border, color: colors.textPrimary }]}
             placeholder="Paste application question here..."
             placeholderTextColor={colors.textMuted}
             value={inputText}
             onChangeText={setInputText}
             multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: colors.primary }, (!inputText.trim() || isTyping) && { opacity: 0.5 }]} 
            onPress={handleSend} 
            disabled={!inputText.trim() || isTyping}
          >
             <Ionicons name="send" size={18} color="#fff" style={{ transform: [{ translateX: 2 }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    maxWidth: '75%', 
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
    paddingTop: Spacing.sm, 
    borderTopWidth: 1, 
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  contextToggleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Spacing.sm, 
    gap: 8 
  },
  contextLabel: { 
    ...Typography.label, 
  },
  contextChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    borderWidth: 1, 
  },
  contextChipText: { 
    ...Typography.label, 
  },
  contextChipTextActive: { 
    color: '#fff' 
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: Spacing.sm 
  },
  textInput: { 
    flex: 1, 
    minHeight: 44, 
    maxHeight: 120, 
    borderRadius: Radius.md, 
    borderWidth: 1, 
    paddingHorizontal: Spacing.md, 
    paddingTop: 12, 
    paddingBottom: 12, 
    ...Typography.bodyLg, 
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: Radius.md, 
    alignItems: 'center', 
    justifyContent: 'center' 
  }
});
