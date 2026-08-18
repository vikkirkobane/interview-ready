import {
  exchangeAuthCodeSafely,
  _resetCodeExchangeCache,
  isUrlAlreadyHandled,
  markUrlHandled,
  hasInFlightExchange,
  waitForAnyInFlightExchange,
} from '../../src/lib/auth-code-exchange';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/auth-store';

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

describe('exchangeAuthCodeSafely and helpers', () => {
  const mockExchange = supabase.auth.exchangeCodeForSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetCodeExchangeCache();
    useAuthStore.setState({ session: null, user: null });
  });

  describe('exchangeAuthCodeSafely', () => {
    it('exchanges authorization code once and updates authStore session', async () => {
      const mockSession = {
        access_token: 'valid_access_token',
        refresh_token: 'valid_refresh_token',
        user: { id: 'user_123', email: 'test@example.com' },
      };

      mockExchange.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      const result = await exchangeAuthCodeSafely('test_code_1');

      expect(mockExchange).toHaveBeenCalledTimes(1);
      expect(mockExchange).toHaveBeenCalledWith('test_code_1');
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it('deduplicates simultaneous concurrent calls with the same code', async () => {
      const mockSession = {
        access_token: 'valid_access_token',
        user: { id: 'user_123' },
      };

      mockExchange.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { session: mockSession, user: mockSession.user },
                  error: null,
                }),
              50
            )
          )
      );

      // Call twice simultaneously (simulating openAuthSessionAsync + Linking event)
      const [res1, res2] = await Promise.all([
        exchangeAuthCodeSafely('concurrent_code'),
        exchangeAuthCodeSafely('concurrent_code'),
      ]);

      expect(mockExchange).toHaveBeenCalledTimes(1);
      expect(res1.session).toEqual(mockSession);
      expect(res2.session).toEqual(mockSession);
    });

    it('returns cached session on subsequent calls without calling supabase again', async () => {
      const mockSession = {
        access_token: 'valid_access_token',
        user: { id: 'user_123' },
      };

      mockExchange.mockResolvedValueOnce({
        data: { session: mockSession, user: mockSession.user },
        error: null,
      });

      // First call
      await exchangeAuthCodeSafely('reuse_code');
      expect(mockExchange).toHaveBeenCalledTimes(1);

      // Second call with same code
      const secondResult = await exchangeAuthCodeSafely('reuse_code');
      expect(mockExchange).toHaveBeenCalledTimes(1); // Still 1!
      expect(secondResult.session).toEqual(mockSession);
    });

    it('handles error gracefully when exchange fails', async () => {
      const mockError = { message: 'Invalid grant', name: 'AuthApiError' };
      mockExchange.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const result = await exchangeAuthCodeSafely('invalid_code');

      expect(mockExchange).toHaveBeenCalledTimes(1);
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('returns current session if code was already used and a session already exists', async () => {
      const existingSession = { access_token: 'active_tok', user: { id: 'u1' } };
      useAuthStore.setState({ session: existingSession as any });

      mockExchange.mockResolvedValueOnce({
        data: null,
        error: { message: 'OAuth flow state not found', code: 'bad_oauth_state' },
      });

      const result = await exchangeAuthCodeSafely('already_used_code');
      expect(result.session).toEqual(existingSession);
      expect(result.error).toBeNull();
    });

    it('returns error if code was already used but NO session exists', async () => {
      useAuthStore.setState({ session: null });

      mockExchange.mockResolvedValueOnce({
        data: null,
        error: { message: 'OAuth flow state not found', code: 'bad_oauth_state' },
      });

      const result = await exchangeAuthCodeSafely('already_used_code_no_session');
      expect(result.session).toBeNull();
      expect(result.error?.message).toContain('OAuth flow state');
    });
  });

  describe('URL deduplication (isUrlAlreadyHandled, markUrlHandled)', () => {
    it('tracks handled URLs and prevents duplicate processing', () => {
      const url = 'interviewready://auth/callback?code=abc12345';
      expect(isUrlAlreadyHandled(url)).toBe(false);

      markUrlHandled(url);
      expect(isUrlAlreadyHandled(url)).toBe(true);

      const differentUrl = 'interviewready://auth/callback?code=xyz98765';
      expect(isUrlAlreadyHandled(differentUrl)).toBe(false);
    });

    it('caps the handled URLs set size to avoid memory leaks', () => {
      for (let i = 0; i < 60; i++) {
        markUrlHandled(`interviewready://auth/callback?code=code_${i}`);
      }

      // Early URLs (0-9) should have been evicted when size exceeded 50
      expect(isUrlAlreadyHandled('interviewready://auth/callback?code=code_0')).toBe(false);
      // Recent URLs should still be tracked
      expect(isUrlAlreadyHandled('interviewready://auth/callback?code=code_59')).toBe(true);
    });
  });

  describe('In-flight exchange tracking (hasInFlightExchange, waitForAnyInFlightExchange)', () => {
    it('correctly reports in-flight status and waits for active exchanges', async () => {
      const mockSession = { access_token: 'async_token', user: { id: 'u_async' } };

      let resolveExchange: (value: any) => void;
      mockExchange.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveExchange = resolve;
          })
      );

      expect(hasInFlightExchange()).toBe(false);

      // Start an exchange in the background
      const exchangePromise = exchangeAuthCodeSafely('in_flight_code');

      expect(hasInFlightExchange()).toBe(true);

      // Concurrently wait for the in-flight exchange to settle
      const waitPromise = waitForAnyInFlightExchange();

      // Resolve the exchange
      resolveExchange!({ data: { session: mockSession, user: mockSession.user }, error: null });

      const [exchangeResult, waitResult] = await Promise.all([exchangePromise, waitPromise]);

      expect(exchangeResult.session).toEqual(mockSession);
      expect(waitResult?.session).toEqual(mockSession);
      expect(hasInFlightExchange()).toBe(false);
    });

    it('returns null from waitForAnyInFlightExchange if no exchanges are in flight', async () => {
      const res = await waitForAnyInFlightExchange();
      expect(res).toBeNull();
    });
  });
});
