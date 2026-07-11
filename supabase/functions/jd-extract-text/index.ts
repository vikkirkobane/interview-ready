import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError } from '../_shared/errors.ts';
import pdf from 'npm:pdf-parse@1.1.1';
import { Buffer } from 'node:buffer';

const app = new Hono();

app.use('/*', cors());

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

    // 2. Read the uploaded file
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new Error('No file uploaded');
    }

    // 3. Validate file type and size
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PNG, JPEG, and PDF files are allowed.');
    }

    if (file.size > 1 * 1024 * 1024) {
      throw new Error('File exceeds the 1MB size limit.');
    }

    // 4. Extract text based on file type
    const arrayBuffer = await file.arrayBuffer();
    let extractedText = '';

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // Extract text from PDF
      const pdfData = await pdf(arrayBuffer);
      extractedText = pdfData.text;
    } else {
      // For images, use OCR.space API
      const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');
      if (!ocrSpaceApiKey) {
        throw new Error('OCR.Space API key not configured');
      }

      // Convert ArrayBuffer to Base64 for OCR.space (they accept base64 encoded image)
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      // Determine the correct MIME type for the data URI
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

      const ocrFormData = new FormData();
      ocrFormData.append('file', `data:${mimeType};base64,${base64Image}`);
      ocrFormData.append('apikey', ocrSpaceApiKey);
      ocrFormData.append('language', 'eng');
      ocrFormData.append('isOverlayRequired', 'false');

      const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: ocrFormData,
      });

      const ocrResult = await ocrResponse.json();

      if (ocrResult.IsErroredOnProcessing) {
        throw new Error(ocrResult.ErrorMessage || 'OCR processing failed');
      }

      if (!ocrResult.ParsedResults || ocrResult.ParsedResults.length === 0) {
        throw new Error('No text detected in the image');
      }

      extractedText = ocrResult.ParsedResults[0].ParsedText;
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Could not extract text from the provided file');
    }

    // 5. Return the extracted text
    return c.json({ extracted_text: extractedText }, 200);

  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in jd-extract-text:', error.message);
    return c.json({ error: error.message }, 400);
  }
});

Deno.serve(app.fetch);
