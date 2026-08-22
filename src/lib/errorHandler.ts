import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

/**
 * Detects if an error message is an insufficient-credits error
 * (tagged with the INSUFFICIENT_CREDITS: prefix by api.ts interceptor).
 */
export function isInsufficientCreditsError(message?: string | null): boolean {
  if (!message || typeof message !== 'string') return false;
  return message.startsWith('INSUFFICIENT_CREDITS:') || message.toLowerCase().includes('insufficient credits') || message.toLowerCase().includes('not enough credits');
}

/**
 * Extracts the human-readable hint from a tagged credits error string.
 */
export function getCreditErrorHint(message?: string | null): string {
  if (!message || typeof message !== 'string') return 'Top up your credits to continue.';
  const cleaned = message.replace('INSUFFICIENT_CREDITS:', '').trim();
  return cleaned || 'Top up your credits to continue.';
}

/**
 * Detects if an error message is a rate-limited error
 * (tagged with the RATE_LIMITED: prefix by api.ts interceptor).
 */
export function isRateLimitedError(message?: string | null): boolean {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  if (lower.includes('email')) return false; // Handled separately by auth email rate limiter
  return message.startsWith('RATE_LIMITED:') || message.includes('429') || lower.includes('rate limit');
}

/**
 * Extracts the human-readable hint from a tagged rate-limit error string.
 */
export function getRateLimitHint(message?: string | null): string {
  if (!message || typeof message !== 'string') return 'The system is currently busy. Please try again in a moment.';
  if (message.startsWith('RATE_LIMITED:')) {
    const cleaned = message.replace('RATE_LIMITED:', '').trim();
    return cleaned || 'The system is currently busy. Please try again in a moment.';
  }
  return 'The system is currently busy. Please try again in a moment.';
}

/**
 * Converts any raw technical error (network failure, database exception,
 * HTTP status, server traceback, JSON parse error, Supabase error) into
 * clean, simple, human-friendly language.
 */
