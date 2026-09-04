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
  adLayout?: 'in-article' | string;
  adLayoutKey?: string;
  fullWidthResponsive?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: any;
  onStatusChange?: (status: 'filled' | 'unfilled') => void;
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
  adLayout,
  adLayoutKey,
  fullWidthResponsive = true,
  style,
  onStatusChange,
}) => {
  const { user } = useAuthStore();
  const [hasError, setHasError] = useState(false);
  const [adStatus, setAdStatus] = useState<'pending' | 'filled' | 'unfilled'>('pending');
  const isPushedRef = useRef(false);
  const insRef = useRef<HTMLElement | null>(null);

  const isPro =
    user?.user_metadata?.is_pro === true ||
    user?.user_metadata?.plan === 'pro' ||
    user?.user_metadata?.subscription === 'pro';

  // Listen for AdSense slot status changes
  useEffect(() => {
    const node = insRef.current;
    if (!node || typeof window === 'undefined') return;

    const evaluateStatus = () => {
      const status = node.getAttribute('data-ad-status');
      const adsbygoogleStatus = node.getAttribute('data-adsbygoogle-status');

      if (status === 'unfilled') {
        setAdStatus('unfilled');
        onStatusChange?.('unfilled');
      } else if (status === 'filled' || (adsbygoogleStatus === 'done' && node.querySelector('iframe'))) {
        setAdStatus('filled');
        onStatusChange?.('filled');
      }
    };

    evaluateStatus();

    if ('MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        evaluateStatus();
      });

      observer.observe(node, {
        attributes: true,
        attributeFilter: ['data-ad-status', 'data-adsbygoogle-status'],
        childList: true,
      });

      // Fallback: If after 4.5s AdSense hasn't filled the unit (e.g. adblocker or no fill), mark as unfilled
      const timeout = setTimeout(() => {
        if (node.getAttribute('data-ad-status') !== 'filled' && !node.querySelector('iframe')) {
          setAdStatus('unfilled');
          onStatusChange?.('unfilled');
        }
      }, 4500);

      return () => {
        observer.disconnect();
        clearTimeout(timeout);
      };
    }
  }, [onStatusChange]);

  useEffect(() => {
    if (isPro || hasError || isPushedRef.current) return;

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
          isPushedRef.current = true;
        }
      } catch (e) {
        console.warn('[AdSense] Failed to push ad unit:', e);
        setHasError(true);
        setAdStatus('unfilled');
        onStatusChange?.('unfilled');
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isPro, hasError, onStatusChange]);

  // Hide completely if Pro, has error, or determined unfilled
  if (isPro || hasError || adStatus === 'unfilled') {
    return null;
  }

  const isFilled = adStatus === 'filled';

  return (
    <View
      style={[
        mode === 'anchored' ? styles.anchoredContainer : styles.inlineContainer,
        !isFilled && styles.pendingContainer,
        style,
      ]}
    >
      <ins
        ref={insRef as any}
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          minHeight: isFilled ? (adFormat === 'fluid' ? 60 : 90) : 0,
          textAlign: 'center',
          overflow: isFilled ? 'visible' : 'hidden',
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        {...(adLayout ? { 'data-ad-layout': adLayout } : {})}
        {...(adLayoutKey ? { 'data-ad-layout-key': adLayoutKey } : {})}
        {...(adFormat !== 'fluid'
          ? { 'data-full-width-responsive': fullWidthResponsive ? 'true' : 'false' }
          : {})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    width: '100%',
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: 'transparent',
  },
  anchoredContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'transparent',
    zIndex: 40,
    elevation: 40,
  },
  pendingContainer: {
    minHeight: 0,
    paddingVertical: 0,
    height: 0,
    overflow: 'hidden',
  },
});
