jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

import {
  MIN_CREDITS_THRESHOLD,
  hasSufficientCredits,
  checkAndEnforceCreditGuard,
} from '../../src/lib/creditGuard';
import Toast from 'react-native-toast-message';

describe('Credit Guard — Subscription Enforcement (< 2 credits)', () => {
  let mockRouter: { push: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter = {
      push: jest.fn(),
    };
  });

  describe('MIN_CREDITS_THRESHOLD', () => {
    it('is set to 2 credits', () => {
      expect(MIN_CREDITS_THRESHOLD).toBe(2);
    });
  });

  describe('hasSufficientCredits', () => {
    it('returns true if user has 2 or more credits', () => {
      expect(hasSufficientCredits(2, false)).toBe(true);
      expect(hasSufficientCredits(5, false)).toBe(true);
      expect(hasSufficientCredits(100, false)).toBe(true);
    });

    it('returns false if non-Pro user has fewer than 2 credits (0 or 1)', () => {
      expect(hasSufficientCredits(1, false)).toBe(false);
      expect(hasSufficientCredits(0, false)).toBe(false);
      expect(hasSufficientCredits(-1, false)).toBe(false);
    });

    it('returns true for Pro users regardless of credit balance', () => {
      expect(hasSufficientCredits(0, true)).toBe(true);
      expect(hasSufficientCredits(1, true)).toBe(true);
      expect(hasSufficientCredits(-5, true)).toBe(true);
    });

    it('returns true when balance is null or undefined (loading state)', () => {
      expect(hasSufficientCredits(null, false)).toBe(true);
      expect(hasSufficientCredits(undefined, false)).toBe(true);
    });

    it('respects custom minimum threshold parameter', () => {
      expect(hasSufficientCredits(3, false, 5)).toBe(false);
      expect(hasSufficientCredits(5, false, 5)).toBe(true);
    });
  });

  describe('checkAndEnforceCreditGuard', () => {
    it('allows action when non-Pro user has >= 2 credits without redirecting', () => {
      const allowed = checkAndEnforceCreditGuard({
        router: mockRouter,
        credits: 3,
        isPro: false,
        featureName: 'Mock Interview',
      });

      expect(allowed).toBe(true);
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(Toast.show).not.toHaveBeenCalled();
    });

    it('blocks and redirects to billing when non-Pro user has < 2 credits', () => {
      const allowed = checkAndEnforceCreditGuard({
        router: mockRouter,
        credits: 1,
        isPro: false,
        featureName: 'Mock Interview',
      });

      expect(allowed).toBe(false);
      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/pricing?reason=low_credits');
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Subscription Required',
          text2: expect.stringContaining('You need at least 2 credits to use Mock Interview'),
        })
      );
    });

    it('allows Pro user even with 0 credits and does not redirect', () => {
      const allowed = checkAndEnforceCreditGuard({
        router: mockRouter,
        credits: 0,
        isPro: true,
        featureName: 'Ask AI',
      });

      expect(allowed).toBe(true);
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(Toast.show).not.toHaveBeenCalled();
    });
  });
});
