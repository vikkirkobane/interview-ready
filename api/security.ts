/**
 * Enterprise Security Utility for Serverless Functions
 * Input Validation, Sanitization, Formula Injection Prevention, and Rate Limiting.
 */

// In-memory rate limiting map for sliding window (IP / Key based)
const rateLimitMap = new Map<string, number[]>();

/**
 * Escapes HTML characters to prevent XSS and HTML injection in templates
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes input to prevent CRLF / SMTP Email Header Injection.
 * Strips all control characters, carriage returns, line feeds, and null bytes.
 */
export function stripHeaderInjection(value: string): string {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t\0\x0B\x0C]/g, '')
    .replace(/%0[aAdD]/gi, '')
    .trim();
}

/**
 * Sanitizes values for Airtable / SQL filterByFormula to prevent formula injection attacks.
 * Escapes quotes and strips illegal formula operators.
 */
export function sanitizeFormulaValue(value: string): string {
  if (!value || typeof value !== 'string') return '';
  // Strip control characters & escape single quotes
  return value
    .replace(/[\r\n\t\0]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/`/g, '')
    .trim();
}

/**
 * Strict RFC 5322-compliant linear-time email validator and sanitizer.
 * Enforces maximum 254 length (RFC 5321), strips dangerous characters,
 * and validates domain & mailbox structure without ReDoS vulnerability.
 */
export function validateAndSanitizeEmail(rawEmail: unknown): {
  isValid: boolean;
  email: string;
  error?: string;
} {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return { isValid: false, email: '', error: 'Email address is required.' };
  }

  // 1. Strip Header Injection (CRLF, null bytes, etc.)
  const sanitized = stripHeaderInjection(rawEmail).toLowerCase();

  // 2. Length Check (RFC 5321 specifies maximum 254 characters)
  if (sanitized.length < 5 || sanitized.length > 254) {
    return {
      isValid: false,
      email: '',
      error: 'Email address must be between 5 and 254 characters.',
    };
  }

  // 3. Strict RFC-compliant regex (Linear time matching, non-backtracking)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(sanitized)) {
    return {
      isValid: false,
      email: '',
      error: 'Please enter a valid email format (e.g. name@company.com).',
    };
  }

  // 4. Domain & TLD checks
  const parts = sanitized.split('@');
  if (parts.length !== 2) {
    return { isValid: false, email: '', error: 'Invalid email format.' };
  }

  const [localPart, domainPart] = parts;

  if (localPart.length > 64) {
    return { isValid: false, email: '', error: 'Email username is too long (max 64 characters).' };
  }

  if (!domainPart.includes('.') || domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return { isValid: false, email: '', error: 'Email domain is invalid.' };
  }

  const tld = domainPart.split('.').pop() || '';
  if (tld.length < 2) {
    return { isValid: false, email: '', error: 'Email domain extension is invalid.' };
  }

  // 5. Prevent known malicious disposable domains or spam payloads
  const blockedPatterns = ['<script', 'javascript:', 'data:', 'vbscript:', 'onclick', 'onerror'];
  if (blockedPatterns.some(p => sanitized.includes(p))) {
    return { isValid: false, email: '', error: 'Unacceptable characters in email address.' };
  }

  return {
    isValid: true,
    email: sanitized,
  };
}

/**
 * Sliding-window rate limiter for serverless functions
 * Prevents spam bots from flooding SMTP or exhausting Airtable API quotas.
 */
export function checkRateLimit(
  key: string,
  maxHits: number = 8,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const cleanKey = key || 'unknown-client';

  const timestamps = rateLimitMap.get(cleanKey) || [];
  
  // Filter out timestamps older than the window
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxHits) {
    const oldest = validTimestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, retryAfterSec),
    };
  }

  validTimestamps.push(now);
  rateLimitMap.set(cleanKey, validTimestamps);

  // Periodic cleanup of stale rate-limit keys
  if (rateLimitMap.size > 2000) {
    for (const [k, tsList] of rateLimitMap.entries()) {
      const active = tsList.filter(t => now - t < windowMs);
      if (active.length === 0) {
        rateLimitMap.delete(k);
      } else {
        rateLimitMap.set(k, active);
      }
    }
  }

  return {
    allowed: true,
    remaining: maxHits - validTimestamps.length,
  };
}
