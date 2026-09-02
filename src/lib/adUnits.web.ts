/**
 * Web configuration for Google AdSense.
 */
export const AdUnits = {
  client: process.env.EXPO_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-3023396295642660',
  banner: process.env.EXPO_PUBLIC_ADSENSE_SLOT_BANNER || '4290296424',
  interstitial: '',
  rewarded: '',
};
