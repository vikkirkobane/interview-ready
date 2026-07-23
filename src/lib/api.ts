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
        return { data: null, error: null };
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
        // Differentiate between our rate limiter and Supabase infra limits
        if (errorData.code === 'WORKER_RESOURCE_LIMIT') {
          return {
            data: null,
            error: "The system is currently busy processing requests. Please wait a moment and try again.",
          };
        }
        // Check if there's a retryAfter hint from the server
        const retryAfter = errorData.details?.retryAfter;
        if (retryAfter) {
          return {
            data: null,
            error: `RATE_LIMITED:Too many requests. Please wait ${retryAfter} seconds before trying again.`,
          };
        }
        return {
          data: null,
          error: "RATE_LIMITED:Too many requests are being processed right now. Please try again in a few moments.",
        };
      }

      // Global interceptor for Insufficient Credits
      if (
        errorData.code === 'INSUFFICIENT_CREDITS' ||
        response.status === 402
      ) {
        const required = errorData.details?.required ?? errorData.required ?? '';
        const available = errorData.details?.available ?? errorData.available ?? '';
        const hint = required && available
          ? `You need ${required} credits but only have ${available}.`
          : 'Top up your credits to continue.';
        return {
          data: null,
          error: `INSUFFICIENT_CREDITS:${hint}`,
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
        console.warn('[Upload] Token auto-refresh failed:', e);
      }
    }

    if (Platform.OS === 'web') {
      const formData = new FormData();
      if (webFile) {
        (formData as any).append('file', webFile, fileName);
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {}
        return { data: null, error: errorMsg };
      }

      const data = await response.json();
      return { data, error: null };
    } else {
      if (!fileUri) {
        return { data: null, error: 'File not found or empty' };
      }

      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`;
      
      try {
        const uploadResult = await FileSystem.uploadAsync(url, fileUri, {
          httpMethod: 'POST',
          uploadType: (FileSystem as any).FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: mimeType || 'application/octet-stream',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          let errorMsg = 'Upload failed';
          try {
            const errJson = JSON.parse(uploadResult.body);
            errorMsg = errJson.error || errorMsg;
          } catch {}
          return { data: null, error: errorMsg };
        }

        const data = JSON.parse(uploadResult.body);
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err.message || 'Upload failed' };
      }
    }
  } catch (err: any) {
    console.error('[Upload] Upload error:', err);
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
