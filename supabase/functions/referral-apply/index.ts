import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import {
  UnauthorizedError,
  ValidationError,
  RateLimitError,
  InternalError,
  errorHandler,
} from '../_shared/errors.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

/**
 * Rate limiting via Deno KV.
 * Tracks referral apply attempts per user with a 1-hour sliding window.
 * Max 5 attempts per hour per user.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const kv = await Deno.openKv();
    const key = ['referral:attempts', userId];
    const entry = await kv.get<number>(key);
    const currentCount = entry.value ?? 0;

    if (currentCount >= MAX_ATTEMPTS) {
      return false;
    }

    // Increment the counter; set TTL on first attempt
    if (currentCount === 0) {
      await kv.set(key, 1, { expireIn: WINDOW_MS });
    } else {
      // Use atomic to avoid race conditions
      const result = await kv.atomic()
        .check(entry)
        .set(key, currentCount + 1)
        .commit();
      if (!result.ok) {
        // Another request beat us — re-read and check again
        const freshEntry = await kv.get<number>(key);
        if ((freshEntry.value ?? 0) >= MAX_ATTEMPTS) {
          return false;
        }
      }
    }

    return true;
  } catch (err) {
    console.error('[RateLimit] Deno KV error, failing open:', err);
    // Fail open: if KV is unavailable, allow the request
    return true;
  }
}

/**
 * Sanitize database errors — never leak raw SQL/schema details to the client.
 */
function sanitizeDbError(error: any): string {
  if (!error) return 'An unexpected error occurred.';

  const code = error.code;
  const message = (error.message || '').toLowerCase();

  // PostgreSQL constraint violations
  if (code === '23505') return 'This referral has already been applied.';
  if (code === '23503') return 'Invalid referral reference.';
  if (code === '23514') return 'Referral validation failed.';

  // Known business logic errors from apply_referral_code (returned as JSONB)
  if (message.includes('invalid referral code')) return 'Invalid referral code. Please check and try again.';
  if (message.includes('cannot use your own')) return 'You cannot use your own referral code.';
  if (message.includes('already referred')) return 'You have already used a referral code.';

  // Catch-all: generic message, real error logged server-side only
  return 'Failed to apply referral code. Please try again later.';
}

const applySchema = z.object({
  referralCode: z.string().min(1).max(20),
});

app.post('/', async (c) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      const err = new UnauthorizedError();
      return c.json(err.toJSON(), err.status);
    }

    // Rate limit check
    const allowed = await checkRateLimit(user.id);
    if (!allowed) {
      const err = new RateLimitError(
        `Too many referral code attempts. Max ${MAX_ATTEMPTS} per hour.`
      );
      return c.json(err.toJSON(), err.status);
    }

    const body = await c.req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      const err = new ValidationError('Invalid referral code format.');
      return c.json(err.toJSON(), err.status);
    }

    const { referralCode } = parsed.data;
    const normalizedCode = referralCode.trim().toUpperCase();

    // Call the database function
    const { data, error } = await client.rpc('apply_referral_code', {
      p_referred_user_id: user.id,
      p_referral_code: normalizedCode,
    });

    if (error) {
      console.error('[ReferralApply] DB error:', error);
      const safeMessage = sanitizeDbError(error);
      return c.json({ success: false, error: safeMessage }, 400);
    }

    // The DB function returns { success, error, ... } as JSONB
    if (!data?.success) {
      return c.json({ success: false, error: data?.error || 'Invalid referral code.' }, 400);
    }

    return c.json({
      success: true,
      data: {
        referral_id: data.referral_id,
        credits_granted: data.credits_granted,
        message: `Success! You received ${data.credits_granted} credits!`,
      },
    });
  } catch (err) {
    console.error('[ReferralApply] Unexpected error:', err);
    const appError = new InternalError('Failed to apply referral code.');
    return c.json(appError.toJSON(), appError.status);
  }
});

// Error handler for Hono
app.onError(errorHandler);

Deno.serve(app.fetch);
