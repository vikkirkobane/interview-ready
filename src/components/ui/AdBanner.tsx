import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdUnits } from '../../lib/adUnits';
import { useAuthStore } from '../../stores/auth-store';
import { Spacing } from '../../theme';

export interface AdBannerProps {
  mode?: 'inline' | 'anchored';
  size?: BannerAdSize;
  adSlot?: string;
  adClient?: string;
  adFormat?: string;
  adLayout?: string;
  adLayoutKey?: string;
  fullWidthResponsive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  mode = 'inline',
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
  style,
}) => {
  const [hasError, setHasError] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const isPro =
    user?.user_metadata?.is_pro === true ||
    user?.user_metadata?.plan === 'pro' ||
    user?.user_metadata?.subscription === 'pro';

  if (isPro || hasError) {
    return null;
  }

  if (mode === 'anchored') {
    const tabBarHeight = 72;
    const tabBarBottomOffset = insets.bottom > 0 ? insets.bottom + 8 : Spacing.md;
    const bottomPosition = tabBarHeight + tabBarBottomOffset;

    return (
      <View style={[styles.anchoredContainer, { bottom: bottomPosition }, style]}>
        <BannerAd
          unitId={AdUnits.banner}
          size={size}
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
  }

  return (
    <View style={[styles.inlineContainer, style]}>
      <BannerAd
        unitId={AdUnits.banner}
        size={size}
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
  anchoredContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'transparent',
    zIndex: 50,
    elevation: 50,
  },
  inlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: Spacing.md,
    backgroundColor: 'transparent',
  },
});

