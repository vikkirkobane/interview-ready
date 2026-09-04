/**
 * Web configuration for Google AdSense.
 */
export const AdUnits = {
  client: process.env.EXPO_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-3023396295642660',
  banner: process.env.EXPO_PUBLIC_ADSENSE_SLOT_BANNER || '4290296424',
  inFeed: process.env.EXPO_PUBLIC_ADSENSE_SLOT_INFEED || process.env.EXPO_PUBLIC_ADSENSE_SLOT_BANNER || '4290296424',
  inFeedLayoutKey: process.env.EXPO_PUBLIC_ADSENSE_LAYOUT_KEY || '',
  inArticle: process.env.EXPO_PUBLIC_ADSENSE_SLOT_INARTICLE || process.env.EXPO_PUBLIC_ADSENSE_SLOT_BANNER || '4290296424',
  interstitial: '',
  rewarded: '',
};
