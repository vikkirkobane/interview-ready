module.exports = {
  __esModule: true,
  shareAsync: jest.fn(async () => ({ action: 'sharedAction' })),
  isAvailableAsync: jest.fn(async () => true),
};
