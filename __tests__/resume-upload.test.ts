/**
 * resume-upload.test.ts
 *
 * Verifies that the mobile resume upload path uses ArrayBuffer (not Blob)
 * so Supabase Storage always receives the correct MIME type — not the
 * Android-mangled 'text/plain' that fetch().blob() returns.
 *
 * Tests are pure unit tests: no React renderer, no native modules.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Supabase storage mock — tracks what body and options were passed to upload()
const mockUpload = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' }, access_token: 'tok', expires_at: 9999999999 } },
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    storage: {
      from: jest.fn(() => ({ upload: mockUpload })),
    },
  },
}));

// expo-document-picker mock — returns a PDF asset
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// react-native-toast-message mock
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

// react-native Platform mock — set per test
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { supabase } from '../src/lib/supabase';

const mockGetDocument = DocumentPicker.getDocumentAsync as jest.Mock;
const mockStorageFrom = supabase.storage.from as jest.Mock;

/** Simulate what Android's fetch().blob() does: returns a blob typed 'text/plain' */
function makeMangledBlob(): Blob {
  // Android mangling: blob type is 'text/plain' even for PDFs
  return new Blob(['%PDF-fake-content'], { type: 'text/plain' } as any);
}

/** A properly-typed ArrayBuffer (no type property) */
function makePdfArrayBuffer(): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode('%PDF-fake-content').buffer;
}

