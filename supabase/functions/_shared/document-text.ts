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
  } else if (mimeType === 'image/png') {
    formData.append('filetype', 'PNG');
  } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    formData.append('filetype', 'JPG');
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
 * Fallback to multimodal Vision AI when OCR services are unavailable or fail.
 */
export async function extractTextWithVisionAI(bytes: Uint8Array, mimeType: string): Promise<string> {
  const base64 = uint8ArrayToBase64(bytes);
  const dataUri = `data:${mimeType};base64,${base64}`;

  const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
  const dashscopeApiKey = Deno.env.get('DASHSCOPE_API_KEY');

  const visionPrompt = 'Please extract all readable text from this job description / document image accurately and verbatim. Return ONLY the plain extracted text, without commentary or markdown code fences.';

  if (openrouterApiKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://interviewready.app',
          'X-Title': 'InterviewReady',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: visionPrompt },
                { type: 'image_url', image_url: { url: dataUri } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content && content.length > 0) {
          return content;
        }
      }
    } catch (e) {
      console.warn('[document-text] OpenRouter Vision fallback failed:', e);
    }
  }

  if (dashscopeApiKey) {
    try {
      const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dashscopeApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-vl-max',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: visionPrompt },
                { type: 'image_url', image_url: { url: dataUri } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content && content.length > 0) {
          return content;
        }
      }
    } catch (e) {
      console.warn('[document-text] Dashscope Vision fallback failed:', e);
    }
  }

  throw new Error('Could not extract text from the image. Please try a clearer image or paste the text directly.');
}

/**
 * Extract text from an image with OCR.space and Vision AI fallback.
 */
export async function extractImageText(bytes: Uint8Array, mimeType: string): Promise<string> {
  const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY');
  if (ocrSpaceApiKey) {
    try {
      const ocrText = await extractTextWithOcrSpace(bytes, mimeType, ocrSpaceApiKey);
      if (ocrText && ocrText.trim().length > 0) {
        return ocrText;
      }
    } catch (ocrErr) {
      console.warn('[document-text] OCR.space extraction failed, falling back to Vision AI:', ocrErr);
    }
  }

  return await extractTextWithVisionAI(bytes, mimeType);
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
  if (ocrSpaceApiKey) {
    try {
      console.warn('[document-text] PDF has no embedded text — falling back to OCR');
      return await extractTextWithOcrSpace(bytes, 'application/pdf', ocrSpaceApiKey);
    } catch (ocrErr) {
      console.warn('[document-text] OCR.space PDF extraction failed, falling back to Vision AI:', ocrErr);
    }
  }

  return await extractTextWithVisionAI(bytes, 'application/pdf');
}
