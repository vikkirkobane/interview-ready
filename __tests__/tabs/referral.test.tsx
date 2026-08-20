import React from 'react';
import { Share } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

import ReferralScreen from '../../app/(tabs)/referral';
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
const mockToast = Toast as any;

describe('Referral — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    (Clipboard.setStringAsync as jest.Mock).mockClear();
    mockToast.show.mockClear();
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction } as any);
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    global.fetch = jest.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          data: {
            referral_code: 'JANE1234',
            total_referrals: 2,
            credits_earned: 20,
            referrals: [
              {
                id: 'ref-1',
                referred_user: { first_name: 'Ben', last_name: 'K', email: 'ben@example.com' },
                credits_granted: 10,
                created_at: '2026-08-01T10:00:00Z',
              },
            ],
          },
        }),
      } as any)
    );
  });

  const renderScreen = () => renderWithProviders(<ReferralScreen />);

  it('renders the referral hero and code', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Give 10, Get 10')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('JANE1234')).toBeTruthy();
    });
  });

  it('copies the referral code', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('JANE1234')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Copy'));
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('JANE1234');
    });
  });

  it('shares the invite link', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Share Invite Link')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Share Invite Link'));
    await waitFor(() => {
      expect(Share.share).toHaveBeenCalled();
    });
  });

  it('shows referral stats', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Total Referrals')).toBeTruthy();
      expect(screen.getByText('Credits Earned')).toBeTruthy();
      expect(screen.getByText('Ben K')).toBeTruthy();
      expect(screen.getByText('ben@example.com')).toBeTruthy();
      expect(screen.getByText('+10')).toBeTruthy();
    });
  });

  it('applies a referral code', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('referral-apply')) {
        return { ok: true, json: async () => ({ success: true, data: { message: 'Applied', credits_granted: 10, is_promo: false } }) } as any;
      }
      return {
        ok: true,
        json: async () => ({
          data: { referral_code: 'JANE1234', total_referrals: 0, referrals: [] },
        }),
      } as any;
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. LINKEDIN20 or JOHN1234'), 'friend123');
    await fireEvent.press(screen.getByText('Apply'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Referral Code Applied! 🎁' })
      );
    });
  });

  it('applies a promo code like LINKEDIN20 and grants 20 credits', async () => {
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
        } as any;
      }
      return {
        ok: true,
        json: async () => ({
          data: { referral_code: 'JANE1234', total_referrals: 0, referrals: [] },
        }),
      } as any;
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. LINKEDIN20 or JOHN1234'), 'LINKEDIN20');
    await fireEvent.press(screen.getByText('Apply'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'success', 
          text1: 'Promo Code Applied! 🎉',
          text2: 'Promo code applied!'
        })
      );
    });
  });
});
