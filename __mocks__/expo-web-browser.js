module.exports = {
  __esModule: true,
  openBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })),
  openAuthSessionAsync: jest.fn(async () => ({ type: 'dismiss', url: null })),
  openCoolBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })),
  maybeCompleteAuthSession: jest.fn(),
  dismissBrowser: jest.fn(),
  dismissAuthSession: jest.fn(),
  warmUpAsync: jest.fn(async () => {}),
  coolDownAsync: jest.fn(async () => {}),
};
