/* eslint-disable no-undef */
/**
 * Jest setup executed before each test file.
 * Registers mocks for native / heavy modules. Manual mocks live in
 * `<rootDir>/__mocks__/` and are resolved automatically by `jest.mock(name)`.
 */
const mockAsyncStorage = require('@react-native-async-storage/async-storage/jest/async-storage-mock');

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('moti');
jest.mock('moti/interactions');
jest.mock('react-native-reanimated');
jest.mock('react-native-svg');
jest.mock('@expo/vector-icons');
jest.mock('react-native-toast-message');
jest.mock('react-native-safe-area-context');
jest.mock('expo-router');
jest.mock('expo-clipboard');
jest.mock('expo-linking');
jest.mock('expo-document-picker');
jest.mock('expo-linear-gradient');
jest.mock('expo-image');
jest.mock('expo-secure-store');
jest.mock('expo-web-browser');
jest.mock('expo-auth-session');
jest.mock('react-native-google-mobile-ads');
jest.mock('react-native-webview');
jest.mock('react-native-paystack-webview');
jest.mock('react-native-confetti-cannon');
jest.mock('react-native-markdown-display');
jest.mock('expo-font');
jest.mock('expo-file-system');
jest.mock('expo-print');
jest.mock('expo-sharing');
jest.mock('expo-status-bar');
jest.mock('expo-constants');
jest.mock('@react-native-google-signin/google-signin');

// React Native env helpers
global.__DEV__ = true;
if (typeof global.ShadowRoot === 'undefined') {
  global.ShadowRoot = function ShadowRoot() {};
}

// Disable the JS-driven animation driver. RN's Animated schedules frames via
// requestAnimationFrame (backed by setTimeout(0)), which leaks infinite timers
// (e.g. Animated.loop) during tests and produces act() warnings. Making rAF a
// no-op keeps components rendering with their initial values without timers.
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};

// Clear mock call history between tests while keeping implementations.
beforeEach(() => {
  jest.clearAllMocks();
});

// Silence specific known warnings during tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const msg = args.join(' ');
  if (
    typeof msg === 'string' &&
    (msg.includes('Animated: `useNativeDriver`') ||
      msg.includes('VirtualizedLists') ||
      msg.includes('Possible Unhandled Promise Rejection'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};
