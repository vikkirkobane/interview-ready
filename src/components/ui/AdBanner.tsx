import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';

// Use the production ID from environment variables, or fallback to the test ID if not set.
// In development mode (__DEV__), always use the TestIds.ADAPTIVE_BANNER to prevent account bans.
const adUnitId = __DEV__ 
  ? TestIds.ADAPTIVE_BANNER 
  : (process.env.EXPO_PUBLIC_ADMOB_ANDROID_AD_UNIT_ID || TestIds.ADAPTIVE_BANNER);

export const AdBanner = () => {
  const [hasError, setHasError] = useState(false);
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  // Check if we are inside the tabs layout
  // Cast segments to string[] to avoid 'never' type errors with expo-router
  const inTabs = (segments as string[]).includes('(tabs)');
  
  // Calculate the position above the floating tab bar:
  // tab bar height is 72, plus its bottom offset
  const tabBarHeight = 72;
  const tabBarBottomOffset = insets.bottom > 0 ? insets.bottom + 8 : 16;
  const bottomPosition = tabBarHeight + tabBarBottomOffset + 10; // +10 for visual padding above the nav

  if (hasError) {
    // If ad fails to load, gracefully collapse the space instead of showing a blank area
    return null;
  }

  return (
    <View style={[
      styles.container,
      inTabs && {
        paddingBottom: tabBarHeight + tabBarBottomOffset,
      }
    ]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // For GDPR compliance if applicable
        }}
        onAdFailedToLoad={(error) => {
          console.warn('AdMob Banner Failed to Load:', error);
          setHasError(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
});
