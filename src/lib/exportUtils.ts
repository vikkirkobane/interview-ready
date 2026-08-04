/**
 * Shared helpers for document export (resume & cover letter).
 */

declare let document: any;

/**
 * Sanitize a candidate name into a safe, readable filename segment.
 * Returns an empty string when there is nothing usable to keep, so callers
 * can fall back to a plain filename without a redundant prefix.
 */
export function sanitizeFileNameSegment(name: string | undefined | null): string {
  return (name || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Build a safe download filename from a candidate name + document label.
 * Falls back to a plain label when the name is empty:
 *   "Jane Smith" + "Resume" -> "Jane_Smith_Resume.pdf"
 *   ""            + "Resume" -> "Resume.pdf"
 */
export function buildFileName(name: string | undefined | null, label: string, ext: string): string {
  const segment = sanitizeFileNameSegment(name);
  const stem = segment ? `${segment}_${label}` : label;
  return `${stem}.${ext}`;
}

/**
 * Copy a generated file (e.g. from expo-print) to the cache directory under a
 * proper filename so native share sheets deliver a correctly-named file.
 */
export async function renameToCache(sourceUri: string, filename: string): Promise<string> {
  // expo-file-system v56 moved the legacy functional API (copyAsync, writeAsStringAsync, etc.)
  // to "expo-file-system/legacy". Importing from the root module triggers a deprecation WARN
  // and can silently fail on Android (confirmed in logcat: ReactNativeJS WARN twice per export).
  const FileSystem = require('expo-file-system/legacy');
  const destinationUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  return destinationUri;
}

/**
 * Trigger a client-side download on web.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
