module.exports = {
  __esModule: true,
  makeRedirectUri: jest.fn(() => 'interviewready://auth/callback'),
  makeWebAuthUrlAsync: jest.fn(async () => 'https://mock/auth'),
  useAuthRequest: jest.fn(() => [
    { promptAsync: jest.fn(async () => ({ type: 'cancel' })) },
    null,
    () => {},
  ]),
};
