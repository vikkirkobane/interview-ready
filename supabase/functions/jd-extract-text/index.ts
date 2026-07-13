import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError } from '../_shared/errors.ts';
import pdf from 'npm:pdf-parse@1.1.1';

const app = new Hono();

app.use('/*', cors());

/**
 * Safely convert a Uint8Array to a Base64 string without hitting the
 * "Maximum call stack size exceeded" error that occurs when using
 * `btoa(String.fromCharCode(...largeArray))` on files bigger than ~500KB.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192; // Process in 8KB chunks to stay within stack limits
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Call the OCR.space API using the correct base64Image field (not the file field).
 * The `base64Image` field is the proper way to send a base64-encoded image to OCR.space.
 * The `file` field is for multipart binary uploads only.
 */
async function extractTextWithOcrSpace(
  bytes: Uint8Array,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const base64 = uint8ArrayToBase64(bytes);
  const dataUri = `data:${mimeType};base64,${base64}`;

  const formData = new FormData();
  // Use 'base64Image' — the correct field for base64 encoded images per OCR.space docs
  formData.append('base64Image', dataUri);
  formData.append('apikey', apiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  // Enable table detection for structured JD content
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // Engine 2 is more accurate for printed text

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
    // OCR.space returns arrays for ErrorMessage in some cases
    const msg = Array.isArray(result.ErrorMessage)
      ? result.ErrorMessage.join(', ')
      : result.ErrorMessage || 'OCR processing failed';
    throw new Error(`OCR.space error: ${msg}`);
  }

  if (!result.ParsedResults || result.ParsedResults.length === 0) {
    throw new Error('No text detected in the image. Please ensure the image is clear and contains readable text.');
  }

  const extractedText = result.ParsedResults
    .map((r: any) => r.ParsedText || '')
    .join('\n')
    .trim();

  if (!extractedText) {
    throw new Error('OCR extracted empty text. The image may be too blurry or low-resolution.');
  }

  return extractedText;
}

app.post('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    // Read the uploaded file
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new Error('No file uploaded. Please select a PDF or image file.');
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') ||
      file.name.toLowerCase().endsWith('.png') ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg');

    if (!isPdf && !isImage) {
      throw new Error('Unsupported file type. Please upload a PDF, PNG, or JPEG image.');
    }

    // Validate file size (1MB limit)
    if (file.size > 1 * 1024 * 1024) {
      throw new Error('File exceeds the 1MB size limit. Please compress your file and try again.');
    }

    // Extract text based on file type
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let extractedText = '';

    if (isPdf) {
      // Use pdf-parse for PDFs — fast, accurate, no external API needed
      try {
        const pdfData = await pdf(bytes);
        extractedText = pdfData.text?.trim() || '';
      } catch (pdfErr: any) {
        throw new Error(`Could not read PDF: ${pdfErr.message}. Please ensure the file is not password-protected or corrupted.`);
      }
    } else if (isImage) {
      // Use OCR.space for images
      const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');
      if (!ocrSpaceApiKey) {
        throw new Error('OCR service is not configured. Please contact support.');
      }

      // Normalize MIME type — some devices report 'image/jpg' which is non-standard
      const normalizedMime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;

      extractedText = await extractTextWithOcrSpace(bytes, normalizedMime, ocrSpaceApiKey);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Could not extract any text from the provided file. Please try a different file or copy the job description text manually.');
    }

    return c.json({ extracted_text: extractedText }, 200);

  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in jd-extract-text:', error.message);
    // Return user-friendly error messages — never expose internal stack traces
    return c.json({ error: error.message || 'An unexpected error occurred. Please try again.' }, 400);
  }
});

Deno.serve(app.fetch);
