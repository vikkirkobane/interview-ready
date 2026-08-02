module.exports = {
  __esModule: true,
  createURL: (p) => `interviewready://${p || ''}`,
  openURL: jest.fn(async () => true),
  canOpenURL: jest.fn(async () => true),
  getInitialURL: jest.fn(async () => null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  useURL: () => null,
  useLinking: () => ({}),
  createWebURL: (p) => p,
  hasConstants: false,
};
