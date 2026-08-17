import 'react-native-url-polyfill/auto';
import * as Crypto from 'expo-crypto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Polyfill WebCrypto API for Supabase GoTrue PKCE (S256 code challenges)
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (!globalThis.crypto.getRandomValues) {
  (globalThis.crypto as any).getRandomValues = Crypto.getRandomValues;
}
if (!globalThis.crypto.subtle) {
  (globalThis.crypto as any).subtle = {
    digest: async (algorithm: any, data: BufferSource) => {
      const algoName = typeof algorithm === 'string' ? algorithm : algorithm?.name;
      if (algoName === 'SHA-256' || algoName === 'SHA256') {
        return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
      }
      return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
    },
  };
}


/**
 * Supabase client configured for Expo React Native.
 * Uses SecureStore for token persistence on mobile, localStorage on web.
 *
 * IMPORTANT: Set these env vars in your .env file:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[Supabase] Missing env vars! Create a .env file with:\n' +
    '  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}


const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      try {
        const ls = (globalThis as any).localStorage;
        if (!ls) return Promise.resolve(null);
        return Promise.resolve(ls.getItem(key));
      } catch { return Promise.resolve(null); }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        const ls = (globalThis as any).localStorage;
        if (ls) ls.setItem(key, value);
      } catch {}
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      try {
        const ls = (globalThis as any).localStorage;
        if (ls) ls.removeItem(key);
      } catch {}
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
