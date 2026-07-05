import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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
  applyReferralCode: (code: string) => Promise<{ success: boolean; message?: string; error?: string }>;
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

      setStats({
        referralCode: result.data.referral_code,
        totalReferrals: result.data.total_referrals,
        creditsEarned: result.data.credits_earned,
        referrals: result.data.referrals,
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

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/referral-apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ referralCode: code }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error || 'Failed to apply referral code',
        };
      }

      // Refresh stats after successful application
      await fetchStats();

      return {
        success: true,
        message: result.data.message,
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
