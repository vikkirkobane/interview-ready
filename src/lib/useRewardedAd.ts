import { useEffect, useState, useCallback } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { AdUnits } from './adUnits';

interface UseRewardedAdOptions {
  onRewarded: (amount: number, type: string) => void;
}

export function useRewardedAd({ onRewarded }: UseRewardedAdOptions) {
  const [loaded, setLoaded] = useState(false);
  const [ad] = useState(() =>
    RewardedAd.createForAdRequest(AdUnits.rewarded, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  useEffect(() => {
    const unsubscribeLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setLoaded(true)
    );
    const unsubscribeEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        onRewarded(reward.amount, reward.type);
      }
    );
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false);
      ad.load(); // preload next ad
    });
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
      console.warn('[AdMob] Rewarded ad error:', err);
      setLoaded(false);
    });

    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [ad, onRewarded]);

  const showAd = useCallback(() => {
    if (loaded) ad.show();
  }, [ad, loaded]);

  return { showAd, loaded };
}
