/**
 * Standardized error handling for Edge Functions
 * All errors follow this pattern for consistent client-side handling
 */

export interface ErrorResponse {
  error: string;
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON(): ErrorResponse {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
    };
  }
}

// Common error types
export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('NOT_FOUND', 404, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super('UNAUTHORIZED', 401, message, details);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(creditsNeeded: number, creditsAvailable: number) {
    super(
      'INSUFFICIENT_CREDITS',
      402,
      `Insufficient credits. Need ${creditsNeeded}, have ${creditsAvailable}`,
      { creditsNeeded, creditsAvailable }
    );
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(
      'RATE_LIMITED',
      429,
      message,
      retryAfter ? { retryAfter } : undefined
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class InternalError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INTERNAL_ERROR', 500, message, details);
  }
}

/**
 * Hono error handler middleware
 * Catches all errors and returns standardized response
 */
export function errorHandler(err: Error, _c: unknown) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return new Response(JSON.stringify(err.toJSON()), {
      status: err.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Unknown error
  const appError = new InternalError(
    err.message || 'An unexpected error occurred',
    { originalError: err.name }
  );

  return new Response(JSON.stringify(appError.toJSON()), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Safe error logging (sanitizes PII)
 */
export function logError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  const sanitized = {
    message,
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? { name: error.name, message: error.message }
        : String(error),
    context: sanitizeContext(context),
  };

  console.error(JSON.stringify(sanitized));
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};

  const sanitized: Record<string, unknown> = {};
  const piiFields = ['email', 'phone', 'password', 'token', 'apiKey', 'secret'];

  for (const [key, value] of Object.entries(context)) {
    if (piiFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
