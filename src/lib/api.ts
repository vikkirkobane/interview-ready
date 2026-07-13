import { supabase } from './supabase';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';

declare let window: any;

/**
 * Helper to call Supabase Edge Functions with automatic auth header injection.
 * All AI endpoints and server logic go through Edge Functions.
 */

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export async function apiCall<T = any>(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST',
  body?: Record<string, any> | FormData,
): Promise<ApiResponse<T>> {
  try {
    let { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      return { data: null, error: 'Not authenticated' };
    }

    // Auto-refresh session token if it's expired or close to expiry (within 30 seconds)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt && expiresAt - now < 30) {
      try {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshedSession) {
          session = refreshedSession;
        }
      } catch (e) {
        console.warn('[API] Token auto-refresh failed:', e);
      }
    }

    const isFormData = body instanceof FormData;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.access_token}`,
    };
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method,
        headers,
        body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Response:', errorData); // <-- Added debug log
      
      // Global interceptor for invalid or expired session
      if (response.status === 401 || errorData.code === 'UNAUTHORIZED_ASYMMETRIC_JWT' || errorData.message === 'Invalid JWT') {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('[API] Sign out failed during token reset:', e);
        }
        if (Platform.OS === 'web') {
          (window as any).location.href = '/login';
        } else {
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 100);
        }
        return { data: null, error: 'Your session has expired. Please sign in again.' };
      }

      // Global interceptor for missing profile
      if (errorData.code === 'NOT_FOUND' && errorData.error?.includes('User profile not found')) {
        // Silently redirect to onboarding without any popups
        if (Platform.OS === 'web') {
          (window as any).location.href = '/role';
        } else {
          setTimeout(() => {
            router.replace('/(onboarding)/role');
          }, 100);
        }
      }

      // Global interceptor for API Rate Limits and Resource Limits
      const detailsMsg = errorData.details?.message || '';
      const errMsg = errorData.error || '';
      const isRateLimited = 
        errorData.code === 'RATE_LIMITED' || 
        errorData.code === 'WORKER_RESOURCE_LIMIT' ||
        detailsMsg.includes('429') || 
        detailsMsg.toLowerCase().includes('rate limit') ||
        errMsg.toLowerCase().includes('rate limit');

      if (isRateLimited) {
        return {
          data: null,
          error: "Sorry, too many requests are being processed right now. Please try again in a few moments.",
        };
      }

      return {
        data: null,
        error: errorData.error || `Request failed with status ${response.status}`,
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Network error. Please check your connection.',
    };
  }
}

/**
 * Upload a file directly to a Supabase Edge Function.
 * Uses native fetch + FormData which works correctly in Expo SDK 56+ on both web and native.
 */
export async function apiUploadFile<T = any>(
  functionName: string,
  fileUri: string,
  fileName: string,
  mimeType: string,
  webFile?: Blob | null
): Promise<ApiResponse<T>> {
  try {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      return { data: null, error: 'Not authenticated' };
    }

    const formData = new FormData();
    if (Platform.OS === 'web' && webFile) {
      // Web: use the Blob directly
      (formData as any).append('file', webFile, fileName);
    } else {
      // Native: read the file bytes and create a real Blob
      // This avoids the "Unsupported FormDataPart Implementation" error
      // that occurs when a plain object { uri, name, type } is passed to FormData
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        return { data: null, error: 'File not found' };
      }
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const byteCharacters = atob(base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: mimeType || 'application/octet-stream' });
      (formData as any).append('file', blob, fileName);
    }

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      let errorMsg = 'Upload failed';
      try {
        const errJson = await response.json();
        errorMsg = errJson.error || errorMsg;
      } catch (e) {}
      return { data: null, error: errorMsg };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Upload failed' };
  }
}

/**
 * Error codes returned by Edge Functions.
 * Match the codes defined in _shared/errors.ts
 */
export const ErrorCodes = {
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
