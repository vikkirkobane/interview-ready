import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme, Typography, Spacing } from '../../../theme';

export interface PaystackPaymentData {
  email: string;
  amount: number; // In kobo/cents
  reference: string;
  publicKey: string;
  currency: 'NGN' | 'USD' | 'KES';
  channels?: string[];
  metadata?: Record<string, any>;
}

interface PaystackWebViewProps {
  paymentData: PaystackPaymentData;
  onSuccess: (transactionRef: any) => void;
  onCancel: () => void;
  onError: (error: any) => void;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: any) => {
        openIframe: () => void;
      };
    };
  }
}

/**
 * High-performance Web implementation of Paystack Checkout.
 * Uses the official Paystack Inline Popup on Web browsers.
 */
export const PaystackWebViewComponent: React.FC<PaystackWebViewProps> = ({
  paymentData,
  onSuccess,
  onCancel,
  onError,
}) => {
  const { colors } = useTheme();

  useEffect(() => {
    let isCancelled = false;

    const loadAndOpenPaystack = () => {
      if (typeof window === 'undefined') return;

      const triggerPopup = () => {
        if (!window.PaystackPop) {
          onError(new Error('Paystack SDK failed to load.'));
          return;
        }

        try {
          let hasTriggeredSuccess = false;

          const handler = window.PaystackPop.setup({
            key: paymentData.publicKey,
            email: paymentData.email,
            amount: paymentData.amount,
            currency: paymentData.currency,
            ref: paymentData.reference,
            channels: paymentData.channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money'],
            metadata: paymentData.metadata || {},
            callback: (response: any) => {
              console.log('[Paystack Web] Payment success:', response);
              hasTriggeredSuccess = true;
              onSuccess(response || { reference: paymentData.reference });
            },
            onClose: () => {
              console.log('[Paystack Web] Payment modal closed. hasTriggeredSuccess:', hasTriggeredSuccess);
              if (!hasTriggeredSuccess) {
                onCancel();
              }
            },
          });

          handler.openIframe();
        } catch (err: any) {
          console.error('[Paystack Web] Popup error:', err);
          onError(err);
        }
      };

      if (window.PaystackPop) {
        triggerPopup();
      } else if (typeof document !== 'undefined') {
        // Load Paystack Inline script dynamically
        const existingScript = document.getElementById('paystack-inline-js');
        if (existingScript) {
          existingScript.addEventListener('load', triggerPopup);
          return;
        }

        const script = document.createElement('script');
        script.id = 'paystack-inline-js';
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload = () => {
          if (!isCancelled) {
            triggerPopup();
          }
        };
        script.onerror = () => {
          if (!isCancelled) {
            onError(new Error('Failed to load Paystack payment script.'));
          }
        };
        document.body.appendChild(script);
      }
    };

    loadAndOpenPaystack();

    return () => {
      isCancelled = true;
    };
  }, [paymentData, onSuccess, onCancel, onError]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Opening secure Paystack checkout...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.bodyMd,
    marginTop: Spacing.md,
  },
});
