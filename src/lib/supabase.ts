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

const fallbackUrl = 'https://rdxcvqcxgvdgvxvfkhlr.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGN2cWN4Z3ZkZ3Z4dmZraGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NTk1MDMsImV4cCI6MjA5NzUzNTUwM30.DlX5eiLs0jnMRu0T89mKYWv_XjzBwwiqufJJyTr7XhM';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || fallbackUrl;
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || fallbackKey;

if (__DEV__ && (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn(
    '[Supabase] Missing env vars! Create a .env file with:\n' +
    '  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}


const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform?.OS === 'web') {
      try {
        const ls = (globalThis as any).localStorage;
        if (!ls) return Promise.resolve(null);
        return Promise.resolve(ls.getItem(key));
      } catch { return Promise.resolve(null); }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform?.OS === 'web') {
      try {
        const ls = (globalThis as any).localStorage;
        if (!ls) return Promise.resolve();
        ls.setItem(key, value);
        return Promise.resolve();
      } catch { return Promise.resolve(); }
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform?.OS === 'web') {
      try {
        const ls = (globalThis as any).localStorage;
        if (!ls) return Promise.resolve();
        ls.removeItem(key);
        return Promise.resolve();
      } catch { return Promise.resolve(); }
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
