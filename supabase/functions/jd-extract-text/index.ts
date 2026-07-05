import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import pdf from 'npm:pdf-parse@1.1.1'
import { Buffer } from 'node:buffer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // 2. Read the uploaded file
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      throw new Error('No file uploaded')
    }

    // 3. Validate file type and size
    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PNG, JPEG, and PDF files are allowed.')
    }

    if (file.size > 1 * 1024 * 1024) {
      throw new Error('File exceeds the 1MB size limit.')
    }

    // 4. Extract text based on file type
    const arrayBuffer = await file.arrayBuffer()
    let extractedText = ''

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // Extract text from PDF
      const pdfData = await pdf(arrayBuffer)
      extractedText = pdfData.text
    } else {
      // For images, use OCR.space API
      const ocrSpaceApiKey = Deno.env.get('OCR_SPACE_API_KEY')
      if (!ocrSpaceApiKey) {
        throw new Error('OCR.Space API key not configured')
      }

      // Convert ArrayBuffer to Base64 for OCR.space (they accept base64 encoded image)
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      // Determine the correct MIME type for the data URI
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'

      const formData = new FormData()
      formData.append('file', `data:${mimeType};base64,${base64Image}`)
      formData.append('apikey', ocrSpaceApiKey)
      formData.append('language', 'eng')
      formData.append('isOverlayRequired', 'false')

      const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      })

      const ocrResult = await ocrResponse.json()

      if (ocrResult.IsErroredOnProcessing) {
        throw new Error(ocrResult.ErrorMessage || 'OCR processing failed')
      }

      if (!ocrResult.ParsedResults || ocrResult.ParsedResults.length === 0) {
        throw new Error('No text detected in the image')
      }

      extractedText = ocrResult.ParsedResults[0].ParsedText
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Could not extract text from the provided file')
    }

    // 5. Return the extracted text
    return new Response(JSON.stringify({ extracted_text: extractedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error in jd-extract-text:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})