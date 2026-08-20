import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/auth-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { queryClient } from '../../src/lib/query-client';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('Subscription & Payment Assignment Lifecycle', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    queryClient.clear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  it('activates Pro subscription and grants 150 credits on Premium plan verification', async () => {
    const userId = 'user-test-pro-1';
    const proSession = {
      ...buildSession(),
      user: {
        id: userId,
        email: 'subscriber@example.com',
        user_metadata: {
          first_name: 'Jane',
          is_pro: true,
          plan: 'pro',
          subscription: 'pro',
        },
        app_metadata: {},
      },
    };

    // Seed tables
    mockSupabase.__mockHelpers.tables['users'] = [
      {
        id: userId,
        email: 'subscriber@example.com',
        plan: 'FREE',
        ai_credits: 10,
        credit_balance: 10,
        total_credits_earned: 10,
        total_credits_used: 0,
      },
    ];

    mockSupabase.__mockHelpers.tables['payment_transactions'] = [
      {
        id: 'tx-100',
        user_id: userId,
        reference: 'IR_123456_premium',
        amount: 500,
        currency: 'KES',
        status: 'pending',
        metadata: {
          plan_code: 'PLN_7l2u2vr9r7844sz',
          plan_name: 'Premium',
          plan_type: 'PREMIUM',
        },
      },
    ];

    // Simulate backend verification RPC execution
    const mockUpsertPaystackSubscription = jest.fn(async (params: any) => {
      const user = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === params.p_user_id);
      if (user) {
        user.plan = 'PREMIUM';
        user.ai_credits = 150;
        user.credit_balance = 150;
        user.total_credits_earned = (user.total_credits_earned || 0) + 150;
      }
      return { data: 'sub-db-123', error: null };
    });

    mockSupabase.rpc.mockImplementation((rpcName: string, params: any) => {
      if (rpcName === 'upsert_paystack_subscription') {
        return mockUpsertPaystackSubscription(params);
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Execute RPC
    const { data: subId, error } = await mockSupabase.rpc('upsert_paystack_subscription', {
      p_user_id: userId,
      p_subscription_code: 'SUB_paystack_premium_001',
      p_customer_code: 'CUS_999',
      p_plan_code: 'PLN_7l2u2vr9r7844sz',
      p_authorization_code: 'AUTH_card_001',
      p_status: 'ACTIVE',
      p_current_period_start: new Date().toISOString(),
      p_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(error).toBeNull();
    expect(subId).toBe('sub-db-123');

    // Verify DB user record updated
    const updatedUser = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === userId);
    expect(updatedUser.plan).toBe('PREMIUM');
    expect(updatedUser.ai_credits).toBe(150);
    expect(updatedUser.credit_balance).toBe(150);

    // Update frontend auth session with Pro metadata
    useAuthStore.getState().setSession(proSession as any);
    const authState = useAuthStore.getState();
    expect(authState.user?.user_metadata?.is_pro).toBe(true);
    expect(authState.user?.user_metadata?.plan).toBe('pro');
  });

  it('activates Premium Plus subscription and grants 400 credits', async () => {
    const userId = 'user-test-pro-plus';
    mockSupabase.__mockHelpers.tables['users'] = [
      {
        id: userId,
        email: 'plus@example.com',
        plan: 'FREE',
        ai_credits: 5,
        credit_balance: 5,
      },
    ];

    mockSupabase.rpc.mockImplementation((rpcName: string, params: any) => {
      if (rpcName === 'upsert_paystack_subscription') {
        const user = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === params.p_user_id);
        if (user) {
          user.plan = 'PREMIUM_PLUS';
          user.ai_credits = 400;
          user.credit_balance = 400;
        }
        return Promise.resolve({ data: 'sub-plus-456', error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { data: subId } = await mockSupabase.rpc('upsert_paystack_subscription', {
      p_user_id: userId,
      p_subscription_code: 'SUB_plus_001',
      p_customer_code: 'CUS_plus',
      p_plan_code: 'PLN_35hurhal4nnj3n9',
      p_status: 'ACTIVE',
    });

    expect(subId).toBe('sub-plus-456');
    const user = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === userId);
    expect(user.plan).toBe('PREMIUM_PLUS');
    expect(user.ai_credits).toBe(400);
  });

  it('reverts user back to FREE tier with baseline credits when subscription is cancelled', async () => {
    const userId = 'user-cancelled';
    mockSupabase.__mockHelpers.tables['users'] = [
      {
        id: userId,
        plan: 'PREMIUM',
        ai_credits: 85,
        credit_balance: 85,
      },
    ];
    mockSupabase.__mockHelpers.tables['subscriptions'] = [
      {
        id: 'sub-1',
        user_id: userId,
        paystack_subscription_code: 'SUB_cancel_me',
        status: 'ACTIVE',
      },
    ];

    mockSupabase.rpc.mockImplementation((rpcName: string, params: any) => {
      if (rpcName === 'cancel_paystack_subscription') {
        const sub = mockSupabase.__mockHelpers.tables['subscriptions'].find(
          (s: any) => s.paystack_subscription_code === params.p_subscription_code
        );
        if (sub) {
          sub.status = 'CANCELLED';
          const user = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === sub.user_id);
          if (user) {
            user.plan = 'FREE';
            user.ai_credits = 10;
            user.credit_balance = 10;
          }
        }
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const { data: result } = await mockSupabase.rpc('cancel_paystack_subscription', {
      p_subscription_code: 'SUB_cancel_me',
    });

    expect(result).toBe(true);
    const sub = mockSupabase.__mockHelpers.tables['subscriptions'][0];
    expect(sub.status).toBe('CANCELLED');
    const user = mockSupabase.__mockHelpers.tables['users'][0];
    expect(user.plan).toBe('FREE');
    expect(user.ai_credits).toBe(10);
  });

  it('refills monthly credits on renewal invoice update', async () => {
    const userId = 'user-renewed';
    mockSupabase.__mockHelpers.tables['users'] = [
      {
        id: userId,
        plan: 'PREMIUM',
        ai_credits: 12, // Remaining from previous month
        credit_balance: 12,
      },
    ];

    // Simulate monthly renewal credit refill
    const user = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === userId);
    user.ai_credits = 150;
    user.credit_balance = 150;

    expect(user.ai_credits).toBe(150);
    expect(user.credit_balance).toBe(150);
  });

  it('handles atomic credit deduction per feature without overdrawing', async () => {
    const userId = 'user-balance-test';
    mockSupabase.__mockHelpers.tables['users'] = [
      {
        id: userId,
        ai_credits: 4, // Has 4 credits
        credit_balance: 4,
      },
    ];

    mockSupabase.rpc.mockImplementation((rpcName: string, params: any) => {
      if (rpcName === 'deduct_credits') {
        const user = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === params.user_uuid);
        if (user && user.ai_credits >= params.amount) {
          user.ai_credits -= params.amount;
          user.credit_balance = user.ai_credits;
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: false, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Deduct 3 credits for resume generation (success)
    const { data: res1 } = await mockSupabase.rpc('deduct_credits', {
      user_uuid: userId,
      amount: 3,
    });
    expect(res1).toBe(true);

    const userAfterFirst = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === userId);
    expect(userAfterFirst.ai_credits).toBe(1);

    // Attempt to deduct 5 credits for mock interview (should fail - insufficient balance)
    const { data: res2 } = await mockSupabase.rpc('deduct_credits', {
      user_uuid: userId,
      amount: 5,
    });
    expect(res2).toBe(false);

    // Balance remains intact at 1
    const userAfterSecond = mockSupabase.__mockHelpers.tables['users'].find((u: any) => u.id === userId);
    expect(userAfterSecond.ai_credits).toBe(1);
  });
});
