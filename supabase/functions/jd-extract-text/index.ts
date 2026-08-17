import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError } from '../_shared/errors.ts';
import { extractPdfText, extractImageText } from '../_shared/document-text.ts';
import mammoth from 'npm:mammoth';
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

    // Use Hono's native formData() — no manual multipart parsing needed
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      throw new Error('No file uploaded. Please select a PDF, DOCX, or image file.');
    }

    // Validate file type
    const filename = file.name || 'file';
    const fileType = file.type || 'application/octet-stream';
    const isPdf = fileType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');
    const isDocx =
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.toLowerCase().endsWith('.docx');
    const isImage =
      fileType.startsWith('image/') ||
      filename.toLowerCase().endsWith('.png') ||
      filename.toLowerCase().endsWith('.jpg') ||
      filename.toLowerCase().endsWith('.jpeg');

    if (!isPdf && !isDocx && !isImage) {
      throw new Error('Unsupported file type. Please upload a PDF, DOCX, PNG, or JPEG file.');
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File exceeds the 5MB size limit. Please compress your file and try again.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let extractedText = '';

    if (isPdf) {
      extractedText = await extractPdfText(bytes);
    } else if (isDocx) {
      try {
        const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
        extractedText = result.value?.trim() || '';
      } catch (docxErr: any) {
        throw new Error(`Could not read DOCX: ${docxErr.message}. Please ensure the file is not corrupted.`);
      }
    } else if (isImage) {
      let normalizedMime = fileType;
      if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg') || fileType === 'image/jpg') {
        normalizedMime = 'image/jpeg';
      } else if (filename.toLowerCase().endsWith('.png') || fileType === 'image/png') {
        normalizedMime = 'image/png';
      }
      extractedText = await extractImageText(bytes, normalizedMime);
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
    return c.json({ error: error.message || 'An unexpected error occurred. Please try again.' }, 400);
  }
});

Deno.serve(app.fetch);
