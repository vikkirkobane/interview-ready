import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { queryClient as globalQueryClient } from '../lib/query-client';
import { useProfileStore } from '../stores/profile-store';

async function syncCreditCaches() {
  try {
    globalQueryClient.invalidateQueries({ queryKey: ['credits'] });
    globalQueryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    globalQueryClient.invalidateQueries({ queryKey: ['profile'] });
    await useProfileStore.getState().fetchProfile().catch(() => {});
  } catch {
    // Ignore cache invalidation errors
  }
}

interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  creditsEarned: number;
  referrals: {
    id: string;
    referred_user: {
      first_name: string;
      last_name: string;
      email: string;
    };
    credits_granted: number;
    created_at: string;
  }[];
}

interface UseReferralReturn {
  stats: ReferralStats | null;
  loading: boolean;
  error: string | null;
  applyReferralCode: (code: string) => Promise<{
    success: boolean;
    message?: string;
    creditsGranted?: number;
    isPromo?: boolean;
    error?: string;
  }>;
  refreshStats: () => Promise<void>;
}

export function useReferral(): UseReferralReturn {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/referral-stats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch referral stats');
      }

      let referralCode = result.data.referral_code;

      // Auto-generate code if missing (for legacy users)
      if (!referralCode) {
        const { data: newCode, error: genError } = await supabase.rpc('generate_referral_code', {
          p_user_id: session.user.id,
        });
        if (!genError && newCode) {
          referralCode = newCode;
        }
      }

      setStats({
        referralCode: referralCode,
        totalReferrals: result.data.total_referrals || 0,
        creditsEarned: result.data.credits_earned || 0,
        referrals: result.data.referrals || [],
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching referral stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyReferralCode = useCallback(async (code: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const normalizedCode = (code || '').trim().toUpperCase();
      if (!normalizedCode) {
        return {
          success: false,
          error: 'Please enter a valid code.',
        };
      }

      // 1. Attempt Edge Function first
      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/referral-apply`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ referralCode: normalizedCode }),
          }
        );

        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success) {
          await fetchStats();
          await syncCreditCaches();
          return {
            success: true,
            message: result.data?.message || 'Code applied successfully!',
            creditsGranted: result.data?.credits_granted,
            isPromo: result.data?.is_promo,
          };
        }

        if (result.error) {
          if (
            result.error.includes('already redeemed') ||
            result.error.includes('maximum limit') ||
            result.error.includes('Too many') ||
            result.error.includes('own referral')
          ) {
            return {
              success: false,
              error: result.error,
            };
          }
        }
      } catch (fnErr) {
        console.warn('[useReferral] Edge function unavailable, proceeding to direct RPC:', fnErr);
      }

      // 2. Direct Supabase RPC: Evaluate Promo Code (e.g. LINKEDIN20, WELCOME20, WELCOME50)
      try {
        const { data: promoData, error: promoError } = await supabase.rpc('apply_promo_code', {
          p_user_id: session.user.id,
          p_promo_code: normalizedCode,
        });

        if (!promoError && promoData?.success) {
          await fetchStats();
          await syncCreditCaches();
          return {
            success: true,
            message: promoData.message || `Success! Promo code applied! You received ${promoData.credits_granted || 20} bonus credits!`,
            creditsGranted: promoData.credits_granted || 20,
            isPromo: true,
          };
        }

        // If user already redeemed a promo code, return specific error
        if (!promoError && promoData && !promoData.success && promoData.error?.includes('already redeemed')) {
          return {
            success: false,
            error: promoData.error,
          };
        }
      } catch (promoRpcErr) {
        console.warn('[useReferral] apply_promo_code RPC error:', promoRpcErr);
      }

      // 3. Direct Supabase RPC: Evaluate Peer Referral Code (e.g. JOHN1234)
      try {
        const { data: refData, error: refError } = await supabase.rpc('apply_referral_code', {
          p_referred_user_id: session.user.id,
          p_referral_code: normalizedCode,
        });

        if (!refError && refData?.success) {
          await fetchStats();
          await syncCreditCaches();
          return {
            success: true,
            message: refData.message || 'Referral code applied successfully!',
            creditsGranted: refData.credits_granted || 10,
            isPromo: false,
          };
        }

        if (refData?.error) {
          const reason = refData.error;
          return {
            success: false,
            error: reason.includes('own referral') ? 'You cannot use your own referral code.' : 'Invalid referral or promo code. Please check and try again.',
          };
        }
      } catch (refRpcErr) {
        console.warn('[useReferral] apply_referral_code RPC error:', refRpcErr);
      }

      return {
        success: false,
        error: 'Invalid referral or promo code. Please check and try again.',
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error applying referral code:', err);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [fetchStats]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    applyReferralCode,
    refreshStats: fetchStats,
  };
}
