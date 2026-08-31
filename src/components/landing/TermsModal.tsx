import React from 'react';
import { View, Text, Modal, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius } from '../../theme';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TermsModal({ visible, onClose }: TermsModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Terms of Service</Text>
              <Text style={styles.headerSubtitle}>Last updated: July 19, 2026</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close Terms of Service">
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.paragraph}>
              Please read these terms and conditions carefully before using Our Service.
            </Text>

            <Text style={styles.sectionHeading}>1. Agreement to Terms</Text>
            <Text style={styles.paragraph}>
              By accessing or using the Service, You agree to be bound by these Terms. If You disagree with any part of these Terms, You may not access the Service.
            </Text>

            <Text style={styles.sectionHeading}>2. AI Career Tools & User Content</Text>
            <Text style={styles.paragraph}>
              Interview Ready provides AI-powered career tools (resume generation, cover letters, mock interview simulations, and job analysis). You retain ownership of all resumes, work experiences, and text you input. You are responsible for ensuring the accuracy of your career details.
            </Text>

            <Text style={styles.sectionHeading}>3. Subscriptions & AI Credits</Text>
            <Text style={styles.paragraph}>
              Certain features may require AI credits or a subscription plan. Paid credits and subscription fees are non-refundable except as required by applicable law or our explicit guarantee terms.
            </Text>

            <Text style={styles.sectionHeading}>4. Acceptable Use</Text>
            <Text style={styles.paragraph}>
              You agree not to misuse the Service, reverse-engineer proprietary algorithms, or use the service for unauthorized mass automated generation or spamming.
            </Text>

            <Text style={styles.sectionHeading}>5. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about these Terms of Service, You can contact us by email: info@appinterviewready.top
            </Text>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Pressable style={styles.dismissBtn} onPress={onClose}>
              <Text style={styles.dismissBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 12,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
  },
  dismissBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1A4F8A',
    borderRadius: 10,
  },
  dismissBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
