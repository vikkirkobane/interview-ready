const React = require('react');
const { View } = require('react-native');

const makeAd = () => {
  const instance = {
    load: jest.fn(),
    show: jest.fn(),
    addAdEventListener: jest.fn(() => jest.fn()),
    onAdLoaded: null,
    onAdFailedToLoad: null,
    onAdClosed: null,
  };
  return instance;
};

module.exports = {
  __esModule: true,
  BannerAd: ({ children, ...props }) => React.createElement(View, props, children),
  BannerAdSize: {
    BANNER: 'BANNER',
    LARGE_BANNER: 'LARGE_BANNER',
    INLINE_ADAPTIVE_BANNER: 'INLINE_ADAPTIVE_BANNER',
    ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
    FULL_BANNER: 'FULL_BANNER',
    LEADERBOARD: 'LEADERBOARD',
    MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  },
  InterstitialAd: {
    createForAdRequest: jest.fn(() => makeAd()),
  },
  RewardedAd: {
    createForAdRequest: jest.fn(() => makeAd()),
  },
  RewardedInterstitialAd: {
    createForAdRequest: jest.fn(() => makeAd()),
  },
  AppOpenAd: {
    createForAdRequest: jest.fn(() => makeAd()),
  },
  useInterstitialAd: jest.fn(() => ({ loaded: false, error: null, isShowing: false, show: jest.fn() })),
  useRewardedAd: jest.fn(() => ({ loaded: false, error: null, isShowing: false, show: jest.fn() })),
  useAppOpenAd: jest.fn(() => ({ loaded: false, error: null, isShowing: false, show: jest.fn() })),
  MobileAds: {
    initialize: jest.fn(async () => ({})),
    setRequestConfiguration: jest.fn(),
    getRequestConfiguration: jest.fn(async () => ({})),
    addEventListener: jest.fn(() => jest.fn()),
  },
  AdsConsent: {
    requestInfoUpdate: jest.fn(),
    loadAndShowConsentFormIfRequired: jest.fn(),
    setDebugGeography: jest.fn(),
  },
  AdEventType: {
    LOADED: 'loaded',
    FAILED_TO_LOAD: 'failed_to_load',
    CLOSED: 'closed',
    OPENED: 'opened',
    ERROR: 'error',
    CLICKED: 'clicked',
    PRESENTED: 'presented',
    DISMISSED: 'dismissed',
  },
  RewardedAdEventType: {
    LOADED: 'loaded',
    EARNED_REWARD: 'earned_reward',
    FAILED_TO_LOAD: 'failed_to_load',
    CLOSED: 'closed',
  },
  MaxAdContentRating: {
    G: 'G',
    PG: 'PG',
    T: 'T',
    MA: 'MA',
  },
  TestIds: {
    BANNER: 'ca-app-pub-test-banner',
    ADAPTIVE_BANNER: 'ca-app-pub-test-adaptive-banner',
    INTERSTITIAL: 'ca-app-pub-test-interstitial',
    REWARDED: 'ca-app-pub-test-rewarded',
    APP_OPEN: 'ca-app-pub-test-appopen',
    GAM_BANNER: 'ca-app-pub-test-gam-banner',
    GAM_ADAPTIVE_BANNER: 'ca-app-pub-test-gam-adaptive-banner',
    GAM_INTERSTITIAL: 'ca-app-pub-test-gam-interstitial',
    GAM_REWARDED: 'ca-app-pub-test-gam-rewarded',
  },
};
