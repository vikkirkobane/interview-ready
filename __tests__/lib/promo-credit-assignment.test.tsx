import React from 'react';
import { act } from '@testing-library/react-native';
import { supabase } from '../../src/lib/supabase';
import { useReferral } from '../../src/hooks/useReferral';
import { renderWithProviders } from '../helpers/render';
import { buildSession } from '../helpers/supabase';
import { resetAllStores } from '../helpers/stores';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('Promo Code Credit Assignment & Validation Suite', () => {
  const testUser = {
    id: 'test-user-123',
    email: 'newuser@example.com',
  };

  let hookApi: any;
  function HookHarness() {
    hookApi = useReferral();
    return null;
  }

  const renderHookInstance = async () => {
    hookApi = null;
    await renderWithProviders(<HookHarness />);
    return hookApi;
  };

  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    const session = buildSession({ user: testUser });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: testUser }, error: null });

    // Mock initial user profile with 5 starting credits
    mockSupabase.__mockHelpers.tables['user_profiles'] = [
      {
        user_id: testUser.id,
        credits: 5,
        first_name: 'New',
        last_name: 'User',
      },
    ];

    if (jest.isMockFunction(global.fetch)) {
      (global.fetch as jest.Mock).mockReset();
    }
    global.fetch = jest.fn() as any;
  });

  it('successfully applies a promo code (LINKEDIN20) via Edge Function and grants 20 credits', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('referral-apply')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              is_promo: true,
              credits_granted: 20,
              promo_code: 'LINKEDIN20',
              message: 'Success! Promo code applied! You received 20 bonus credits!',
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          data: { referral_code: 'NEWUSER123', total_referrals: 0, credits_earned: 0, referrals: [] },
        }),
      };
    });

    await renderHookInstance();

    let res: any;
    await act(async () => {
      res = await hookApi.applyReferralCode('linkedin20');
    });

    expect(res.success).toBe(true);
    expect(res.isPromo).toBe(true);
    expect(res.creditsGranted).toBe(20);
    expect(res.message).toContain('20 bonus credits');
  });

  it('successfully applies high-value promo codes (e.g. WELCOME50 for 50 credits)', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('referral-apply')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              is_promo: true,
              credits_granted: 50,
              promo_code: 'WELCOME50',
              message: 'Success! Promo code applied! You received 50 bonus credits!',
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ data: {} }),
      };
    });

    await renderHookInstance();

    let res: any;
    await act(async () => {
      res = await hookApi.applyReferralCode('  welcome50  ');
    });

    expect(res.success).toBe(true);
    expect(res.isPromo).toBe(true);
    expect(res.creditsGranted).toBe(50);
  });

  it('successfully applies maximum-tier promo codes (e.g. ULTIMATE150 for 150 credits)', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('referral-apply')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              is_promo: true,
              credits_granted: 150,
              promo_code: 'ULTIMATE150',
              message: 'Success! Promo code applied! You received 150 bonus credits!',
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ data: {} }),
      };
    });

    await renderHookInstance();

    let res: any;
    await act(async () => {
      res = await hookApi.applyReferralCode('ULTIMATE150');
    });

    expect(res.success).toBe(true);
    expect(res.isPromo).toBe(true);
    expect(res.creditsGranted).toBe(150);
  });

  it('falls back to direct apply_promo_code RPC when Edge Function is unavailable', async () => {
    (global.fetch as jest.Mock).mockImplementation(async () => {
      throw new Error('Edge function offline');
    });

    mockSupabase.rpc.mockImplementation(async (fnName: string, params: any) => {
      if (fnName === 'apply_promo_code') {
        if (params.p_promo_code === 'LINKEDIN20') {
          return {
            data: {
              success: true,
              is_promo: true,
              promo_code: 'LINKEDIN20',
              credits_granted: 20,
              message: 'Success! Promo code applied! You received 20 bonus credits!',
            },
            error: null,
          };
        }
      }
      return { data: null, error: 'Function not found' };
    });

    await renderHookInstance();

    let res: any;
    await act(async () => {
      res = await hookApi.applyReferralCode('LINKEDIN20');
    });

    expect(res.success).toBe(true);
    expect(res.isPromo).toBe(true);
    expect(res.creditsGranted).toBe(20);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('apply_promo_code', {
      p_user_id: testUser.id,
      p_promo_code: 'LINKEDIN20',
    });
  });

  it('rejects a second promo code from the same tier', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('referral-apply')) {
        return {
          ok: false,
          json: async () => ({
            success: false,
            error: 'You have already redeemed a promotional code from this tier (TIER_1). Each promo tier can only be redeemed once per account.',
          }),
        };
      }
      return { ok: true, json: async () => ({ data: {} }) };
    });

    await renderHookInstance();

    let res: any;
    await act(async () => {
      res = await hookApi.applyReferralCode('WELCOME20');
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('already redeemed a promotional code from this tier');
  });

  it('allows redeeming promo codes across different tiers (e.g. Tier 1 then Tier 4)', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string, opts: any) => {
      const body = JSON.parse(opts.body);
      if (body.referralCode === 'ULTIMATE150') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              is_promo: true,
              tier: 'TIER_4',
              credits_granted: 150,
              promo_code: 'ULTIMATE150',
              message: 'Success! Promo code applied! You received 150 bonus credits!',
            },
          }),
        };
      }
      return { ok: true, json: async () => ({ data: {} }) };
    });

    await renderHookInstance();

    let res: any;
    await act(async () => {
      res = await hookApi.applyReferralCode('ULTIMATE150');
    });

    expect(res.success).toBe(true);
    expect(res.isPromo).toBe(true);
    expect(res.creditsGranted).toBe(150);
  });

  it('rejects invalid or non-existent promo codes', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('referral-apply')) {
        return {
          ok: false,
          json: async () => ({
            success: false,
            error: 'Invalid referral or promo code. Please check and try again.',
          }),
        };
      }
      return { ok: true, json: async () => ({ data: {} }) };
    });

    await renderHookInstance();

    let res: any;
    await act(async () => {
      res = await hookApi.applyReferralCode('FAKEPROMO123');
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid referral or promo code');
  });

  it('rejects empty input without network requests', async () => {
    await renderHookInstance();

    let res: any;
    await act(async () => {
      res = await hookApi.applyReferralCode('   ');
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Please enter a valid code.');
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('referral-apply'),
      expect.anything()
    );
  });
});
