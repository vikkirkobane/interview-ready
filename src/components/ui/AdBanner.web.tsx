import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useAuthStore } from '../../stores/auth-store';
import { AdUnits } from '../../lib/adUnits.web';
import { Spacing } from '../../theme';

export interface AdBannerProps {
  mode?: 'inline' | 'anchored';
  adSlot?: string;
  adClient?: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  fullWidthResponsive?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: any;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({
  mode = 'inline',
  adSlot = AdUnits.banner,
  adClient = AdUnits.client,
  adFormat = 'auto',
  fullWidthResponsive = true,
  style,
}) => {
  const { user } = useAuthStore();
  const [hasError, setHasError] = useState(false);
  const isPushedRef = useRef(false);

  const isPro =
    user?.user_metadata?.is_pro === true ||
    user?.user_metadata?.plan === 'pro' ||
    user?.user_metadata?.subscription === 'pro';

  useEffect(() => {
    if (isPro || hasError || isPushedRef.current) return;

    try {
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        isPushedRef.current = true;
      }
    } catch (e) {
      console.warn('[AdSense] Failed to push ad unit:', e);
      setHasError(true);
    }
  }, [isPro, hasError]);

  if (isPro || hasError) {
    return null;
  }

  return (
    <View
      style={[
        mode === 'anchored' ? styles.anchoredContainer : styles.inlineContainer,
        style,
      ]}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          minHeight: 50,
          textAlign: 'center',
          overflow: 'hidden',
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  anchoredContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'transparent',
    zIndex: 40,
    elevation: 40,
  },
});

