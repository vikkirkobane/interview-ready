import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface CreditBalance {
  balance: number;
  totalEarned: number;
  totalUsed: number;
  expiresAt: string | null;
  plan: string;
}

interface CreditStoreState {
  balance: CreditBalance | null;
  loading: boolean;
  error: string | null;
  setBalance: (balance: CreditBalance | null) => void;
  fetchBalance: (force?: boolean) => Promise<void>;
  initRealtime: () => () => void;
}

let activeFetchPromise: Promise<CreditBalance | null> | null = null;
let realtimeChannel: any = null;

export const useCreditStore = create<CreditStoreState>((set, get) => ({
  balance: null,
  loading: true,
  error: null,

  setBalance: (balance) => set({ balance, loading: false }),

  fetchBalance: async (force = false) => {
    try {
      if (force) {
        activeFetchPromise = null;
      }

      set({ loading: true });
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        set({ balance: null, loading: false });
        return;
      }

      if (!activeFetchPromise || force) {
        activeFetchPromise = (async () => {
          const { data, error: fetchError } = await supabase
            .from('users')
            .select('ai_credits, total_credits_earned, total_credits_used, credits_expire_at, plan')
            .eq('id', userId)
            .single();

          if (fetchError) throw fetchError;

          return {
            balance: data.ai_credits || 0,
            totalEarned: data.total_credits_earned || 0,
            totalUsed: data.total_credits_used || 0,
            expiresAt: data.credits_expire_at,
            plan: data.plan || 'FREE',
          };
        })().finally(() => {
          activeFetchPromise = null;
        });
      }

      const balanceData = await activeFetchPromise;
      if (balanceData) {
        set({ balance: balanceData, loading: false, error: null });
      }
    } catch (err: any) {
      console.warn('Credit fetch error:', err);
      set({ error: err?.message || 'Failed to fetch credits', loading: false });
    }
  },

  initRealtime: () => {
    let isSubscribed = true;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!isSubscribed || !user) return;

      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }

      realtimeChannel = supabase
        .channel(`global-credits-sync-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${user.id}` },
          () => { get().fetchBalance(true); }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
          () => { get().fetchBalance(true); }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
          () => { get().fetchBalance(true); }
        );

      realtimeChannel.subscribe();
    };

    setup();

    return () => {
      isSubscribed = false;
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    };
  },
}));
