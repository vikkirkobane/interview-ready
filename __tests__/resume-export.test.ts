/**
 * resume-export.test.ts
 *
 * Verifies the native DOCX export path in resumeExport.ts uses the
 * expo-file-system v56 /legacy import (writeAsStringAsync + cacheDirectory)
 * instead of the deprecated root module, and that it correctly writes to cache
 * then shares. This is the exact path that logged ReactNativeJS WARN twice per
 * export on Android (the reason for the fix).
 */
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: '/mock/cache/',
  EncodingType: { Base64: 1, UTF8: 0 },
  copyAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async () => {}),
}));

// expo-sharing mock (jest.setup.js already mocks it)
jest.mock('expo-sharing', () => ({
  __esModule: true,
  shareAsync: jest.fn(async () => ({ action: 'sharedAction' })),
}));

// docx mock — Packer.toBase64String returns base64; doc builders are inert
jest.mock('docx', () => ({
  Document: jest.fn(),
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: {},
  AlignmentType: { CENTER: 'CENTER', LEFT: 'LEFT' },
  Packer: {
    toBase64String: jest.fn(async () => 'QUJDRA=='),
    toBlob: jest.fn(async () => new Blob()),
  },
}));

import { Platform } from 'react-native';
import { exportResumeDOCX } from '../src/lib/resumeExport';
import * as Sharing from 'expo-sharing';
import * as LegacyFileSystem from 'expo-file-system/legacy';

const mockShare = (Sharing as any).shareAsync as jest.Mock;
const mockWrite = (LegacyFileSystem as any).writeAsStringAsync as jest.Mock;

function sampleResume(): any {
  return {
    header: { name: 'Jane Smith', title: 'Product Manager', email: 'j@x.com' },
    summary: { text: 'Experienced PM.' },
    skills: [{ category: 'Core', items: ['SQL', 'Analytics'] }],
    experience: [],
    experience_highlights: [],
    education: [],
    certifications: [],
    awards: [],
    languages: [],
    recognition: [],
    projects: [],
    sections_to_include: { summary: true, skills: true, experience: true, education: true },
    meta: { target_role: 'Product Manager' },
  };
}

describe('resumeExport — native DOCX path using expo-file-system/legacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ONLY on native (Platform.OS !== web) — uses legacy write + share', async () => {
    const originalOS = Platform.OS;

    // jest-expo sets Platform.OS via the react-native mock; this test runs the
    // native branch as long as OS is not 'web' (it defaults to the RN preset).
    if (Platform.OS === 'web') {
      // Optionally skip if the preset forces web
      return;
    }

    await exportResumeDOCX(sampleResume(), 'executive');

    // Must write base64 to a legacy cache path using EncodingType.Base64
    expect(mockWrite).toHaveBeenCalled();
    const [uri, base64Payload, options] = mockWrite.mock.calls[0];
    expect(uri).toBe('/mock/cache/Jane_Smith_Resume.docx');
    expect(typeof base64Payload).toBe('string');
    expect(base64Payload.length).toBeGreaterThan(0);
    expect(options).toEqual({ encoding: (LegacyFileSystem as any).EncodingType.Base64 });

    // Then share the generated DOCX
    expect(mockShare).toHaveBeenCalledWith(
      '/mock/cache/Jane_Smith_Resume.docx',
      expect.objectContaining({
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    );
  });
});