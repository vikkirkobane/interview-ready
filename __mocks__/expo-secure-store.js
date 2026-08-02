module.exports = {
  __esModule: true,
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
  getValueWithKeyAsync: jest.fn(async () => null),
  setValueWithKeyAsync: jest.fn(async () => {}),
  deleteValueWithKeyAsync: jest.fn(async () => {}),
  canUseBiometricAuthentication: jest.fn(async () => false),
};
