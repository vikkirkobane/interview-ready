import { exchangeAuthCodeSafely, _resetCodeExchangeCache } from '../../src/lib/auth-code-exchange';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/auth-store';

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

describe('exchangeAuthCodeSafely', () => {
  const mockExchange = supabase.auth.exchangeCodeForSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetCodeExchangeCache();
    useAuthStore.setState({ session: null, user: null });
  });

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
});
