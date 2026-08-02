module.exports = {
  __esModule: true,
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
};
