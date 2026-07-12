import { Pressable } from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography } from '../../src/theme/tokens';
import { supabase } from '../../src/lib/supabase';

type PaymentStatus = 'verifying' | 'success' | 'failed' | 'error';

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reference = params.reference as string;

  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (reference) {
      verifyPayment(reference);
    } else {
      setStatus('error');
      setMessage('Invalid payment reference');
    }
  }, [reference]);

  const verifyPayment = async (ref: string) => {
    try {
      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStatus('error');
        setMessage('Session expired. Please sign in again.');
        return;
      }

      // Verify payment with backend
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payments-verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reference: ref }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      if (data.success && data.data.status === 'success') {
        setStatus('success');
        setMessage('Payment successful! Your subscription is now active.');
        setPaymentDetails(data.data);
      } else {
        setStatus('failed');
        setMessage(
          data.data.gateway_response || 'Payment was not successful. Please try again.'
        );
        setPaymentDetails(data.data);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to verify payment. Please contact support.'
      );
    }
  };

  const handleContinue = () => {
    if (status === 'success') {
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const renderIcon = () => {
    switch (status) {
      case 'verifying':
        return <ActivityIndicator size="large" color={Colors.violet} />;
      case 'success':
        return <Text style={styles.iconSuccess}>✓</Text>;
      case 'failed':
      case 'error':
        return <Text style={styles.iconError}>✕</Text>;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return Colors.success;
      case 'failed':
      case 'error':
        return Colors.error;
      default:
        return Colors.violet;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { borderColor: getStatusColor() }]}>
          {renderIcon()}
        </View>

        <Text style={styles.title}>
          {status === 'verifying' && 'Verifying Payment'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'failed' && 'Payment Failed'}
          {status === 'error' && 'Verification Error'}
        </Text>

        <Text style={styles.message}>{message}</Text>

        {paymentDetails && (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference:</Text>
              <Text style={styles.detailValue}>{paymentDetails.reference}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>
                {paymentDetails.currency} {paymentDetails.amount?.toLocaleString()}
              </Text>
            </View>
            {paymentDetails.paid_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(paymentDetails.paid_at).toLocaleString()}
                </Text>
              </View>
            )}
            {paymentDetails.channel && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Channel:</Text>
                <Text style={styles.detailValue}>{paymentDetails.channel}</Text>
              </View>
            )}
          </View>
        )}

        {status !== 'verifying' && (
          <Pressable
            style={[styles.button, { backgroundColor: getStatusColor() }]}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>
              {status === 'success' ? 'Continue to Dashboard' : 'Try Again'}
            </Text>
          </Pressable>
        )}

        {status === 'failed' && (
          <Pressable
            style={styles.supportButton}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconSuccess: {
    fontSize: 64,
    color: Colors.success,
    fontWeight: '700',
  },
  iconError: {
    fontSize: 64,
    color: Colors.error,
    fontWeight: '700',
  },
  title: {
    ...Typography.displayMd,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    ...Typography.bodyLg,
    color: Colors.textBody,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    maxWidth: 400,
  },
  detailsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    ...Typography.bodyMd,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    ...Typography.bodyMd,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  button: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  buttonText: {
    ...Typography.headingMd,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  supportButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  supportButtonText: {
    ...Typography.bodyMd,
    color: Colors.violet,
    fontWeight: '600',
  },
});
