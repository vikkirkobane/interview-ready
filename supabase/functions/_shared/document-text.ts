import pdf from 'npm:pdf-parse@1.1.1';

/**
 * Safely convert a Uint8Array to Base64 without stack overflow on large files.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * OCR.space fallback for scanned PDFs and image-only documents.
 */
export async function extractTextWithOcrSpace(
  bytes: Uint8Array,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const base64 = uint8ArrayToBase64(bytes);
  const dataUri = `data:${mimeType};base64,${base64}`;

  const formData = new FormData();
  formData.append('base64Image', dataUri);
  formData.append('apikey', apiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  if (mimeType === 'application/pdf') {
    formData.append('filetype', 'PDF');
  }

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OCR.space API request failed (${response.status}): ${errText}`);
  }

  const result = await response.json();

  if (result.IsErroredOnProcessing) {
    const msg = Array.isArray(result.ErrorMessage)
      ? result.ErrorMessage.join(', ')
      : result.ErrorMessage || 'OCR processing failed';
    throw new Error(`OCR.space error: ${msg}`);
  }

  if (!result.ParsedResults || result.ParsedResults.length === 0) {
    throw new Error('No text detected in the document.');
  }

  const extractedText = result.ParsedResults
    .map((r: { ParsedText?: string }) => r.ParsedText || '')
    .join('\n')
    .trim();

  if (!extractedText) {
    throw new Error('OCR extracted empty text.');
  }

  return extractedText;
}

/**
 * Extract text from a PDF buffer. Falls back to OCR when embedded text is empty
 * (common for scanned resume PDFs).
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  let text = '';

  try {
    const pdfData = await pdf(bytes);
    text = pdfData.text?.trim() || '';
  } catch (pdfErr: unknown) {
    const message = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
    throw new Error(
      `Could not read the PDF file: ${message}. Please ensure it is not password-protected or corrupted.`,
    );
  }

  if (text.length > 0) {
    return text;
  }

  const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');
  if (!ocrSpaceApiKey) {
    throw new Error(
      'Could not extract any text from your resume. The file may contain only images or scanned pages. Please try a text-based PDF or DOCX.',
    );
  }

  console.warn('[document-text] PDF has no embedded text — falling back to OCR');
  return extractTextWithOcrSpace(bytes, 'application/pdf', ocrSpaceApiKey);
}
