import { supabase } from './supabase';
import { useAuthStore } from '../stores/auth-store';
import type { Session, AuthError } from '@supabase/supabase-js';

// Cache of codes exchanged within this app session to prevent duplicate network calls.
const processedCodes = new Set<string>();

// In-flight exchanges map to handle simultaneous triggers (e.g. openAuthSessionAsync return + Linking event).
const inFlightExchanges = new Map<string, Promise<{ session: Session | null; error: AuthError | null }>>();

/**
 * Safely exchanges a PKCE authorization code for a Supabase session.
 * Deduplicates simultaneous calls for the same code and avoids re-exchanging
 * single-use codes that have already been exchanged.
 */
export async function exchangeAuthCodeSafely(code: string): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  if (!code) {
    return { session: null, error: null };
  }

  // If code was already exchanged in this session, return current session
  if (processedCodes.has(code)) {
    const currentSession = useAuthStore.getState().session;
    return { session: currentSession, error: null };
  }

  // If this code is currently being exchanged, join the existing promise
  if (inFlightExchanges.has(code)) {
    return inFlightExchanges.get(code)!;
  }

  const exchangePromise = (async () => {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        // If the error indicates the code/state was already used, check if we already have a valid session
        const isAlreadyUsed =
          error.message?.toLowerCase().includes('already been used') ||
          error.message?.toLowerCase().includes('flow state') ||
          (error as any).code === 'flow_state_not_found';

        const currentSession = useAuthStore.getState().session;
        if (isAlreadyUsed && currentSession) {
          return { session: currentSession, error: null };
        }

        return { session: null, error };
      }

      if (data?.session) {
        processedCodes.add(code);
        useAuthStore.getState().setSession(data.session);
        return { session: data.session, error: null };
      }

      return { session: null, error: null };
    } catch (err: any) {
      return {
        session: null,
        error: {
          name: 'AuthExchangeError',
          message: err?.message || 'Failed to exchange authorization code',
        } as AuthError,
      };
    } finally {
      inFlightExchanges.delete(code);
    }
  })();

  inFlightExchanges.set(code, exchangePromise);
  return exchangePromise;
}

/**
 * Resets the code cache (useful for testing).
 */
export function _resetCodeExchangeCache() {
  processedCodes.clear();
  inFlightExchanges.clear();
}
