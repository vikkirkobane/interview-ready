import { useEffect, useState } from 'react';
import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AdUnits } from './adUnits';

export function useInterstitialAd() {
  const [loaded, setLoaded] = useState(false);
  const [ad] = useState(() =>
    InterstitialAd.createForAdRequest(AdUnits.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  useEffect(() => {
    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true);
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load(); // preload next ad immediately after close
    });
    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.warn('[AdMob] Interstitial error:', error);
        setLoaded(false);
      }
    );

    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [ad]);

  const showAd = () => {
    if (loaded) {
      ad.show();
    }
  };

  return { showAd, loaded };
}