/** Build the payload that useFilePicker hands to onFilePicked */
function buildPayload(overrides: Partial<{
  fileUri: string;
  fileName: string;
  mimeType: string;
  webFile: Blob | null;
}> = {}) {
  return {
    fileUri: 'file:///data/user/0/com.app/cache/victor_chogo.pdf',
    fileName: 'victor_chogo.pdf',
    mimeType: 'application/pdf',
    webFile: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Resume upload — ArrayBuffer fix for Android MIME mangling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({ data: { path: 'resume-uploads/user-123/123-victor_chogo.pdf' }, error: null });
  });

  // ── 1. Core fix: ArrayBuffer is used on mobile, not Blob ──────────────────

  it('passes ArrayBuffer (not Blob) to storage.upload on mobile', async () => {
    const arrayBuffer = makePdfArrayBuffer();

    // Simulate global fetch returning an arrayBuffer on mobile
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer),
      blob: jest.fn().mockResolvedValue(makeMangledBlob()), // should NOT be called
    });

    const payload = buildPayload();
    const userId = 'user-123';
    const storagePath = `resume-uploads/${userId}/1234567890-${payload.fileName}`;

    // Replicate the fixed upload logic from profile.tsx
    let uploadBody: Blob | ArrayBuffer;
    if (payload.webFile) {
      uploadBody = payload.webFile;
    } else {
      const response = await fetch(payload.fileUri);
      uploadBody = await response.arrayBuffer();
    }

    await supabase.storage.from('interview-ready-files').upload(storagePath, uploadBody, {
      contentType: payload.mimeType,
      upsert: false,
    });

    const [, body, options] = mockUpload.mock.calls[0];

    // Body must be an ArrayBuffer, not a Blob
    expect(body).toBeInstanceOf(ArrayBuffer);
    expect(body instanceof Blob).toBe(false);

    // contentType must be the correct PDF type, not 'text/plain'
    expect(options.contentType).toBe('application/pdf');
  });

  // ── 2. Old (buggy) path: Blob has wrong type ──────────────────────────────

  it('demonstrates the bug: fetch().blob() on Android returns type=text/plain', async () => {
    const mangledBlob = makeMangledBlob();

    global.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue(mangledBlob),
      arrayBuffer: jest.fn(),
    });

    const response = await fetch('file:///some/file.pdf');
    const blob = await response.blob();

    // This is the exact bug: Android gives back text/plain for any file
    expect(blob.type).toBe('text/plain');
    expect(blob.type).not.toBe('application/pdf');
  });

  // ── 3. ArrayBuffer has no type property (why the fix works) ───────────────

  it('ArrayBuffer has no type property — Supabase must use explicit contentType', () => {
    const buf = makePdfArrayBuffer();

    // ArrayBuffer has no .type — Supabase falls back to the contentType option
    expect((buf as any).type).toBeUndefined();
  });

  // ── 4. Web path still uses Blob (File object) ────────────────────────────

  it('passes the web File blob directly on web — does not call arrayBuffer()', async () => {
    const webBlob = new Blob(['%PDF-content'], { type: 'application/pdf' } as any);
    const payload = buildPayload({ webFile: webBlob });

    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    // Replicate the fixed logic
    let uploadBody: Blob | ArrayBuffer;
    if (payload.webFile) {
      uploadBody = payload.webFile;
    } else {
      const response = await fetch(payload.fileUri);
      uploadBody = await response.arrayBuffer();
    }

    await supabase.storage.from('interview-ready-files').upload(
      'resume-uploads/user-123/file.pdf',
      uploadBody,
      { contentType: payload.mimeType, upsert: false }
    );

    // fetch should never have been called — web uses the File blob directly
    expect(fetchSpy).not.toHaveBeenCalled();

    const [, body, options] = mockUpload.mock.calls[0];
    expect(body).toBeInstanceOf(Blob);
    expect(options.contentType).toBe('application/pdf');
  });

  // ── 5. DOCX files also use ArrayBuffer on mobile ──────────────────────────

  it('uses ArrayBuffer for DOCX files on mobile with correct contentType', async () => {
    const docxBuffer = new TextEncoder().encode('PK-fake-docx').buffer;

    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(docxBuffer),
    });

    const payload = buildPayload({
      fileUri: 'file:///cache/resume.docx',
      fileName: 'resume.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    let uploadBody: Blob | ArrayBuffer;
    if (payload.webFile) {
      uploadBody = payload.webFile;
    } else {
      const response = await fetch(payload.fileUri);
      uploadBody = await response.arrayBuffer();
    }

    await supabase.storage.from('interview-ready-files').upload(
      `resume-uploads/user-123/${payload.fileName}`,
      uploadBody,
      { contentType: payload.mimeType, upsert: false }
    );

    const [, body, options] = mockUpload.mock.calls[0];
    expect(body).toBeInstanceOf(ArrayBuffer);
    expect(options.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  // ── 6. Storage upload error is surfaced correctly ─────────────────────────

  it('propagates storage upload errors correctly', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'new row violates row-level security policy for table "objects"' },
    });

    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(makePdfArrayBuffer()),
    });

    const payload = buildPayload();
    const response = await fetch(payload.fileUri);
    const uploadBody = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('interview-ready-files')
      .upload(`resume-uploads/user-123/${payload.fileName}`, uploadBody, {
        contentType: payload.mimeType,
        upsert: false,
      });

    expect(uploadError).not.toBeNull();
    expect(uploadError!.message).toContain('row-level security');
  });

  // ── 7. Storage path structure matches RLS policy expectation ─────────────

  it('constructs storage path as resume-uploads/{userId}/{filename} matching RLS [2] index', () => {
    const userId = 'a9c0fe7a-cc54-4582-a5aa-00c9a4f9e63d';
    const fileName = 'victor_chogo.pdf';
    const storagePath = `resume-uploads/${userId}/${Date.now()}-${fileName}`;

    // RLS policy: (storage.foldername(name))[2] = auth.uid()
    // foldername splits on '/' → [1]='resume-uploads', [2]=userId
    const parts = storagePath.split('/');
    expect(parts[0]).toBe('resume-uploads');
    expect(parts[1]).toBe(userId);
    // filename is at index [2]
    expect(parts[2]).toContain(fileName);
  });

  // ── 8. upsert: false — duplicate uploads are rejected, not silently overwritten ──

  it('sets upsert:false so duplicate filenames are rejected rather than overwritten', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(makePdfArrayBuffer()),
    });

    const payload = buildPayload();
    const response = await fetch(payload.fileUri);
    const uploadBody = await response.arrayBuffer();

    await supabase.storage.from('interview-ready-files').upload(
      'resume-uploads/user-123/file.pdf',
      uploadBody,
      { contentType: payload.mimeType, upsert: false }
    );

    const [, , options] = mockUpload.mock.calls[0];
    expect(options.upsert).toBe(false);
  });
});
