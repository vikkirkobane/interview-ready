import {
  getUserFriendlyErrorMessage,
  isInsufficientCreditsError,
  isRateLimitedError,
  getCreditErrorHint,
  getRateLimitHint,
} from '../../src/lib/errorHandler';

describe('Error Handler — Plain-Language Transformation Suite', () => {
  it('converts network errors into friendly connection messages', () => {
    expect(getUserFriendlyErrorMessage('Network request failed')).toBe(
      'Unable to connect. Please check your internet connection and try again.'
    );
    expect(getUserFriendlyErrorMessage('TypeError: Failed to fetch')).toBe(
      'Unable to connect. Please check your internet connection and try again.'
    );
    expect(getUserFriendlyErrorMessage(new Error('ECONNREFUSED 127.0.0.1:443'))).toBe(
      'Unable to connect. Please check your internet connection and try again.'
    );
  });

  it('converts timeout and abort errors', () => {
    expect(getUserFriendlyErrorMessage('AbortError: The user aborted a request.')).toBe(
      'The request took a bit too long. Please try again.'
    );
    expect(getUserFriendlyErrorMessage('Request timed out after 15000ms')).toBe(
      'The request took a bit too long. Please try again.'
    );
  });

  it('converts insufficient credit errors and extracts hints', () => {
    const errorStr = 'INSUFFICIENT_CREDITS:You need 5 credits to start an interview.';
    expect(isInsufficientCreditsError(errorStr)).toBe(true);
    expect(getCreditErrorHint(errorStr)).toBe('You need 5 credits to start an interview.');
    expect(getUserFriendlyErrorMessage(errorStr)).toBe('You need 5 credits to start an interview.');
  });

  it('converts rate-limited errors and extracts hints', () => {
    const errorStr = 'RATE_LIMITED:Please wait 10 seconds before trying again.';
    expect(isRateLimitedError(errorStr)).toBe(true);
    expect(getRateLimitHint(errorStr)).toBe('Please wait 10 seconds before trying again.');
    expect(getUserFriendlyErrorMessage(errorStr)).toBe('Please wait 10 seconds before trying again.');
  });

  it('converts auth errors into user-friendly messages', () => {
    expect(getUserFriendlyErrorMessage('Invalid login credentials')).toBe(
      'Incorrect email or password. Please try again.'
    );
    expect(getUserFriendlyErrorMessage('User already registered')).toBe(
      'An account with this email already exists. Try signing in instead.'
    );
    expect(getUserFriendlyErrorMessage('Email not confirmed')).toBe(
      'Please check your email to confirm your account before signing in.'
    );
    expect(getUserFriendlyErrorMessage('JWT expired')).toBe(
      'Your session has expired. Please sign in again.'
    );
    expect(getUserFriendlyErrorMessage('AuthApiError: Email rate limit exceeded')).toBe(
      'Too many attempts. Please wait a few minutes before trying again.'
    );
  });

  it('converts file upload and parsing errors', () => {
    expect(getUserFriendlyErrorMessage('Failed to upload: 413 Payload Too Large')).toBe(
      'The selected file is too large. Please choose a file under 5MB.'
    );
    expect(getUserFriendlyErrorMessage('Unsupported FormDataPart implementation')).toBe(
      "We couldn't upload your document. Please check the file and try again."
    );
    expect(getUserFriendlyErrorMessage('Failed to extract text from document')).toBe(
      "We couldn't read the text from that document. Please try pasting the text or using another file."
    );
    expect(getUserFriendlyErrorMessage('SCRAPE_FAILED: Could not read job link')).toBe(
      "We couldn't read that job link. Please paste the job text or attach a file instead."
    );
  });

  it('converts server, edge function, and AI parse errors', () => {
    expect(getUserFriendlyErrorMessage('Edge Function returned a non-2xx status code (500)')).toBe(
      'Our servers encountered a temporary issue. Please try again in a moment.'
    );
    expect(getUserFriendlyErrorMessage('JSON Parse error: Unexpected token < in JSON')).toBe(
      'AI processing was interrupted. Please try again.'
    );
  });

  it('converts database technical errors', () => {
    expect(
      getUserFriendlyErrorMessage('PGRST116: JSON object requested, multiple (or no) rows returned')
    ).toBe("We couldn't complete this action right now. Please try again.");
    expect(
      getUserFriendlyErrorMessage('duplicate key value violates unique constraint')
    ).toBe("We couldn't complete this action right now. Please try again.");
  });

  it('filters out raw technical call stacks or replaces with fallback', () => {
    const stackTrace = 'Error: something crashed at Object.<anonymous> (/app/src/index.ts:12:34)';
    expect(getUserFriendlyErrorMessage(stackTrace, 'Failed to perform action.')).toBe(
      'Failed to perform action.'
    );
  });

  it('preserves clean user-facing English messages', () => {
    expect(getUserFriendlyErrorMessage('Please enter a valid job title.')).toBe(
      'Please enter a valid job title.'
    );
    expect(getUserFriendlyErrorMessage('Target role is required.')).toBe(
      'Target role is required.'
    );
  });
});
