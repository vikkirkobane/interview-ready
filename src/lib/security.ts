/**
 * Security & Input Sanitization Utilities (Interview Ready)
 * Protects client and backend against XSS, Protocol Smuggling,
 * Prompt Injection, Null Byte injection, and Malicious Payloads.
 */

/**
 * Strips null bytes, non-printable control characters, and dangerous HTML tags.
 */
export function sanitizeText(input: string | undefined | null, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove null bytes and non-printable control characters (except newline, tab, carriage return)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip dangerous script tags and event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and normalizes email addresses.
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Validates URLs ensuring safe protocols (http, https) and blocking javascript:, data:, file:
 */
export function sanitizeUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.includes('\0')
  ) {
    return null;
  }

  try {
    // Add protocol if user typed www. or raw domain
    const formatted = lower.startsWith('http://') || lower.startsWith('https://') 
      ? trimmed 
      : `https://${trimmed}`;

    const parsed = new URL(formatted);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Validates password strength and integrity.
 */
export function validatePassword(password: string | undefined | null): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters.' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
}

/**
 * Sanitizes and shields text inputs sent to AI LLM endpoints to mitigate Prompt Injection attacks.
 */
export function sanitizePromptInput(input: string | undefined | null, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = sanitizeText(input, maxLength);

  // Neutralize common prompt injection markers
  sanitized = sanitized
    .replace(/```/g, "'''") // Prevent code block escaping
    .replace(/(?:system\s*:\s*|human\s*:\s*|assistant\s*:\s*|\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>)/gi, '[REDACTED_PROMPT_TAG]');

  return sanitized;
}

/**
 * Sanitizes user profile input fields.
 */
export function sanitizeProfileInputs(data: {
  firstName?: string;
  lastName?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  location?: string;
}) {
  return {
    firstName: sanitizeText(data.firstName, 60),
    lastName: sanitizeText(data.lastName, 60),
    headline: sanitizeText(data.headline, 120),
    bio: sanitizeText(data.bio, 1000),
    phone: data.phone ? data.phone.replace(/[^\d+()-\s]/g, '').slice(0, 25).trim() : '',
    website: sanitizeUrl(data.website) || '',
    linkedinUrl: sanitizeUrl(data.linkedinUrl) || '',
    location: sanitizeText(data.location, 100),
  };
}

/**
 * Sanitizes job analyzer / cover letter input fields.
 */
export function sanitizeJobInputs(data: {
  jobTitle?: string;
  company?: string;
  jobDescription?: string;
  jobUrl?: string;
}) {
  return {
    jobTitle: sanitizeText(data.jobTitle, 100),
    company: sanitizeText(data.company, 100),
    jobDescription: sanitizePromptInput(data.jobDescription, 15000),
    jobUrl: sanitizeUrl(data.jobUrl) || '',
  };
}
