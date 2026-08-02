module.exports = {
  __esModule: true,
  GoogleSignin: {
    configure: jest.fn(),
    signIn: jest.fn(async () => ({ type: 'success', data: { idToken: 'mock-google-id-token' } })),
    signInSilently: jest.fn(async () => ({ type: 'success', data: { idToken: 'mock-google-id-token' } })),
    signOut: jest.fn(async () => {}),
    revokeAccess: jest.fn(async () => {}),
    hasPlayServices: jest.fn(async () => true),
    isSignedIn: jest.fn(async () => false),
    getCurrentUser: jest.fn(async () => null),
    getTokens: jest.fn(async () => ({ idToken: 'mock-google-id-token', accessToken: 'mock-access-token' })),
    clearCachedAccessToken: jest.fn(async () => {}),
  },
  GoogleSigninButton: () => null,
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
};
