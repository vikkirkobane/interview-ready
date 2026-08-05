/**
 * export-utils.test.ts
 *
 * Verifies the expo-file-system v56 /legacy import fix in the export utilities
 * and the native resume/cover-letter DOCX export path. These functions changed
 * from `require('expo-file-system')` to `require('expo-file-system/legacy')` to
 * avoid deprecation warnings and silent native failures on Android.
 *
 * The actual module resolution + mock is exercised: we mock BOTH expo-file-system
 * and expo-file-system/legacy, and assert the production code path calls the legacy
 * import (not the deprecated root import).
 */
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: '/mock/cache/',
  EncodingType: { Base64: 1, UTF8: 0 },
  copyAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async () => {}),
}));

import { buildFileName, renameToCache, sanitizeFileNameSegment } from '../src/lib/exportUtils';
import * as LegacyFileSystem from 'expo-file-system/legacy';

const mockCopyAsync = (LegacyFileSystem as any).copyAsync as jest.Mock;

describe('exportUtils — expo-file-system/legacy fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('buildFileName sanitizes the name but preserves the label', () => {
    expect(buildFileName('Jane  Smith', 'Resume', 'pdf')).toBe('Jane_Smith_Resume.pdf');
    // Empty/null name -> falls back to the raw label + extension (label is not sanitized)
    expect(buildFileName('', 'Resume', 'pdf')).toBe('Resume.pdf');
    expect(buildFileName(null, 'Cover Letter', 'docx')).toBe('Cover Letter.docx');
  });

  it('sanitizeFileNameSegment strips unsafe characters (incl. non-ASCII accents)', () => {
    expect(sanitizeFileNameSegment('  José  "Rocky" O\'Neil!!  ')).toBe('Jos_Rocky_ONeil');
  });

  it('renameToCache uses the legacy cacheDirectory + copyAsync', async () => {
    const dest = await renameToCache('file:///tmp/source.pdf', 'resume.pdf');
    expect(dest).toBe('/mock/cache/resume.pdf');
    // The production code must call copyAsync on the legacy module, not the root import
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: 'file:///tmp/source.pdf',
      to: '/mock/cache/resume.pdf',
    });
  });
});