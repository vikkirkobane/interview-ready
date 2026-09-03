import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSegments } from 'expo-router';
import { useAuthStore } from '../../stores/auth-store';
import { AdUnits } from '../../lib/adUnits.web';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

/**
 * Desktop Skyscraper Gutter Banners (Web Only).
 * Places long vertical AdSense units in the empty side gutters on wide desktop displays (>= 1340px).
 * Automatically hidden on mobile, tablet, or smaller laptops to prevent covering centered content.
 */
export const AdSideGutters: React.FC = () => {
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const segments = useSegments();
  const [hasError, setHasError] = useState(false);
  const leftPushedRef = useRef(false);
  const rightPushedRef = useRef(false);

  const isPro =
    user?.user_metadata?.is_pro === true ||
    user?.user_metadata?.plan === 'pro' ||
    user?.user_metadata?.subscription === 'pro';

  // Determine current route safety
  const segs = segments as (string | undefined)[];
  const firstSegment = segs[0] as string | undefined;
  const secondSegment = segs[1] as string | undefined;

  // Never show side gutter ads on landing, auth, onboarding, mock interview, or payment
  const isExcludedRoute =
    !firstSegment ||
    firstSegment === 'index' ||
    firstSegment === '(auth)' ||
    firstSegment === 'auth' ||
    firstSegment === '(onboarding)' ||
    firstSegment === 'payment' ||
    secondSegment === 'interview'; // Live interview screen

  const isDesktopWide = width >= 1340;

  useEffect(() => {
    if (isPro || hasError || isExcludedRoute || !isDesktopWide) return;

    const timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          window.adsbygoogle = window.adsbygoogle || [];
          if (!leftPushedRef.current) {
            window.adsbygoogle.push({});
            leftPushedRef.current = true;
          }
          if (!rightPushedRef.current) {
            window.adsbygoogle.push({});
            rightPushedRef.current = true;
          }
        }
      } catch (e) {
        console.warn('[AdSense] Side gutters push failed:', e);
        setHasError(true);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isPro, hasError, isExcludedRoute, isDesktopWide]);

  if (isPro || hasError || isExcludedRoute || !isDesktopWide) {
    return null;
  }

  return (
    <>
      {/* Left Desktop Skyscraper */}
      <View style={styles.leftGutter}>
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '160px',
            height: '600px',
          }}
          data-ad-client={AdUnits.client}
          data-ad-slot={AdUnits.banner}
          data-ad-format="vertical"
        />
      </View>

      {/* Right Desktop Skyscraper */}
      <View style={styles.rightGutter}>
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '160px',
            height: '600px',
          }}
          data-ad-client={AdUnits.client}
          data-ad-slot={AdUnits.banner}
          data-ad-format="vertical"
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  leftGutter: {
    position: 'fixed' as any,
    top: 90,
    left: 16,
    width: 160,
    height: 600,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightGutter: {
    position: 'fixed' as any,
    top: 90,
    right: 16,
    width: 160,
    height: 600,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

