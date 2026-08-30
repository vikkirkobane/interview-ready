import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import BillingHistoryScreen from '../../app/billing-history';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('Billing History Screen — user stories', () => {
  const mockTransactions = [
    {
      id: 'tx-1',
      reference: 'IR_1788094152586_cs73z',
      amount: 50,
      currency: 'KES',
      status: 'success',
      payment_provider: 'paystack',
      payment_method: 'mobile_money',
      paid_at: '2026-08-30T12:49:52.000Z',
      created_at: '2026-08-30T12:49:12.000Z',
      metadata: {
        plan_code: 'PLN_uv701tt6jdcw916',
        plan_name: 'Starter Credit Pack (20 Credits)',
        channel: 'mobile_money',
      },
    },
    {
      id: 'tx-2',
      reference: 'IR_1788093419981_5el8bp',
      amount: 500,
      currency: 'KES',
      status: 'abandoned',
      payment_provider: 'paystack',
      payment_method: 'mobile_money',
      paid_at: null,
      created_at: '2026-08-30T12:37:00.000Z',
      metadata: {
        plan_code: 'PLN_7l2u2vr9r7844sz',
        plan_name: 'Premium Monthly Plan',
      },
    },
  ];

  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) };
    });
  });

  const renderScreen = () => renderWithProviders(<BillingHistoryScreen />);

  it('renders the billing header, summary cards, and transactions list', async () => {
    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Billing & Payments')).toBeTruthy();
      expect(screen.getByText('Successful Payments')).toBeTruthy();
      expect(screen.getByText('Starter Credit Pack (20 Credits)')).toBeTruthy();
      expect(screen.getByText('KES 50.00')).toBeTruthy();
      expect(screen.getByText('Completed')).toBeTruthy();
    });
  });

  it('filters transactions by success status when Success tab is pressed', async () => {
    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/Success \(1\)/)).toBeTruthy();
    });

    await fireEvent.press(screen.getByText(/Success \(1\)/));

    await waitFor(() => {
      expect(screen.getByText('Starter Credit Pack (20 Credits)')).toBeTruthy();
    });
  });

  it('navigates to pricing when upgrade button is pressed', async () => {
    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/Upgrade Plan|View Plans/)).toBeTruthy();
    });

    await fireEvent.press(screen.getByText(/Upgrade Plan|View Plans/));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/pricing');
  });

  it('navigates back when back chevron is pressed', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Go back'));
    expect(router.back).toHaveBeenCalled();
  });
});
