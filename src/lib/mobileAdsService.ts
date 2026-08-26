import mobileAds from 'react-native-google-mobile-ads';

/**
 * Native initialization of Google Mobile Ads
 */
export function initMobileAds() {
  try {
    mobileAds()
      .initialize()
      .catch((err) => {
        console.warn('[AdMob] Failed to initialize mobile ads:', err);
      });
  } catch (err) {
    console.warn('[AdMob] Init exception:', err);
  }
}
