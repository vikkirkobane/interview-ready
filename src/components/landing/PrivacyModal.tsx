import React from 'react';
import { View, Text, Modal, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius } from '../../theme';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ visible, onClose }: PrivacyModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Privacy Policy</Text>
              <Text style={styles.headerSubtitle}>Last updated: July 19, 2026</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close Privacy Policy">
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.paragraph}>
              This Privacy Policy describes Our policies and procedures on the collection, use, and disclosure of Your information when You use Interview Ready and tells You about Your privacy rights and how the law protects You.
            </Text>
            <Text style={styles.paragraph}>
              We use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.
            </Text>

            <Text style={styles.sectionHeading}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
              While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You, including your email address, full name, phone number, resume details, and professional job preferences.
            </Text>

            <Text style={styles.sectionHeading}>2. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              The Company may use Personal Data to generate tailored resumes, analyze job postings, deliver mock interview coaching, maintain your user account, contact you regarding updates, and process secure transactions.
            </Text>

            <Text style={styles.sectionHeading}>3. Data Security & Storage</Text>
            <Text style={styles.paragraph}>
              The security of Your Personal Data is important to Us. We use industry-standard encryption, Row Level Security (RLS), and secure cloud infrastructure. We do not sell your personal data to third parties.
            </Text>

            <Text style={styles.sectionHeading}>4. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions about this Privacy Policy, You can contact us by email: info@appinterviewready.top
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
