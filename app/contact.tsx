import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Linking from 'expo-linking';

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all fields before sending your message.',
      });
      return;
    }

    setSubmitted(true);
    Toast.show({
      type: 'success',
      text1: 'Message Received',
      text2: 'Thank you for reaching out! Our team will respond within 24-48 hours.',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + Spacing.sm : Spacing.md, borderBottomColor: colors.border }]}>
        <Pressable 
          style={[styles.backButton, { backgroundColor: `${colors.primary}15` }]} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Contact & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <Text style={[styles.pageHeading, { color: colors.textPrimary }]}>Get in Touch</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Have questions about your account, subscription, interview coaching, or partnership opportunities? We're here to help.
        </Text>

        {/* Contact Info Cards */}
        <View style={styles.cardsRow}>
          <Pressable 
            style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => Linking.openURL('mailto:support@appinterviewready.top')}
          >
            <View style={[styles.cardIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="mail-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Email Support</Text>
            <Text style={[styles.cardValue, { color: colors.primary }]}>support@appinterviewready.top</Text>
            <Text style={[styles.cardNote, { color: colors.textMuted }]}>Response within 24 hours</Text>
          </Pressable>

          <View style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[styles.cardIcon, { backgroundColor: `${colors.tertiary}15` }]}>
              <Ionicons name="time-outline" size={24} color={colors.tertiary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Office Hours</Text>
            <Text style={[styles.cardValue, { color: colors.textPrimary }]}>Mon – Fri: 9am – 6pm UTC</Text>
            <Text style={[styles.cardNote, { color: colors.textMuted }]}>Global online support</Text>
          </View>
        </View>

        {/* Contact Form */}
        <View style={[styles.formContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Send us a Message</Text>
          
          {submitted ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Message Sent!</Text>
              <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
                We've received your request and will get back to you at {email} as soon as possible.
              </Text>
              <Pressable 
                style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: Spacing.md }]}
                onPress={() => {
                  setSubmitted(false);
                  setName('');
                  setEmail('');
                  setMessage('');
                }}
              >
                <Text style={[styles.submitBtnText, { color: colors.textInverse }]}>Send Another Message</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Your Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Alex Smith"
                  placeholderTextColor={colors.textDisabled}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. alex@example.com"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Message</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.bgPrimary, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="How can we help you?"
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                />
              </View>

              <Pressable 
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                testID="submit-contact-btn"
                accessibilityRole="button"
                accessibilityLabel="Send Message"
              >
                <Text style={[styles.submitBtnText, { color: colors.textInverse }]}>Send Message</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.headingMd,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    padding: Spacing.lg,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  pageHeading: {
    ...Typography.headingLg,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  subheading: {
    ...Typography.bodyMd,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  cardsRow: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.bodyLg,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardValue: {
    ...Typography.bodyMd,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardNote: {
    ...Typography.bodySm,
  },
  formContainer: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  formTitle: {
    ...Typography.headingSm,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.bodySm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyMd,
  },
  textArea: {
    height: 120,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    ...Typography.bodyMd,
  },
  submitBtn: {
    height: 50,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  submitBtnText: {
    ...Typography.bodyMd,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    textAlign: 'center',
  },
  successTitle: {
    ...Typography.headingMd,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  successSubtitle: {
    ...Typography.bodyMd,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 22,
  },
});
