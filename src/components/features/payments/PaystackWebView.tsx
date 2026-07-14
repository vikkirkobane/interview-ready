import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Paystack as PaystackWebView } from 'react-native-paystack-webview';
import { useTheme } from '../../../theme';

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

export const PaystackWebViewComponent: React.FC<PaystackWebViewProps> = ({
  paymentData,
  onSuccess,
  onCancel,
  onError,
}) => {
  const paystackWebViewRef = useRef<any>(null);
  const { colors } = useTheme();

  const handlePaymentSuccess = (res: any) => {
    console.log('[Paystack] Payment success:', res);
    onSuccess(res);
  };

  const handlePaymentCancel = () => {
    console.log('[Paystack] Payment cancelled');
    onCancel();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePaymentError = (error: any) => {
    console.error('[Paystack] Payment error:', error);
    onError(error);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <PaystackWebView
        ref={paystackWebViewRef}
        paystackKey={paymentData.publicKey}
        amount={paymentData.amount}
        billingEmail={paymentData.email}
        currency={paymentData.currency}
        channels={(paymentData.channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money']) as any}
        refNumber={paymentData.reference}
        billingName="Interview Ready User"
        onCancel={handlePaymentCancel}
        onSuccess={handlePaymentSuccess}
        autoStart={true}
        activityIndicatorColor={colors.primary}
        // @ts-ignore - types are missing in older version 4.6.7
        SafeAreaViewContainer={{ backgroundColor: colors.bgPrimary }}
        // @ts-ignore
        modalProps={{
          animationType: 'slide',
          transparent: false,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});