module.exports = {
  __esModule: true,
  printToFileAsync: jest.fn(async () => ({ uri: 'file://print.pdf', numberOfPages: 1, base64: null })),
  printAsync: jest.fn(async () => {}),
  selectPrinterAsync: jest.fn(async () => ({ name: 'mock', url: '' })),
  Orientation: { PORTRAIT: 'PORTRAIT', LANDSCAPE: 'LANDSCAPE' },
};
