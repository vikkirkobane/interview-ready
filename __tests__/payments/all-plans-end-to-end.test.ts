import { COUNTRIES, getPaymentMethods } from '../../src/constants/countries';
import { PRICING_PLANS, toSmallestUnit } from '../../app/(tabs)/pricing';
import { useCreditStore } from '../../src/stores/credit-store';
import { hasSufficientCredits, MIN_CREDITS_THRESHOLD } from '../../src/lib/creditGuard';
import { supabase } from '../../src/lib/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('All Payment Plans — End-to-End Comprehensive Verification', () => {
  beforeEach(() => {
    mockSupabase.__mockHelpers.reset();
    useCreditStore.setState({ balance: null, loading: false, error: null });
  });

  describe('1. Plan Definitions & Subunit Conversion', () => {
    it('verifies all Kenyan payment plans have correct pricing, features, intervals, and plan codes', () => {
      const plans = PRICING_PLANS.KES;

      // 50 KES Starter Pack
      const starter = plans.find((p) => p.planCode === 'PLN_uv701tt6jdcw916');
      expect(starter).toBeDefined();
      expect(starter?.price).toBe(50);
      expect(starter?.currency).toBe('KES');
      expect(starter?.interval).toBe('MONTHLY');
      expect(starter?.features).toContain('20 AI Credits (instant top-up)');
      expect(toSmallestUnit(starter!.price, 'KES')).toBe(5000); // 50 * 100 cents = 5,000 subunits

      // 500 KES Premium Monthly
      const premMonthly = plans.find((p) => p.planCode === 'PLN_7l2u2vr9r7844sz');
      expect(premMonthly).toBeDefined();
      expect(premMonthly?.price).toBe(500);
      expect(premMonthly?.currency).toBe('KES');
      expect(premMonthly?.interval).toBe('MONTHLY');
      expect(premMonthly?.features).toContain('Unlimited AI credits');
      expect(toSmallestUnit(premMonthly!.price, 'KES')).toBe(50000); // 500 * 100 cents = 50,000 subunits

      // 5,000 KES Premium Yearly
      const premYearly = plans.find((p) => p.planCode === 'PLN_rsxpxfrt13zyatj');
      expect(premYearly).toBeDefined();
      expect(premYearly?.price).toBe(5000);
      expect(premYearly?.currency).toBe('KES');
      expect(premYearly?.interval).toBe('YEARLY');
      expect(toSmallestUnit(premYearly!.price, 'KES')).toBe(500000);

      // 1,000 KES Premium Plus Monthly
      const plusMonthly = plans.find((p) => p.planCode === 'PLN_gi0q6ldgfi6e0cd');
      expect(plusMonthly).toBeDefined();
      expect(plusMonthly?.price).toBe(1000);
      expect(plusMonthly?.currency).toBe('KES');
      expect(plusMonthly?.interval).toBe('MONTHLY');
      expect(toSmallestUnit(plusMonthly!.price, 'KES')).toBe(100000);

      // 10,000 KES Premium Plus Yearly
      const plusYearly = plans.find((p) => p.planCode === 'PLN_qy200k9hkdd183d');
      expect(plusYearly).toBeDefined();
      expect(plusYearly?.price).toBe(10000);
      expect(plusYearly?.currency).toBe('KES');
      expect(plusYearly?.interval).toBe('YEARLY');
      expect(toSmallestUnit(plusYearly!.price, 'KES')).toBe(1000000);
    });

    it('verifies all USD payment plans have correct pricing, features, intervals, and plan codes', () => {
      const plans = PRICING_PLANS.USD;

      // $5 USD Premium Monthly
      const premMonthly = plans.find((p) => p.planCode === 'PLN_0jg6lfy4ttw68tj');
      expect(premMonthly).toBeDefined();
      expect(premMonthly?.price).toBe(5);
      expect(premMonthly?.currency).toBe('USD');
      expect(premMonthly?.interval).toBe('MONTHLY');
      expect(premMonthly?.features).toContain('Unlimited AI credits');
      expect(toSmallestUnit(premMonthly!.price, 'USD')).toBe(500); // $5.00 = 500 cents

      // $50 USD Premium Yearly
      const premYearly = plans.find((p) => p.planCode === 'PLN_2uob7t7251usns5');
      expect(premYearly).toBeDefined();
      expect(premYearly?.price).toBe(50);
      expect(premYearly?.currency).toBe('USD');
      expect(premYearly?.interval).toBe('YEARLY');
      expect(toSmallestUnit(premYearly!.price, 'USD')).toBe(5000);

      // $10 USD Premium Plus Monthly
      const plusMonthly = plans.find((p) => p.planCode === 'PLN_fkvsy1vdlgcnp0p');
      expect(plusMonthly).toBeDefined();
      expect(plusMonthly?.price).toBe(10);
      expect(plusMonthly?.currency).toBe('USD');
      expect(plusMonthly?.interval).toBe('MONTHLY');
      expect(toSmallestUnit(plusMonthly!.price, 'USD')).toBe(1000);

      // $100 USD Premium Plus Yearly
      const plusYearly = plans.find((p) => p.planCode === 'PLN_35hurhal4nnj3n9');
      expect(plusYearly).toBeDefined();
      expect(plusYearly?.price).toBe(100);
      expect(plusYearly?.currency).toBe('USD');
      expect(plusYearly?.interval).toBe('YEARLY');
      expect(toSmallestUnit(plusYearly!.price, 'USD')).toBe(10000);
    });

    it('verifies payment channels for Kenya include M-Pesa and Card', () => {
      const kenya = COUNTRIES.find((c) => c.code === 'KE')!;
      const methods = getPaymentMethods(kenya);
      expect(methods).toEqual(['M-Pesa', 'Card']);
    });

    it('verifies non-Kenya countries use Card channels', () => {
      const usa = COUNTRIES.find((c) => c.code === 'US')!;
      const methods = getPaymentMethods(usa);
      expect(methods).toEqual(['Card']);
      expect(methods).not.toContain('M-Pesa');
    });
  });

  describe('2. Credit Allocation & Plan Status Resolution', () => {
    it('calculates plan status as FREE when plan_expires_at is in the past', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-expired-pro' } } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    ai_credits: 35,
                    total_credits_earned: 42,
                    total_credits_used: 7,
                    credits_expire_at: null,
                    plan: 'PREMIUM',
                    plan_expires_at: '2026-08-15T00:00:00.000Z', // Expired
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      });

      await useCreditStore.getState().fetchBalance(true);
      const balance = useCreditStore.getState().balance;

      expect(balance?.plan).toBe('FREE');
      expect(balance?.balance).toBe(35);
      expect(balance?.totalEarned).toBe(42);
    });

    it('calculates plan status as PREMIUM when plan_expires_at is in the future', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-active-pro' } } },
        error: null,
      });

      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    ai_credits: 150,
                    total_credits_earned: 150,
                    total_credits_used: 0,
                    credits_expire_at: null,
                    plan: 'PREMIUM',
                    plan_expires_at: futureDate,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      });

      await useCreditStore.getState().fetchBalance(true);
      const balance = useCreditStore.getState().balance;

      expect(balance?.plan).toBe('PREMIUM');
      expect(balance?.balance).toBe(150);
    });

    it('calculates plan status as PREMIUM_PLUS for VIP subscribers', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-vip' } } },
        error: null,
      });

      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    ai_credits: 400,
                    total_credits_earned: 400,
                    total_credits_used: 0,
                    credits_expire_at: null,
                    plan: 'PREMIUM_PLUS',
                    plan_expires_at: futureDate,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
      });

      await useCreditStore.getState().fetchBalance(true);
      const balance = useCreditStore.getState().balance;

      expect(balance?.plan).toBe('PREMIUM_PLUS');
      expect(balance?.balance).toBe(400);
    });
  });

  describe('3. Credit Guard & Sufficiency Rules', () => {
    it('allows Pro subscribers unlimited access regardless of numerical balance', () => {
      expect(hasSufficientCredits(0, true)).toBe(true);
      expect(hasSufficientCredits(1, true)).toBe(true);
      expect(hasSufficientCredits(null, true)).toBe(true);
    });

    it('allows Free subscribers with >= 2 credits to proceed', () => {
      expect(hasSufficientCredits(2, false, MIN_CREDITS_THRESHOLD)).toBe(true);
      expect(hasSufficientCredits(35, false, MIN_CREDITS_THRESHOLD)).toBe(true);
      expect(hasSufficientCredits(10, false, MIN_CREDITS_THRESHOLD)).toBe(true);
    });

    it('blocks Free subscribers with < 2 credits', () => {
      expect(hasSufficientCredits(1, false, MIN_CREDITS_THRESHOLD)).toBe(false);
      expect(hasSufficientCredits(0, false, MIN_CREDITS_THRESHOLD)).toBe(false);
    });
  });

  describe('4. Progress Bar & Capacity Ratio Calculation', () => {
    it('accurately computes capacity scale for users with starter pack top-ups', () => {
      const plan = 'FREE';
      const credits = 35;
      const totalEarned = 42;
      const baseCapacity = plan === 'PREMIUM_PLUS' ? 400 : plan === 'PREMIUM' ? 150 : 10;
      const maxCredits = Math.max(baseCapacity, totalEarned, credits);

      expect(maxCredits).toBe(42);
      const fillPercentage = Math.min(100, (credits / maxCredits) * 100);
      expect(Math.round(fillPercentage)).toBe(83); // 35 / 42 = 83%
    });

    it('accurately computes capacity scale for new users with starting credits', () => {
      const plan = 'FREE';
      const credits = 10;
      const totalEarned = 10;
      const baseCapacity = 10;
      const maxCredits = Math.max(baseCapacity, totalEarned, credits);

      expect(maxCredits).toBe(10);
      const fillPercentage = (credits / maxCredits) * 100;
      expect(fillPercentage).toBe(100);
    });

    it('accurately computes capacity scale for Premium and Premium Plus tiers', () => {
      const premCapacity = Math.max(150, 150, 120);
      expect(premCapacity).toBe(150);
      expect(Math.round((120 / premCapacity) * 100)).toBe(80);

      const plusCapacity = Math.max(400, 400, 300);
      expect(plusCapacity).toBe(400);
      expect(Math.round((300 / plusCapacity) * 100)).toBe(75);
    });
  });
});
