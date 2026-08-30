import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Card, Badge, Button } from '../src/components/ui';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/auth-store';
import { useCredits } from '../src/hooks/useCredits';
import * as Linking from 'expo-linking';

interface PaymentTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed' | 'abandoned';
  payment_provider: string;
  payment_method: string | null;
  country_code: string | null;
  paid_at: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export default function BillingHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const { balance, plan, isPro, refreshBalance } = useCredits();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'other'>('all');

  const fetchTransactions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || user?.id;

      if (!currentUserId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.warn('Error fetching payment transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTransactions();

    // Listen for realtime transaction additions
    const { data: { session } } = { data: { session: supabase.auth.getSession() } };
    let channel: any = null;

    const setupRealtime = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (!activeSession?.user?.id) return;

      channel = supabase
        .channel(`billing-history-${activeSession.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payment_transactions',
            filter: `user_id=eq.${activeSession.user.id}`,
          },
          () => {
            fetchTransactions();
            refreshBalance();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchTransactions, refreshBalance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTransactions(), refreshBalance()]);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'success') return tx.status === 'success';
    if (filter === 'other') return tx.status !== 'success';
    return true;
  });

  const totalSuccessfulSpend = transactions
    .filter((tx) => tx.status === 'success')
    .reduce((acc, tx) => {
      acc[tx.currency] = (acc[tx.currency] || 0) + Number(tx.amount);
      return acc;
    }, {} as Record<string, number>);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Pending';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getPlanDescription = (tx: PaymentTransaction) => {
    const metaPlanName = tx.metadata?.plan_name;
    if (metaPlanName) return metaPlanName;

    const planCode = tx.metadata?.plan_code;
    if (planCode === 'PLN_uv701tt6jdcw916') return 'Starter Credit Pack (20 Credits)';
    if (planCode === 'PLN_7l2u2vr9r7844sz') return 'Premium Monthly Plan';
    if (planCode === 'PLN_rsxpxfrt13zyatj') return 'Premium Yearly Plan';
    if (planCode === 'PLN_gi0q6ldgfi6e0cd') return 'Premium Plus Monthly';
    if (planCode === 'PLN_qy200k9hkdd183d') return 'Premium Plus Yearly';
    if (planCode === 'PLN_0jg6lfy4ttw68tj') return 'Premium Monthly ($5 USD)';
    if (planCode === 'PLN_2uob7t7251usns5') return 'Premium Yearly ($50 USD)';
    if (planCode === 'PLN_fkvsy1vdlgcnp0p') return 'Premium Plus Monthly ($10 USD)';
    if (planCode === 'PLN_35hurhal4nnj3n9') return 'Premium Plus Yearly ($100 USD)';

    if (tx.amount === 50 && tx.currency === 'KES') return 'Starter Credit Pack (20 Credits)';
    if (tx.amount === 500 && tx.currency === 'KES') return 'Premium Plan (Monthly)';
    if (tx.amount === 1000 && tx.currency === 'KES') return 'Premium Plus Plan (Monthly)';

    return `Payment (${tx.currency} ${tx.amount})`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge text="Completed" variant="success" />;
      case 'pending':
        return <Badge text="Processing" variant="warning" />;
      case 'abandoned':
        return <Badge text="Incomplete" variant="skill" />;
      case 'failed':
      default:
        return <Badge text="Failed" variant="error" />;
    }
  };

  const getMethodBadge = (tx: PaymentTransaction) => {
    const method = tx.payment_method || tx.metadata?.channel;
    if (method === 'mobile_money' || tx.metadata?.channel === 'mobile_money') {
      return (
        <View style={[styles.methodTag, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <Ionicons name="phone-portrait-outline" size={12} color={colors.primary} />
          <Text style={[styles.methodTagText, { color: colors.textSecondary }]}>M-Pesa</Text>
        </View>
      );
    }
    return (
      <View style={[styles.methodTag, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <Ionicons name="card-outline" size={12} color={colors.primary} />
        <Text style={[styles.methodTagText, { color: colors.textSecondary }]}>Card</Text>
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      {/* App Header */}
      <View style={[styles.header, { 
        paddingTop: Platform.OS === 'ios' ? insets.top + 8 : Spacing.lg,
        backgroundColor: colors.bgPrimary,
        borderBottomColor: colors.border,
      }]}>
        <View style={styles.headerRow}>
          <Pressable 
            style={[styles.backBtn, { backgroundColor: colors.bgSecondary }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Billing & Payments</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Transaction receipts and subscription history
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Membership Summary Cards */}
        <View style={styles.summaryGrid}>
          <Card style={[styles.summaryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="flash" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>AI Credits</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{balance?.balance ?? 0}</Text>
            <Text style={[styles.summaryFootnote, { color: colors.textSecondary }]}>
              {isPro ? 'Pro Active' : 'Free Tier'}
            </Text>
          </Card>

          <Card style={[styles.summaryCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="receipt-outline" size={20} color={colors.success} />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Successful Payments</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              {transactions.filter((t) => t.status === 'success').length}
            </Text>
            <Text style={[styles.summaryFootnote, { color: colors.textSecondary }]}>
              {Object.keys(totalSuccessfulSpend).length > 0
                ? Object.entries(totalSuccessfulSpend)
                    .map(([curr, amt]) => `${curr} ${amt.toLocaleString()}`)
                    .join(' + ')
                : 'No payments yet'}
            </Text>
          </Card>
        </View>

        {/* Upgrade / Buy Credits Quick Banner */}
        <Card style={[styles.actionBanner, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
          <View style={{ flex: 1, marginRight: Spacing.md }}>
            <Text style={[styles.actionBannerTitle, { color: colors.textPrimary }]}>
              {isPro ? 'Manage Membership' : 'Top Up or Upgrade'}
            </Text>
            <Text style={[styles.actionBannerText, { color: colors.textSecondary }]}>
              {isPro 
                ? 'Your Pro membership includes full AI features and priority coaching.' 
                : 'Need more credits? Buy 20 credits for KES 50 or unlock Pro.'}
            </Text>
          </View>
          <Button
            title={isPro ? "View Plans" : "Upgrade Plan"}
            variant="primary"
            size="sm"
            onPress={() => router.push('/(tabs)/pricing' as any)}
          />
        </Card>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Payment History</Text>
          <View style={styles.pillContainer}>
            <Pressable
              style={[styles.filterPill, filter === 'all' && { backgroundColor: colors.primary }]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterPillText, { color: filter === 'all' ? '#FFFFFF' : colors.textSecondary }]}>
                All ({transactions.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPill, filter === 'success' && { backgroundColor: colors.primary }]}
              onPress={() => setFilter('success')}
            >
              <Text style={[styles.filterPillText, { color: filter === 'success' ? '#FFFFFF' : colors.textSecondary }]}>
                Success ({transactions.filter((t) => t.status === 'success').length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterPill, filter === 'other' && { backgroundColor: colors.primary }]}
              onPress={() => setFilter('other')}
            >
              <Text style={[styles.filterPillText, { color: filter === 'other' ? '#FFFFFF' : colors.textSecondary }]}>
                Other ({transactions.filter((t) => t.status !== 'success').length})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Transactions List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading billing records...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No transactions found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'all'
                ? "You haven't made any purchases yet. Select a plan or starter credit pack to get started."
                : `No ${filter === 'success' ? 'successful' : 'pending/failed'} transactions on record.`}
            </Text>
            <Button
              title="Explore Pricing Plans"
              variant="outline"
              style={{ marginTop: Spacing.md }}
              onPress={() => router.push('/(tabs)/pricing' as any)}
            />
          </Card>
        ) : (
          filteredTransactions.map((tx) => (
            <Card
              key={tx.id}
              style={[
                styles.txCard,
                { 
                  backgroundColor: colors.bgPrimary, 
                  borderColor: tx.status === 'success' ? colors.border : colors.border,
                },
              ]}
            >
              <View style={styles.txHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txPlanName, { color: colors.textPrimary }]}>
                    {getPlanDescription(tx)}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textMuted }]}>
                    {formatDate(tx.paid_at || tx.created_at)}
                  </Text>
                </View>
                <View style={styles.txAmountContainer}>
                  <Text style={[styles.txAmount, { color: tx.status === 'success' ? colors.textPrimary : colors.textMuted }]}>
                    {tx.currency} {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <View style={{ marginTop: 4, alignItems: 'flex-end' }}>
                    {getStatusBadge(tx.status)}
                  </View>
                </View>
              </View>

              <View style={[styles.txDivider, { backgroundColor: colors.border }]} />

              <View style={styles.txFooter}>
                <View style={styles.txDetailsLeft}>
                  {getMethodBadge(tx)}
                  <Text style={[styles.txRef, { color: colors.textMuted }]} numberOfLines={1}>
                    Ref: {tx.reference}
                  </Text>
                </View>

                {tx.metadata?.authorization_code && (
                  <Text style={[styles.txAuth, { color: colors.textMuted }]}>
                    Auth: {tx.metadata.authorization_code}
                  </Text>
                )}
              </View>
            </Card>
          ))
        )}

        {/* Support Footer */}
        <View style={styles.supportBox}>
          <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.supportText, { color: colors.textSecondary }]}>
            Have a question about a payment or invoice?{' '}
            <Text
              style={{ color: colors.primary, fontWeight: '600' }}
              onPress={() => Linking.openURL('mailto:info@appinterviewready.top')}
            >
              info@appinterviewready.top
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.headingMd,
    fontSize: 20,
  },
  headerSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
  },
  summaryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...Typography.headingLg,
    fontSize: 22,
    marginVertical: 2,
  },
  summaryFootnote: {
    ...Typography.caption,
    fontSize: 11,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionBannerTitle: {
    ...Typography.subtitle2,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionBannerText: {
    ...Typography.caption,
    lineHeight: 16,
  },
  filterRow: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headingMd,
    marginBottom: Spacing.sm,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  filterPillText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodySm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.md,
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.subtitle1,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.bodySm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  txCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  txPlanName: {
    ...Typography.subtitle2,
    fontWeight: '700',
  },
  txDate: {
    ...Typography.caption,
    marginTop: 2,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    ...Typography.subtitle1,
    fontWeight: '700',
  },
  txDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  methodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  methodTagText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  txRef: {
    ...Typography.caption,
    fontSize: 11,
    flex: 1,
  },
  txAuth: {
    ...Typography.caption,
    fontSize: 11,
  },
  supportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  supportText: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
