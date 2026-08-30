import { Pressable ,
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import React, { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { getUserFriendlyErrorMessage } from '../../src/lib/errorHandler';
import { PricingCard, PricingPlan } from '../../src/components/features/payments/PricingCard';
import { PaystackWebViewComponent, PaystackPaymentData } from '../../src/components/features/payments/PaystackWebView';
import { Spacing, Typography, Radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme';
import { CountryFlag } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { COUNTRIES, Country, getPaymentMethods } from '../../src/constants/countries';
import { useAuthStore } from '../../src/stores/auth-store';
import { useCredits } from '../../src/hooks/useCredits';
import * as Linking from 'expo-linking';

export type PaymentMode = 'USD' | 'KES';

export function toSmallestUnit(price: number, _currency?: string) {
  return Math.round(price * 100);
}

export const PRICING_PLANS: Record<PaymentMode, PricingPlan[]> = {
  USD: [
    {
      id: '1',
      planCode: 'PLN_0jg6lfy4ttw68tj',
      name: 'Premium',
      price: 5,
      currency: 'USD',
      interval: 'MONTHLY',
      features: [
        'Unlimited AI credits',
        'All 6 resume templates',
        'Unlimited resume generation',
        'Unlimited cover letters',
        'ATS scoring & optimization',
        'Mock interviews',
        'LinkedIn optimizer',
        'Priority support',
        'Export to PDF & DOCX',
        'Pay with Card',
      ],
    },
    {
      id: '2',
      planCode: 'PLN_2uob7t7251usns5',
      name: 'Premium',
      price: 50,
      currency: 'USD',
      interval: 'YEARLY',
      isPopular: true,
      savings: 'Save 2 months',
      features: [
        'Unlimited AI credits',
        'All 6 resume templates',
        'Unlimited resume generation',
        'Unlimited cover letters',
        'ATS scoring & optimization',
        'Mock interviews',
        'LinkedIn optimizer',
        'Priority support',
        'Export to PDF & DOCX',
        'Pay with Card',
        '2 months free ($10 savings)',
      ],
    },
    {
      id: '3',
      planCode: 'PLN_fkvsy1vdlgcnp0p',
      name: 'Premium Plus',
      price: 10,
      currency: 'USD',
      interval: 'MONTHLY',
      features: [
        'Everything in Premium',
        'Priority AI queue',
        'Advanced analytics',
        'Career insights dashboard',
        'Dedicated account manager',
        'Custom resume templates',
        'API access (coming soon)',
        'Pay with Card',
      ],
    },
    {
      id: '4',
      planCode: 'PLN_35hurhal4nnj3n9',
      name: 'Premium Plus',
      price: 100,
      currency: 'USD',
      interval: 'YEARLY',
      savings: 'Save 2 months',
      features: [
        'Everything in Premium',
        'Priority AI queue',
        'Advanced analytics',
        'Career insights dashboard',
        'Dedicated account manager',
        'Custom resume templates',
        'API access (coming soon)',
        'Pay with Card',
        '2 months free ($20 savings)',
      ],
    },
  ],
  KES: [
    {
      id: 'kes_starter_20',
      planCode: 'PLN_uv701tt6jdcw916',
      name: 'Starter Credit Pack',
      price: 50,
      currency: 'KES',
      interval: 'MONTHLY',
      customIntervalText: ' (20 Credits)',
      badge: 'QUICK APPLICATION PACK',
      features: [
        '20 AI Credits (instant top-up)',
        'Full Resume Generation & Tailoring',
        'Cover Letter Generator',
        'Job Match & ATS Scoring',
        'Mock Interview practice',
        'Pay with M-Pesa or Card',
      ],
    },
    {
      id: '1',
      planCode: 'PLN_7l2u2vr9r7844sz',
      name: 'Premium',
      price: 500,
      currency: 'KES',
      interval: 'MONTHLY',
      features: [
        'Unlimited AI credits',
        'All 6 resume templates',
        'Unlimited resume generation',
        'Unlimited cover letters',
        'ATS scoring & optimization',
        'Mock interviews',
        'LinkedIn optimizer',
        'Priority support',
        'Export to PDF & DOCX',
        'Pay with M-Pesa or Card',
      ],
    },
    {
      id: '2',
      planCode: 'PLN_rsxpxfrt13zyatj',
      name: 'Premium',
      price: 5000,
      currency: 'KES',
      interval: 'YEARLY',
      isPopular: true,
      savings: 'Save 2 months',
      features: [
        'Unlimited AI credits',
        'All 6 resume templates',
        'Unlimited resume generation',
        'Unlimited cover letters',
        'ATS scoring & optimization',
        'Mock interviews',
        'LinkedIn optimizer',
        'Priority support',
        'Export to PDF & DOCX',
        'Pay with M-Pesa or Card',
        '2 months free (KES 1,000 savings)',
      ],
    },
    {
      id: '3',
      planCode: 'PLN_gi0q6ldgfi6e0cd',
      name: 'Premium Plus',
      price: 1000,
      currency: 'KES',
      interval: 'MONTHLY',
      features: [
        'Everything in Premium',
        'Priority AI queue',
        'Advanced analytics',
        'Career insights dashboard',
        'Dedicated account manager',
        'Custom resume templates',
        'API access (coming soon)',
        'Pay with M-Pesa or Card',
      ],
    },
    {
      id: '4',
      planCode: 'PLN_qy200k9hkdd183d',
      name: 'Premium Plus',
      price: 10000,
      currency: 'KES',
      interval: 'YEARLY',
      savings: 'Save 2 months',
      features: [
        'Everything in Premium',
        'Priority AI queue',
        'Advanced analytics',
        'Career insights dashboard',
        'Dedicated account manager',
        'Custom resume templates',
        'API access (coming soon)',
        'Pay with M-Pesa or Card',
        '2 months free (KES 2,000 savings)',
      ],
    },
  ],
};

export default function PricingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { balance, isPro: creditIsPro, plan } = useCredits();
  const isPro = creditIsPro || user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro' || plan === 'PREMIUM' || plan === 'PREMIUM_PLUS';
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const isLowCredits = !isPro && balance !== null && balance.balance < 2;

  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to Kenya
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPaystackWebView, setShowPaystackWebView] = useState(false);
  const [paystackPaymentData, setPaystackPaymentData] = useState<PaystackPaymentData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedMode: PaymentMode = selectedCountry.isKenya ? 'KES' : 'USD';

  const paymentMethods = useMemo(
    () => getPaymentMethods(selectedCountry),
    [selectedCountry]
  );

  const currentPlans = useMemo(
    () => PRICING_PLANS[selectedMode],
    [selectedMode]
  );

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectPlan = (plan: PricingPlan) => {
    setSelectedPlan(plan);
  };

  const handleCountrySelect = React.useCallback((country: Country) => {
    setSelectedCountry(country);
    setSelectedPlan(null); // Reset plan selection when country changes
    setShowCountryPicker(false);
    setSearchQuery('');
  }, []);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Toast.show({ type: 'error', text1: 'Select a plan', text2: 'Please choose a subscription plan to continue.' });
      return;
    }

    setLoading(true);

    try {
      // Get current session
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError || !session) {
        Toast.show({ type: 'error', text1: 'Sign in required', text2: 'Please sign in to subscribe.' });
        router.push('/(auth)/login');
        return;
      }

      // Get Paystack public key
      const publicKey = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (!publicKey) {
        Toast.show({ type: 'error', text1: 'Configuration error', text2: 'Payment system not configured. Please contact support.' });
        return;
      }

      // Call payments-initialize Edge Function — this validates the plan, creates
      // the payment_transactions row server-side, and returns Paystack params.
      const initResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payments-initialize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            planCode: selectedPlan.planCode,
            callbackUrl: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/payment-callback`,
            countryCode: selectedCountry.isKenya ? selectedCountry.code : null,
          }),
        }
      );

      const initData = await initResponse.json();

      if (!initResponse.ok || !initData.success) {
        throw new Error(initData.error || 'Failed to initialize payment');
      }

      // Determine channels based on currency and country
      const channels: string[] = selectedPlan.currency === 'KES' && selectedCountry.isKenya
        ? ['mobile_money', 'card']
        : ['card'];

      // Convert amount to Paystack smallest currency unit (cents / kobo)
      const amount = Math.round(selectedPlan.price * 100);

      // Open Paystack WebView with the reference created server-side
      const paymentData: PaystackPaymentData = {
        email: session.user.email!,
        amount,
        reference: initData.data.reference,
        publicKey,
        currency: selectedPlan.currency as 'USD' | 'KES' | 'NGN',
        channels,
        metadata: {
          user_id: session.user.id,
          plan_code: selectedPlan.planCode,
          plan_type: selectedPlan.name.includes('Plus')
            ? 'PREMIUM_PLUS'
            : selectedPlan.planCode === 'PLN_uv701tt6jdcw916'
            ? 'FREE'
            : 'PREMIUM',
          plan_interval: selectedPlan.interval,
        },
      };

      setPaystackPaymentData(paymentData);
      setShowPaystackWebView(true);
    } catch (error) {
      console.error('Payment initialization error:', error);
      Toast.show({
        type: 'error',
        text1: 'Payment Error',
        text2: getUserFriendlyErrorMessage(error, 'Failed to initialize payment. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackSuccess = async (transactionRef: any) => {
    const ref = transactionRef?.reference || transactionRef?.transaction || transactionRef?.trxref || paystackPaymentData?.reference;
    setShowPaystackWebView(false);
    setPaystackPaymentData(null);
    
    if (ref) {
      router.push({
        pathname: '/payment/callback' as any,
        params: { reference: ref },
      });
    }
  };

  const handlePaystackCancel = async () => {
    const currentRef = paystackPaymentData?.reference;
    setShowPaystackWebView(false);
    setPaystackPaymentData(null);

    if (currentRef) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Check with backend if the payment was actually approved (e.g. M-Pesa push completed on phone)
          const verifyRes = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payments-verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
            },
            body: JSON.stringify({ reference: currentRef }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success && verifyData.data?.status === 'success') {
            router.push({
              pathname: '/payment/callback' as any,
              params: { reference: currentRef },
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Payment verify on close note:', err);
      }

      await supabase
        .from('payment_transactions')
        .update({ status: 'abandoned' })
        .eq('reference', currentRef);
    }

    Toast.show({ type: 'info', text1: 'Payment Cancelled', text2: 'No charge was confirmed.' });
  };

  const handlePaystackError = async (error: any) => {
    const currentRef = paystackPaymentData?.reference;
    setShowPaystackWebView(false);
    setPaystackPaymentData(null);

    if (currentRef) {
      await supabase
        .from('payment_transactions')
        .update({ status: 'failed' })
        .eq('reference', currentRef);
    }
    Toast.show({ type: 'error', text1: 'Payment Failed', text2: 'Please try again or use a different card.' });
  };

  const renderCountryItem = React.useCallback(({ item }: { item: any }) => (
    <Pressable
      style={[
        styles.countryItem,
        selectedCountry.code === item.code && styles.countryItemSelected,
      ]}
      onPress={() => handleCountrySelect(item)}
    >
      <View style={styles.countryItemFlagWrapper}>
        <CountryFlag countryCode={item.code} fallbackEmoji={item.flag} size={28} />
      </View>
      <View style={styles.countryItemInfo}>
        <Text style={styles.countryItemName}>{item.name}</Text>
        <Text style={styles.countryItemCurrency}>
          {item.currency} • {getPaymentMethods(item).join(', ')}
        </Text>
      </View>
      {selectedCountry.code === item.code && (
        <Text style={styles.countryItemCheck}>✓</Text>
      )}
    </Pressable>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [selectedCountry.code, handleCountrySelect]);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Unlock unlimited AI-powered career tools and land your dream job faster
        </Text>
      </View>

      {isLowCredits && (
        <View style={styles.lowCreditBanner}>
          <View style={styles.lowCreditBannerIcon}>
            <Ionicons name="flash" size={22} color="#F59E0B" />
          </View>
          <View style={styles.lowCreditBannerContent}>
            <Text style={styles.lowCreditBannerTitle}>Low Credits Warning</Text>
            <Text style={styles.lowCreditBannerText}>
              You have less than 2 AI credits remaining. Choose a subscription plan below to unlock unlimited AI generations, resume tailoring, and interview practice.
            </Text>
          </View>
        </View>
      )}

      {/* Country Selector */}
      <View style={styles.countrySelector}>
        <Text style={styles.countrySelectorLabel}>Select Your Country:</Text>
        <Pressable
          style={styles.countryButton}
          onPress={() => setShowCountryPicker(true)}
        >
          <View style={styles.countryFlagWrapper}>
            <CountryFlag countryCode={selectedCountry.code} fallbackEmoji={selectedCountry.flag} size={36} />
          </View>
          <View style={styles.countryInfo}>
            <Text style={styles.countryName}>{selectedCountry.name}</Text>
            <Text style={styles.countryCurrency}>
              Pay in {selectedCountry.currency}
            </Text>
          </View>
          <Text style={styles.countryChevron}>›</Text>
        </Pressable>

        {/* Payment Methods */}
        <View style={styles.paymentMethods}>
          <Text style={styles.paymentMethodsLabel}>Secure payment with:</Text>
          <View style={styles.paymentMethodsList}>
            {paymentMethods.map((method, index) => (
              <View key={index} style={styles.paymentMethodBadge}>
                <Text style={styles.paymentMethodText}>{method}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <Pressable
                onPress={() => setShowCountryPicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={renderCountryItem}
              style={styles.countryList}
            />
          </View>
        </View>
      </Modal>

      {!isPro && (
        <View style={styles.freePlanCard}>
          <Text style={styles.freePlanTitle}>Current Plan: Free</Text>
          <Text style={styles.freePlanText}>
            • 10 AI credits per month{'\n'}
            • 2 basic resume templates{'\n'}
            • Limited features
          </Text>
        </View>
      )}

      <View style={styles.plansContainer}>
        {currentPlans.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
          return (
            <View key={plan.id} style={{ marginBottom: Spacing.sm }}>
              <PricingCard
                plan={plan}
                onSelect={handleSelectPlan}
                isSelected={isSelected}
                disabled={loading || showPaystackWebView}
              />
              {isSelected && (
                <View style={styles.inlineSubscribeContainer}>
                  <Pressable
                    style={[styles.subscribeButton, (loading || showPaystackWebView) && styles.subscribeButtonDisabled]}
                    onPress={handleSubscribe}
                    disabled={loading || showPaystackWebView}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={styles.subscribeButtonText}>
                        {plan.planCode === 'PLN_uv701tt6jdcw916' ? 'Buy 20 Credits for KES 50' : `Subscribe to ${plan.name}`}
                      </Text>
                    )}
                  </Pressable>
                  <Text style={styles.footerTextInline}>
                    By subscribing, you agree to our{' '}
                    <Text
                      style={{ color: colors.primary, fontWeight: '600' }}
                      onPress={() => Linking.openURL('https://appinterviewready.top/terms')}
                    >
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text
                      style={{ color: colors.primary, fontWeight: '600' }}
                      onPress={() => Linking.openURL('https://appinterviewready.top/privacy')}
                    >
                      Privacy Policy
                    </Text>
                    . Your subscription will auto-renew unless cancelled.
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Paystack WebView Modal */}
      <Modal
        visible={showPaystackWebView}
        animationType="slide"
        transparent={false}
        onRequestClose={handlePaystackCancel}
      >
        <View style={styles.webViewModalContainer}>
          {paystackPaymentData && (
            <PaystackWebViewComponent
              paymentData={paystackPaymentData}
              onSuccess={handlePaystackSuccess}
              onCancel={handlePaystackCancel}
              onError={handlePaystackError}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  lowCreditBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  lowCreditBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  lowCreditBannerContent: {
    flex: 1,
  },
  lowCreditBannerTitle: {
    ...Typography.subtitle1,
    color: '#92400E',
    marginBottom: 4,
  },
  lowCreditBannerText: {
    ...Typography.bodySm,
    color: '#B45309',
    lineHeight: 18,
  },
  title: {
    ...Typography.displayLg,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLg,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 400,
  },
  countrySelector: {
    backgroundColor: colors.bgCard,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countrySelectorLabel: {
    ...Typography.headingMd,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: Spacing.lg,
  },
  countryFlagWrapper: {
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    ...Typography.bodyLg,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  countryCurrency: {
    ...Typography.bodySm,
    color: colors.textMuted,
  },
  countryChevron: {
    ...Typography.displayMd,
    color: colors.textMuted,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
    paddingBottom: 120,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...Typography.headingLg,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  modalCloseButton: {
    padding: Spacing.sm,
  },
  modalCloseText: {
    ...Typography.headingLg,
    color: colors.textMuted,
    fontWeight: '300',
  },
  searchInput: {
    backgroundColor: colors.bgSecondary,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Typography.bodyMd,
    color: colors.textPrimary,
  },
  countryList: {
    paddingHorizontal: Spacing.lg,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  countryItemSelected: {
    backgroundColor: colors.violetLight,
  },
  countryItemFlagWrapper: {
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryItemInfo: {
    flex: 1,
  },
  countryItemName: {
    ...Typography.bodyMd,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  countryItemCurrency: {
    ...Typography.bodySm,
    color: colors.textMuted,
  },
  countryItemCheck: {
    ...Typography.headingMd,
    color: colors.violet,
    fontWeight: '700',
  },
  paymentMethods: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentMethodsLabel: {
    ...Typography.bodyMd,
    color: colors.textMuted,
    marginBottom: Spacing.sm,
  },
  paymentMethodsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  paymentMethodBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  paymentMethodText: {
    ...Typography.bodySm,
    color: colors.success,
    fontWeight: '600',
  },
  freePlanCard: {
    backgroundColor: colors.bgCard,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freePlanTitle: {
    ...Typography.headingMd,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  freePlanText: {
    ...Typography.bodyMd,
    color: colors.textBody,
    lineHeight: 24,
  },
  plansContainer: {
    marginBottom: Spacing.xl,
  },
  footer: {
    marginTop: Spacing.lg,
  },
  footerText: {
    ...Typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  inlineSubscribeContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  webViewModalContainer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  footerTextInline: {
    ...Typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  subscribeButton: {
    backgroundColor: colors.violet,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    ...Typography.headingMd,
    color: colors.textInverse,
    fontWeight: '700',
  },
});