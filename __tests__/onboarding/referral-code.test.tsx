import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import ReferralCodeScreen from '../../app/(onboarding)/referral-code';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores } from '../helpers/stores';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;
const mockToast = Toast as any;

function mockFetchSuccess() {
  (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
    if (url.includes('referral-apply')) {
      return { 
        ok: true, 
        json: async () => ({ 
          success: true, 
          data: { message: 'Applied', credits_granted: 10, is_promo: false } 
        }) 
      };
    }
    return {
      ok: true,
      json: async () => ({
        data: { referral_code: 'MYCODE', total_referrals: 0, credits_earned: 0, referrals: [] },
      }),
    };
  });
}

jest.setTimeout(30000);

describe('Referral and Promo code (onboarding) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockToast.show.mockClear();
    router.__resetMockRouter();
    const session = buildSession({
      user_metadata: { onboarding_completed: false },
    });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    if (jest.isMockFunction(global.fetch)) {
      (global.fetch as jest.Mock).mockReset();
    }
    global.fetch = jest.fn() as any;
    mockFetchSuccess();
  });

  const renderScreen = () => renderWithProviders(<ReferralCodeScreen />);

  it('renders the referral & promo code step', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Got a referral or promo code?')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. LINKEDIN20 or JOHN1234')).toBeTruthy();
    expect(screen.getByText('Apply Code')).toBeTruthy();
    expect(screen.getByText('Skip for now')).toBeTruthy();
    expect(screen.getByText('LinkedIn Community Bonus')).toBeTruthy();
  });

  it('warns when applying an empty code', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Apply Code'));
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Empty Code' })
      );
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('applies a standard peer referral code (10 credits) and advances', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. LINKEDIN20 or JOHN1234'), 'john1234');
    await fireEvent.press(screen.getByText('Apply Code'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'success', 
          text1: 'Referral Code Applied! 🎁',
          text2: 'You received 10 free AI credits!'
        })
      );
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/role');
    });
    expect(useOnboardingStore.getState().referralCodeSkipped).toBe(true);
  });

  it('applies a promotional code like LINKEDIN20 (20 credits) and advances', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('referral-apply')) {
        return { 
          ok: true, 
          json: async () => ({ 
            success: true, 
            data: { 
              message: 'Promo code applied!', 
              credits_granted: 20, 
              is_promo: true,
              promo_code: 'LINKEDIN20' 
            } 
          }) 
        };
      }
      return {
        ok: true,
        json: async () => ({
          data: { referral_code: 'MYCODE', total_referrals: 0, credits_earned: 0, referrals: [] },
        }),
      };
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. LINKEDIN20 or JOHN1234'), 'LINKEDIN20');
    await fireEvent.press(screen.getByText('Apply Code'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'success', 
          text1: 'Promo Code Applied! 🎉',
          text2: 'You received 20 free AI credits!'
        })
      );
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/role');
    });
  });

  it('rejects an invalid referral or promo code', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('referral-apply')) {
        return { ok: false, json: async () => ({ success: false, error: 'Invalid referral or promo code. Please check and try again.' }) };
      }
      return {
        ok: true,
        json: async () => ({
          data: { referral_code: 'MYCODE', total_referrals: 0, referrals: [] },
        }),
      };
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. LINKEDIN20 or JOHN1234'), 'BADCODE');
    await fireEvent.press(screen.getByText('Apply Code'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Invalid Code' })
      );
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('skips the step and advances to role selection', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Skip for now'));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/role');
    });
    expect(useOnboardingStore.getState().referralCodeSkipped).toBe(true);
  });

  it('pre-fills a code delivered via deep link', async () => {
    useOnboardingStore.setState({ referralCode: 'DEEPLINK123' });
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByDisplayValue('DEEPLINK123')).toBeTruthy();
    });
  });
});