export function getUserFriendlyErrorMessage(rawError: any, fallbackMessage: string = 'Please try again in a moment.'): string {
  if (!rawError) return fallbackMessage;

  // Extract string message if rawError is an Error object or object with message/error property
  let message = '';
  if (typeof rawError === 'string') {
    message = rawError.trim();
  } else if (rawError instanceof Error) {
    message = rawError.message?.trim() || '';
  } else if (typeof rawError === 'object') {
    message = (rawError.message || rawError.error || rawError.error_description || rawError.details?.message || JSON.stringify(rawError)).trim();
  }

  if (!message) return fallbackMessage;

  const lower = message.toLowerCase();

  // 1. Credits
  if (isInsufficientCreditsError(message)) {
    return getCreditErrorHint(message);
  }

  // 2. Rate limits & Traffic
  if (isRateLimitedError(message) || lower.includes('worker_resource_limit') || lower.includes('too many requests')) {
    return getRateLimitHint(message);
  }

  // 3. Network / Connection Errors
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('internet disconnected') ||
    lower.includes('no internet') ||
    lower.includes('offline') ||
    lower.includes('connection refused') ||
    lower.includes('network error')
  ) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // 4. Timeouts & Aborts
  if (
    lower.includes('aborterror') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('deadline exceeded')
  ) {
    return 'The request took a bit too long. Please try again.';
  }

  // 5. Authentication & Account Credentials
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('wrong password') ||
    lower.includes('invalid_grant')
  ) {
    return 'Incorrect email or password. Please try again.';
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('email already in use') ||
    lower.includes('already registered') ||
    lower.includes('user with this email already exists')
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (
    lower.includes('email not confirmed') ||
    lower.includes('email not verified') ||
    lower.includes('not verified')
  ) {
    return 'Please check your email to confirm your account before signing in.';
  }

  if (
    lower.includes('jwt expired') ||
    lower.includes('invalid jwt') ||
    lower.includes('unauthorized_asymmetric_jwt') ||
    lower.includes('session has expired') ||
    lower.includes('refresh_token_not_found') ||
    lower.includes('invalid refresh token')
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  if (lower.includes('not authenticated') || lower.includes('user not authenticated')) {
    return 'Please sign in to continue.';
  }

  if (
    lower.includes('email rate limit exceeded') ||
    lower.includes('over_email_send_rate_limit') ||
    (lower.includes('email') && lower.includes('rate limit'))
  ) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }

  if (
    lower.includes('password should be at least') ||
    lower.includes('password is too short')
  ) {
    return 'Password must be at least 8 characters long.';
  }

  if (
    lower.includes('authentication canceled') ||
    lower.includes('user cancelled') ||
    lower.includes('popup closed')
  ) {
    return 'Sign-in was cancelled. Please try again.';
  }

  // 6. File & Document Uploads
  if (
    lower.includes('payload too large') ||
    lower.includes('413') ||
    lower.includes('entity too large') ||
    lower.includes('file too large') ||
    lower.includes('exceeds max')
  ) {
    return 'The selected file is too large. Please choose a file under 5MB.';
  }

  if (
    lower.includes('invalid file type') ||
    lower.includes('unsupported file') ||
    lower.includes('unsupported format') ||
    lower.includes('mime')
  ) {
    return 'Please upload a supported document (PDF, DOCX, PNG, or JPG).';
  }

  if (
    lower.includes('unsupported formdatapart') ||
    lower.includes('multipart') ||
    lower.includes('upload body') ||
    lower.includes('failed to upload') ||
    lower.includes('storage error') ||
    lower.includes('filenotfoundexception') ||
    lower.includes('nativerequest.start rejected')
  ) {
    return "We couldn't upload your document. Please check the file and try again.";
  }

  if (
    lower.includes('could not read job link') ||
    lower.includes('scrape_failed') ||
    lower.includes('extract content') ||
    lower.includes('link inaccessible')
  ) {
    return "We couldn't read that job link. Please paste the job text or attach a file instead.";
  }

  if (
    lower.includes('parsing failed') ||
    lower.includes('failed to extract') ||
    lower.includes('extraction failed') ||
    lower.includes('could not parse resume')
  ) {
    return "We couldn't read the text from that document. Please try pasting the text or using another file.";
  }

  // 7. Server, Edge Function & AI Processing
  if (
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('internal server error') ||
    lower.includes('non-2xx status code') ||
    lower.includes('internal_error') ||
    lower.includes('edge function')
  ) {
    return 'Our servers encountered a temporary issue. Please try again in a moment.';
  }

  if (
    lower.includes('json parse error') ||
    lower.includes('syntaxerror') ||
    lower.includes('unexpected token') ||
    lower.includes('empty response') ||
    lower.includes('ai generation failed')
  ) {
    return 'AI processing was interrupted. Please try again.';
  }

  // 8. Database Technical Errors
  if (
    lower.includes('pgrst') ||
    lower.includes('postgrest') ||
    lower.includes('duplicate key') ||
    lower.includes('foreign key') ||
    lower.includes('violates') ||
    lower.includes('relation') ||
    lower.includes('column') ||
    lower.includes('row-level security') ||
    lower.includes('null value in column')
  ) {
    return "We couldn't complete this action right now. Please try again.";
  }

  // 9. Payment Errors
  if (
    lower.includes('card_declined') ||
    lower.includes('insufficient_funds') ||
    lower.includes('expired_card') ||
    lower.includes('payment failed')
  ) {
    return 'Your payment could not be processed. Please check your card details or try a different method.';
  }

  // 10. Filter out unformatted technical strings (stack traces, code identifiers, URLs)
  const isTechnicalCode =
    message.includes(' at ') ||
    message.includes('Error:') ||
    message.includes('Exception') ||
    message.includes('http://') ||
    message.includes('https://') ||
    message.includes('{') ||
    /^[A-Z0-9_]{5,}$/.test(message);

  if (isTechnicalCode) {
    return fallbackMessage;
  }

  // If the message is already clean, user-facing English, return it
  return message;
}

/**
 * Alias for getUserFriendlyErrorMessage
 */
export const sanitizeErrorMessage = getUserFriendlyErrorMessage;

/**
 * Universal API error handler.
 * - Shows an insufficient-credits toast with a "Get Credits" CTA if applicable.
 * - Shows a rate-limited toast with a retry hint if applicable.
 * - Automatically converts raw technical errors into simple, friendly user messages.
 *
 * Usage:
 *   } catch (e: any) {
 *     handleApiError(e.message);
 *   }
 */
export function handleApiError(
  rawError: any,
  options?: {
    fallbackTitle?: string;
    fallbackMessage?: string;
  }
): void {
  const rawString = typeof rawError === 'string' ? rawError : rawError?.message || '';

  if (isInsufficientCreditsError(rawString)) {
    const hint = getCreditErrorHint(rawString);
    Toast.show({
      type: 'error',
      text1: 'Subscription Required',
      text2: `${hint} Choose a subscription plan for unlimited access.`,
      visibilityTime: 5000,
      onPress: () => {
        Toast.hide();
        router.push('/(tabs)/pricing?reason=low_credits' as any);
      },
    });
    try {
      router.push('/(tabs)/pricing?reason=low_credits' as any);
    } catch {
      // Ignore if navigation is already in progress
    }
    return;
  }

  if (isRateLimitedError(rawString)) {
    const hint = getRateLimitHint(rawString);
    Toast.show({
      type: 'error',
      text1: 'Too many requests',
      text2: hint,
      visibilityTime: 4000,
    });
    return;
  }

  const friendlyMessage = getUserFriendlyErrorMessage(rawError, options?.fallbackMessage || 'Please try again.');

  Toast.show({
    type: 'error',
    text1: options?.fallbackTitle || 'Something went wrong',
    text2: friendlyMessage,
    visibilityTime: 4000,
  });
}