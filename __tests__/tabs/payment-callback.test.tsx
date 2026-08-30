import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import PaymentCallbackScreen from '../../app/payment/callback';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { useAuthStore } from '../../src/stores/auth-store';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;
const mockToast = Toast as any;

describe('Payment callback — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockToast.show.mockClear();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  });

  const renderScreen = () => renderWithProviders(<PaymentCallbackScreen />);

  it('shows an error for a missing payment reference', async () => {
    router.__setMockParams({});
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Invalid payment reference')).toBeTruthy();
    });
  });

  it('shows success when payment is verified', async () => {
    router.__setMockParams({ reference: 'ref-123' });
    const session = buildSession();
    mockSupabase.auth.refreshSession.mockResolvedValue({ data: { session }, error: null });
    global.fetch = jest.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          success: true,
          data: { status: 'success', reference: 'ref-123', amount: 500, currency: 'KES', gateway_response: 'Approved' },
        }),
      } as any)
    );

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeTruthy();
    });
    expect(useAuthStore.getState().session).not.toBeNull();
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('shows failed status when the gateway rejects the payment', async () => {
    router.__setMockParams({ reference: 'ref-bad' });
    global.fetch = jest.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          success: false,
          data: { status: 'failed', gateway_response: 'Card declined' },
        }),
      } as any)
    );

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Payment Failed')).toBeTruthy();
    });
  });

  it('navigates to the dashboard after success', async () => {
    router.__setMockParams({ reference: 'ref-123' });
    const session = buildSession();
    mockSupabase.auth.refreshSession.mockResolvedValue({ data: { session }, error: null });
    global.fetch = jest.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          success: true,
          data: { status: 'success', reference: 'ref-123' },
        }),
      } as any)
    );

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Continue to Dashboard'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
