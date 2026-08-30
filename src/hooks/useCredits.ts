import { useEffect, useCallback } from 'react';
import { supabase, supabaseUrl } from '../lib/supabase';
import { useCreditStore, CreditBalance } from '../stores/credit-store';

export type { CreditBalance };

export interface CreditCheckResult {
  hasEnough: boolean;
  currentBalance: number;
  requiredCredits: number;
  remainingAfter: number;
  feature: {
    code: string;
    name: string;
    cost: number;
    category: string;
    description: string;
  };
}

export interface CreditTransaction {
  id: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  transactionType: 'grant' | 'usage' | 'refund' | 'expiry' | 'bonus' | 'purchase';
  feature: string | null;
  featureCost: number | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export function _resetCreditCache() {
  useCreditStore.getState().fetchBalance(true);
}

export function useCredits() {
  const balance = useCreditStore((state) => state.balance);
  const loading = useCreditStore((state) => state.loading);
  const error = useCreditStore((state) => state.error);
  const fetchBalance = useCreditStore((state) => state.fetchBalance);
  const initRealtime = useCreditStore((state) => state.initRealtime);

  useEffect(() => {
    fetchBalance();
    const cleanupRealtime = initRealtime();
    return () => {
      cleanupRealtime();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBalance = useCallback(() => {
    return fetchBalance(true);
  }, [fetchBalance]);

  // Check if user has enough credits for a feature
  const checkCredits = useCallback(async (feature: string): Promise<CreditCheckResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/credits-check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ feature }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to check credits');
    }

    return result.data;
  }, []);

  // Deduct credits for a feature
  const deductCredits = useCallback(async (
    feature: string,
    options?: {
      amount?: number;
      referenceId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ success: boolean; newBalance: number; transactionId: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/credits-deduct`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          feature,
          amount: options?.amount,
          referenceId: options?.referenceId,
          metadata: options?.metadata,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error(`Insufficient credits. You need ${result.data.required} credits but only have ${result.data.available}.`);
      }
      throw new Error(result.error || 'Failed to deduct credits');
    }

    // Refresh global balance store after deduction
    await fetchBalance(true);

    return {
      success: true,
      newBalance: result.data.new_balance,
      transactionId: result.data.transaction_id,
    };
  }, [fetchBalance]);

  // Get credit transaction history
  const getTransactions = useCallback(async (limit = 50): Promise<CreditTransaction[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (txError) {
      throw txError;
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      amount: item.amount,
      balanceBefore: item.balance_before,
      balanceAfter: item.balance_after,
      transactionType: item.transaction_type,
      feature: item.feature,
      featureCost: item.feature_cost,
      metadata: item.metadata || {},
      createdAt: item.created_at,
    }));
  }, []);

  // Get pricing plans
  const getPricing = useCallback(async () => {
    const { data, error: pricingError } = await supabase
      .from('paystack_plans')
      .select('*')
      .eq('is_active', true)
      .order('amount', { ascending: true });

    if (pricingError) {
      throw pricingError;
    }

    return data;
  }, []);

  const plan = balance?.plan || 'FREE';
  const isPro = plan === 'PREMIUM' || plan === 'PREMIUM_PLUS';

  return {
    balance,
    loading,
    error,
    plan,
    isPro,
    checkCredits,
    deductCredits,
    getTransactions,
    getPricing,
    refreshBalance,
  };
}
