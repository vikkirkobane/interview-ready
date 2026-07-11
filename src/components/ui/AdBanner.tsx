import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Use the production ID from environment variables, or fallback to the test ID if not set.
// In development mode (__DEV__), always use the TestIds.ADAPTIVE_BANNER to prevent account bans.
const adUnitId = __DEV__ 
  ? TestIds.ADAPTIVE_BANNER 
  : (process.env.EXPO_PUBLIC_ADMOB_ANDROID_AD_UNIT_ID || TestIds.ADAPTIVE_BANNER);

export const AdBanner = () => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // If ad fails to load, gracefully collapse the space instead of showing a blank area
    return null;
  }

  return (
    <View style={styles.container}>
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
