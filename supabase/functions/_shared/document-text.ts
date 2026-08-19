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
 * Vision model rotation pool for image/document text extraction.
 * Rotates dynamically across DashScope Vision models with automatic failover.
 */
const ROTATING_VISION_MODELS = [
  'qwen-omni-turbo',
  'qwen-vl-plus',
  'qwen-vl-max',
  'qwen3-vl-flash',
  'qwen3-vl-plus',
] as const;

let visionModelIndex = 0;

/**
 * Returns the vision models ordered starting from the next rotated model.
 */
export function getNextVisionModelPool(): string[] {
  const pool = [...ROTATING_VISION_MODELS];
  const startIdx = visionModelIndex % pool.length;
  visionModelIndex = (visionModelIndex + 1) % pool.length;
  return [...pool.slice(startIdx), ...pool.slice(0, startIdx)];
}

/**
 * Fallback to multimodal Vision AI when OCR services are unavailable or fail.
 * Rotates through the configured Vision models:
 * qwen-omni-turbo, qwen-vl-plus, qwen-vl-max, qwen3-vl-flash, qwen3-vl-plus
 */
export async function extractTextWithVisionAI(bytes: Uint8Array, mimeType: string): Promise<string> {
  const base64 = uint8ArrayToBase64(bytes);
  const dataUri = `data:${mimeType};base64,${base64}`;

  const dashscopeApiKey = Deno.env.get('DASHSCOPE_API_KEY');
  const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

  const visionPrompt =
    'Please extract all readable text from this job description / document image accurately and verbatim. Return ONLY the plain extracted text, without commentary or markdown code fences.';

  // 1. Primary: Rotate through DashScope Vision Models
  if (dashscopeApiKey) {
    const candidateModels = getNextVisionModelPool();

    for (const model of candidateModels) {
      try {
        console.log(`[document-text] Attempting vision extraction with model: ${model}`);
        const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dashscopeApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
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
            console.log(`[document-text] Vision extraction succeeded with model: ${model}`);
            return content;
          }
        } else {
          const errText = await res.text();
          console.warn(`[document-text] Vision model ${model} failed (${res.status}): ${errText}`);
        }
      } catch (e) {
        console.warn(`[document-text] Vision model ${model} request error:`, e);
      }
    }
  }

  // 2. Secondary: Fallback to OpenRouter Multimodal Vision Models
  if (openrouterApiKey) {
    const openrouterVisionModels = [
      'google/gemini-2.0-flash-001',
      'meta-llama/llama-3.2-11b-vision-instruct:free',
      'qwen/qwen-2.5-vl-72b-instruct:free',
    ];

    for (const orModel of openrouterVisionModels) {
      try {
        console.log(`[document-text] Attempting OpenRouter vision fallback with model: ${orModel}`);
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://interviewready.app',
            'X-Title': 'InterviewReady',
          },
          body: JSON.stringify({
            model: orModel,
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
            console.log(`[document-text] OpenRouter vision succeeded with model: ${orModel}`);
            return content;
          }
        }
      } catch (e) {
        console.warn(`[document-text] OpenRouter Vision model ${orModel} failed:`, e);
      }
    }
  }

  throw new Error('Could not extract text from the image. Please try a clearer image or paste the text directly.');
}

/**
 * Sanitizes and normalizes extracted text from OCR or Vision AI models
 * so that downstream Qwen models receive clean, high-fidelity prompt data.
 */
export function cleanAndNormalizeExtractedText(raw: string): string {
  if (!raw) return '';

  let cleaned = raw.trim();

  // Strip common conversational prefixes from multimodal vision models
  cleaned = cleaned.replace(/^(?:here(?:'s| is) (?:the )?(?:extracted |transcribed )?(?:text|document|job description|resume)[^:\n]*:?\s*)/i, '').trim();

  // Strip markdown code fences if wrapped by Vision AI
  cleaned = cleaned.replace(/^```(?:markdown|text|json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // Normalize Windows/Unix line breaks and carriage returns
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Collapse 3+ consecutive line breaks into 2 for clean paragraph separation
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Strip non-printable ASCII control characters (keeping standard tabs and newlines)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned.trim();
}

/**
 * Extract text from an image with OCR as the first-pass engine,
 * falling back to the rotating Vision AI model pool (Qwen Vision models) if OCR fails or returns empty text.
 */
export async function extractImageText(bytes: Uint8Array, mimeType: string): Promise<string> {
  const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY') || 'helloworld';

  // 1. First Pass: Attempt OCR.space engine
  try {
    console.log('[document-text] Step 1: Attempting first-pass OCR engine extraction...');
    const ocrText = await extractTextWithOcrSpace(bytes, mimeType, ocrApiKey);
    const normalizedOcr = cleanAndNormalizeExtractedText(ocrText);
    if (normalizedOcr.length > 20) {
      console.log(`[document-text] OCR extraction succeeded (${normalizedOcr.length} chars).`);
      return normalizedOcr;
    }
    console.warn('[document-text] OCR returned insufficient text, escalating to Vision AI models.');
  } catch (ocrErr) {
    console.warn('[document-text] First-pass OCR engine failed, escalating to Vision AI models:', ocrErr);
  }

  // 2. Second Pass: Rotate through Vision AI models (qwen-omni-turbo, qwen-vl-plus, qwen-vl-max, qwen3-vl-flash, qwen3-vl-plus)
  console.log('[document-text] Step 2: Running Vision AI model rotation pool...');
  const visionText = await extractTextWithVisionAI(bytes, mimeType);
  return cleanAndNormalizeExtractedText(visionText);
}

/**
 * Extract text from a PDF buffer. Falls back to OCR when embedded text is empty
 * (common for scanned resume PDFs), then escalates to Vision AI rotation.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  let text = '';

  try {
    // @ts-ignore
    const pdfModule = await import('npm:pdf-parse@1.1.1').catch(() => null);
    const pdf = pdfModule?.default || pdfModule;
    if (pdf && typeof pdf === 'function') {
      const pdfData = await pdf(bytes);
      text = cleanAndNormalizeExtractedText(pdfData.text?.trim() || '');
    }
  } catch (pdfErr: unknown) {
    const message = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
    throw new Error(
      `Could not read the PDF file: ${message}. Please ensure it is not password-protected or corrupted.`,
    );
  }

  if (text.length > 20) {
    return text;
  }

  const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY') || 'helloworld';

  // Fallback to OCR for scanned PDFs
  try {
    console.warn('[document-text] PDF has no embedded text — attempting first-pass OCR engine...');
    const ocrText = await extractTextWithOcrSpace(bytes, 'application/pdf', ocrApiKey);
    const normalized = cleanAndNormalizeExtractedText(ocrText);
    if (normalized.length > 20) {
      return normalized;
    }
  } catch (ocrErr) {
    console.warn('[document-text] OCR.space PDF extraction failed, falling back to Vision AI:', ocrErr);
  }

  // Fallback to Vision AI models
  const visionText = await extractTextWithVisionAI(bytes, 'application/pdf');
  return cleanAndNormalizeExtractedText(visionText);
}
