import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CreditBalance {
  balance: number;
  totalEarned: number;
  totalUsed: number;
  expiresAt: string | null;
}

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

export function useCredits() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current credit balance
  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('ai_credits, total_credits_earned, total_credits_used, credits_expire_at')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      setBalance({
        balance: data.ai_credits || 0,
        totalEarned: data.total_credits_earned || 0,
        totalUsed: data.total_credits_used || 0,
        expiresAt: data.credits_expire_at,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user has enough credits for a feature
  const checkCredits = useCallback(async (feature: string): Promise<CreditCheckResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/credits-check`,
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
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/credits-deduct`,
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

    // Refresh balance after deduction
    await fetchBalance();

    return {
      success: true,
      newBalance: result.data.new_balance,
      transactionId: result.data.transaction_id,
    };
  }, [fetchBalance]);



  // Get credit transaction history
  const getTransactions = useCallback(async (limit = 50): Promise<CreditTransaction[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error: fetchError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) throw fetchError;

    return data.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      balanceBefore: tx.balance_before,
      balanceAfter: tx.balance_after,
      transactionType: tx.transaction_type,
      feature: tx.feature,
      featureCost: tx.feature_cost,
      metadata: tx.metadata,
      createdAt: tx.created_at,
    }));
  }, []);

  // Get credit pricing for all features
  const getPricing = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('credit_pricing')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (fetchError) throw fetchError;

    return data;
  }, []);

  // Initial fetch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBalance();
  }, [fetchBalance]);

  // Subscribe to credit balance changes
  useEffect(() => {
    let channel: any = null;
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted || !user) return;

      channel = supabase
        .channel('credit-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'credit_transactions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refresh balance when transactions change
            fetchBalance();
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        if (channel) supabase.removeChannel(channel);
      }
    };
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    checkCredits,
    deductCredits,
    getTransactions,
    getPricing,
    refreshBalance: fetchBalance,
  };
}
