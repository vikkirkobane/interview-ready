import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdUnits } from '../../lib/adUnits';
import { Spacing } from '../../theme';

export const AdBanner = () => {
  const [hasError, setHasError] = useState(false);
  const insets = useSafeAreaInsets();

  // The floating tab bar has a height of 72 and is positioned from the bottom
  // by (insets.bottom > 0 ? insets.bottom + 8 : Spacing.md)
  // We place the banner exactly above it.
  const tabBarHeight = 72;
  const tabBarBottomOffset = insets.bottom > 0 ? insets.bottom + 8 : Spacing.md;
  const bottomPosition = tabBarHeight + tabBarBottomOffset + 8; // 8px visual gap

  if (hasError) {
    return null;
  }

  return (
    <View style={[styles.container, { bottom: bottomPosition }]}>
      <BannerAd
        unitId={AdUnits.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.warn('[AdMob] Banner failed to load:', error);
          setHasError(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 4,
    backgroundColor: 'transparent',
    zIndex: 50,
    elevation: 50,
  },
});
