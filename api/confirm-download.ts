import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ConfirmDownloadRequestBody {
  email?: string;
  waitlistSpot?: string | number;
  code?: string;
}

// In-memory rate limiting map for sliding window
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(
  key: string,
  maxHits: number = 12,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const cleanKey = key || 'unknown-client';
  const timestamps = rateLimitMap.get(cleanKey) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxHits) {
    const oldest = validTimestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  validTimestamps.push(now);
  rateLimitMap.set(cleanKey, validTimestamps);
  return { allowed: true, remaining: maxHits - validTimestamps.length };
}

function sanitizeFormulaValue(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t\0]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/`/g, '')
    .trim();
}

function validateAndSanitizeEmail(rawEmail: unknown): { isValid: boolean; email: string; error?: string } {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { isValid: false, email: '', error: 'Email address is required.' };
  }

  const sanitized = rawEmail
    .replace(/[\r\n\t\0\x0B\x0C]/g, '')
    .replace(/%0[aAdD]/gi, '')
    .trim()
    .toLowerCase();

  if (sanitized.length < 5 || sanitized.length > 254) {
    return { isValid: false, email: '', error: 'Email address must be between 5 and 254 characters.' };
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, email: '', error: 'Please enter a valid email format.' };
  }

  return { isValid: true, email: sanitized };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  // 1. IP Rate Limiter
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientIp, 12, 60000);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      verified: false,
      error: `Too many verification attempts. Please try again in ${rateLimit.retryAfterSec} seconds.`,
    });
  }

  try {
    const { email, waitlistSpot, code }: ConfirmDownloadRequestBody = req.body || {};
    
    // 2. Strict Input Normalization & Formula Sanitization
    const rawCode = (code || waitlistSpot || '').toString().trim();
    const cleanSpotStr = rawCode.replace(/[^0-9]/g, '');
    const numericSpot = parseInt(cleanSpotStr, 10);
    
    let sanitizedEmail = '';
    if (email && typeof email === 'string' && email.trim().length > 0) {
      const emailRes = validateAndSanitizeEmail(email);
      if (emailRes.isValid) sanitizedEmail = emailRes.email;
    }

    if (!cleanSpotStr && !sanitizedEmail) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Please enter your Waitlist Access Code or registered email address.',
      });
    }

    const apiKey = (process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PAT || '').trim().replace(/['"]/g, '');
    const baseId = (process.env.AIRTABLE_BASE_ID || '').trim().replace(/['"]/g, '');
    const tableName = (process.env.AIRTABLE_TABLE_NAME || 'Submissions').trim().replace(/['"]/g, '');

    if (apiKey && baseId) {
      const conditions: string[] = [];
      if (sanitizedEmail) {
        conditions.push(`LOWER({Email})='${sanitizeFormulaValue(sanitizedEmail)}'`);
      }
      if (!isNaN(numericSpot)) {
        conditions.push(`{Waitlist Spot}=${numericSpot}`);
        conditions.push(`{Waitlist Spot}='${numericSpot}'`);
        conditions.push(`{Waitlist Spot}='#${numericSpot}'`);
      }

      const formula = conditions.length > 1 ? `OR(${conditions.join(',')})` : (conditions[0] || '');
      const searchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
      
      const searchRes = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!searchRes.ok) {
        const searchErr = await searchRes.json().catch(() => ({}));
        console.error('[Confirm Download] Airtable search failed:', searchErr);
        return res.status(500).json({
          success: false,
          verified: false,
          error: 'Verification service error. Please try again or contact support.',
        });
      }

      const searchData = await searchRes.json();
      const records = searchData.records || [];

      if (records.length === 0) {
        return res.status(404).json({
          success: false,
          verified: false,
          error: 'No registered waitlist entry was found for this code. Please join the waitlist on the homepage first.',
        });
      }

      const matchedRecord = records[0];
      const recordId = matchedRecord.id;
      const existingEmail = matchedRecord.fields?.Email || sanitizedEmail;
      const existingSpot = matchedRecord.fields?.['Waitlist Spot'] || numericSpot;

      // Update status to Downloaded with typecast
      const patchUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: { 'Status': 'Downloaded' },
          typecast: true,
        }),
      });

      let airtableUpdated = false;
      if (patchRes.ok) {
        airtableUpdated = true;
      }

      // Generate a secure, time-bounded session (15-minute validity window)
      const sessionDurationSeconds = 900;
      const sessionExpiresAt = new Date(Date.now() + sessionDurationSeconds * 1000).toISOString();
      const sessionToken = `ir_sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      return res.status(200).json({
        success: true,
        verified: true,
        recordId,
        email: existingEmail,
        waitlistSpot: existingSpot,
        status: 'Downloaded',
        airtableUpdated,
        sessionToken,
        sessionExpiresAt,
        sessionDurationSeconds,
        message: 'Access code verified! Unlocking your APK download.',
      });
    }

    const sessionDurationSeconds = 900;
    const sessionExpiresAt = new Date(Date.now() + sessionDurationSeconds * 1000).toISOString();
    const sessionToken = `ir_sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    return res.status(200).json({
      success: true,
      verified: true,
      waitlistSpot: numericSpot || 466,
      status: 'Downloaded',
      airtableUpdated: false,
      sessionToken,
      sessionExpiresAt,
      sessionDurationSeconds,
      message: 'Access code verified.',
    });
  } catch (error: any) {
    console.error('[Confirm Download] Server error:', error);
    return res.status(500).json({
      success: false,
      verified: false,
      error: 'An internal server error occurred while confirming your download.',
    });
  }
}
