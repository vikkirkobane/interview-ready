module.exports = {
  __esModule: true,
  loadAsync: jest.fn(async () => ({})),
  isLoaded: jest.fn(() => true),
  useFonts: jest.fn(() => [true, null]),
  Font: {
    loadAsync: jest.fn(async () => ({})),
  },
  getLoadedFonts: jest.fn(() => []),
};
