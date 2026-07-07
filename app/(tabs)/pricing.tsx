import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { PricingCard, PricingPlan } from '../../src/components/features/payments/PricingCard';
import { Spacing, Typography, Radius } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme';
import { supabase } from '../../src/lib/supabase';
import { COUNTRIES, Country, getPaymentMethods } from '../../src/constants/countries';

type PaymentMode = 'USD' | 'KES';

const PRICING_PLANS: Record<PaymentMode, PricingPlan[]> = {
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
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to Kenya
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
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

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setSelectedPlan(null); // Reset plan selection when country changes
    setShowCountryPicker(false);
    setSearchQuery('');
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Error', 'Please sign in to continue');
        router.push('/(auth)/login');
        return;
      }

      // Get auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        router.push('/(auth)/login');
        return;
      }

      // Initialize payment
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payments-initialize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            planCode: selectedPlan.planCode,
            callbackUrl: 'interviewready://payment/callback',
            countryCode: selectedCountry.isKenya ? selectedCountry.code : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      if (!data.success || !data.data.authorization_url) {
        throw new Error('Invalid payment response');
      }

      // Open Paystack payment page and wait for redirect back to the app
      const callbackDeepLink = 'interviewready://payment/callback';
      const result = await WebBrowser.openAuthSessionAsync(
        data.data.authorization_url,
        callbackDeepLink
      );

      if (result.type === 'success' && result.url) {
        // Extract reference from the callback URL
        // Paystack appends ?reference=... or we use the reference we generated
        const callbackUrl = new URL(result.url);
        const returnedReference = callbackUrl.searchParams.get('reference') || data.data.reference;

        router.push({
          pathname: '/payment/callback' as any,
          params: { reference: returnedReference },
        });
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User closed the browser without completing payment — do nothing
        Alert.alert('Payment Cancelled', 'You closed the payment page. No charge was made.');
      } else {
        throw new Error('Payment window closed unexpectedly');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      Alert.alert(
        'Payment Error',
        error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Unlock unlimited AI-powered career tools and land your dream job faster
        </Text>
      </View>

      {/* Country Selector */}
      <View style={styles.countrySelector}>
        <Text style={styles.countrySelectorLabel}>Select Your Country:</Text>
        <TouchableOpacity
          style={styles.countryButton}
          onPress={() => setShowCountryPicker(true)}
        >
          <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
          <View style={styles.countryInfo}>
            <Text style={styles.countryName}>{selectedCountry.name}</Text>
            <Text style={styles.countryCurrency}>
              Pay in {selectedCountry.currency}
            </Text>
          </View>
          <Text style={styles.countryChevron}>›</Text>
        </TouchableOpacity>

        {/* Payment Methods */}
        <View style={styles.paymentMethods}>
          <Text style={styles.paymentMethodsLabel}>Available payment methods:</Text>
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
              <TouchableOpacity
                onPress={() => setShowCountryPicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountry.code === item.code && styles.countryItemSelected,
                  ]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <View style={styles.countryItemInfo}>
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCurrency}>
                      {item.currency} • {getPaymentMethods(item).join(', ')}
                    </Text>
                  </View>
                  {selectedCountry.code === item.code && (
                    <Text style={styles.countryItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.countryList}
            />
          </View>
        </View>
      </Modal>

      <View style={styles.freePlanCard}>
        <Text style={styles.freePlanTitle}>Current Plan: Free</Text>
        <Text style={styles.freePlanText}>
          • 10 AI credits per month{'\n'}
          • 2 basic resume templates{'\n'}
          • Limited features
        </Text>
      </View>

      <View style={styles.plansContainer}>
        {currentPlans.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
          return (
            <View key={plan.id} style={{ marginBottom: Spacing.sm }}>
              <PricingCard
                plan={plan}
                onSelect={handleSelectPlan}
                isSelected={isSelected}
                disabled={loading}
              />
              {isSelected && (
                <View style={styles.inlineSubscribeContainer}>
                  <TouchableOpacity
                    style={[styles.subscribeButton, loading && styles.subscribeButtonDisabled]}
                    onPress={handleSubscribe}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={styles.subscribeButtonText}>
                        Subscribe to {plan.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.footerTextInline}>
                    By subscribing, you agree to our Terms of Service and Privacy Policy.
                    Your subscription will auto-renew unless cancelled.
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
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
  countryFlag: {
    fontSize: 32,
    marginRight: Spacing.md,
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
  countryItemFlag: {
    fontSize: 28,
    marginRight: Spacing.md,
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