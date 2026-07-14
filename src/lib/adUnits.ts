import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// In development, always use Google's official test IDs to avoid policy violations.
// In production, pull from environment variables set per platform.

function getAdUnitId(
  androidEnvKey: string,
  iosEnvKey: string,
  testId: string
): string {
  if (__DEV__) return testId;

  const id = Platform.OS === 'android'
    ? process.env[androidEnvKey]
    : process.env[iosEnvKey];

  return id || testId; // fallback to test ID if env var is missing
}

export const AdUnits = {
  banner: getAdUnitId(
    'EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID',
    'EXPO_PUBLIC_ADMOB_IOS_BANNER_ID',
    TestIds.ADAPTIVE_BANNER
  ),
  interstitial: getAdUnitId(
    'EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID',
    'EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID',
    TestIds.INTERSTITIAL
  ),
  rewarded: getAdUnitId(
    'EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID',
    'EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID',
    TestIds.REWARDED
  ),
};
