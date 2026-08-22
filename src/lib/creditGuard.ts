import { router as globalRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useCredits } from '../hooks/useCredits';
import { useAuthStore } from '../stores/auth-store';

export const MIN_CREDITS_THRESHOLD = 2;

export interface CreditGuardParams {
  router?: any;
  credits?: number | null;
  isPro?: boolean;
  minThreshold?: number;
  featureName?: string;
}

/**
 * Checks if a user has sufficient credits to perform an AI operation.
 * Pro subscribers always have access regardless of numerical credit count.
 */
export function hasSufficientCredits(
  credits: number | null | undefined,
  isPro: boolean,
  minThreshold: number = MIN_CREDITS_THRESHOLD
): boolean {
  if (isPro) return true;
  if (credits === null || credits === undefined) return true;
  return credits >= minThreshold;
}

/**
 * Enforces the credit threshold. If the user has fewer than 2 credits and is not Pro,
 * it alerts the user and redirects them to the subscription billing screen.
 *
 * @returns {boolean} `true` if user can proceed, `false` if blocked & redirected.
 */
export function checkAndEnforceCreditGuard(params: CreditGuardParams = {}): boolean {
  const {
    router = globalRouter,
    credits,
    isPro = false,
    minThreshold = MIN_CREDITS_THRESHOLD,
    featureName,
  } = params;

  if (hasSufficientCredits(credits, isPro, minThreshold)) {
    return true;
  }

  const featureText = featureName ? ` to use ${featureName}` : '';

  Toast.show({
    type: 'error',
    text1: 'Subscription Required',
    text2: `You need at least ${minThreshold} credits${featureText}. Please choose a subscription plan to continue.`,
    visibilityTime: 4500,
  });

  try {
    router.push('/(tabs)/pricing?reason=low_credits' as any);
  } catch (err) {
    console.error('Failed to navigate to billing screen:', err);
  }

  return false;
}

/**
 * Custom React hook for checking credit sufficiency before executing AI actions.
 */
export function useCreditGuard() {
  const { balance } = useCredits();
  const { user } = useAuthStore();

  const isPro =
    user?.user_metadata?.is_pro === true ||
    user?.user_metadata?.plan === 'pro' ||
    user?.user_metadata?.subscription === 'pro' ||
    balance?.plan === 'PREMIUM' ||
    balance?.plan === 'PREMIUM_PLUS';

  const credits = balance !== null ? balance.balance : null;
  const isLowCredits = !isPro && balance !== null && balance.balance < MIN_CREDITS_THRESHOLD;

  const requireCredits = (featureName?: string, minThreshold: number = MIN_CREDITS_THRESHOLD): boolean => {
    return checkAndEnforceCreditGuard({
      router: globalRouter,
      credits,
      isPro,
      minThreshold,
      featureName,
    });
  };

  const navigateToBilling = (reason: string = 'low_credits') => {
    globalRouter.push(`/(tabs)/pricing?reason=${encodeURIComponent(reason)}` as any);
  };

  return {
    credits,
    isPro,
    isLowCredits,
    requireCredits,
    navigateToBilling,
  };
}
