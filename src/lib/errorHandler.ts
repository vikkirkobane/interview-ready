import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

/**
 * Detects if an error message is an insufficient-credits error
 * (tagged with the INSUFFICIENT_CREDITS: prefix by api.ts interceptor).
 */
export function isInsufficientCreditsError(message: string): boolean {
  return message?.startsWith('INSUFFICIENT_CREDITS:');
}

/**
 * Extracts the human-readable hint from a tagged credits error string.
 */
export function getCreditErrorHint(message: string): string {
  return message?.replace('INSUFFICIENT_CREDITS:', '') || 'Top up your credits to continue.';
}

/**
 * Universal API error handler.
 * - Shows an insufficient-credits toast with a "Get Credits" CTA if applicable.
 * - Falls back to a standard error toast for all other errors.
 *
 * Usage:
 *   } catch (e: any) {
 *     handleApiError(e.message);
 *   }
 */
export function handleApiError(
  message: string,
  options?: {
    fallbackTitle?: string;
  }
): void {
  if (isInsufficientCreditsError(message)) {
    const hint = getCreditErrorHint(message);
    Toast.show({
      type: 'error',
      text1: 'Not enough credits',
      text2: `${hint} Tap to get more.`,
      visibilityTime: 5000,
      onPress: () => {
        Toast.hide();
        router.push('/(tabs)/pricing');
      },
    });
    return;
  }

  Toast.show({
    type: 'error',
    text1: options?.fallbackTitle || 'Something went wrong',
    text2: message || 'Please try again.',
    visibilityTime: 4000,
  });
}
