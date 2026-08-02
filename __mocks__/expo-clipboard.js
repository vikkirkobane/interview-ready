module.exports = {
  __esModule: true,
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ''),
  hasStringAsync: jest.fn(async () => false),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
