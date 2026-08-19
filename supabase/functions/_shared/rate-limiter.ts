/**
 * Rate limiter for Edge Functions using Deno KV.
 *
 * Uses Deno's built-in KV store to track:
 * - Per-user concurrent request limits (1 active AI request per user)
 * - Global concurrent request limits (max N concurrent AI calls across all users)
 * - Time-based rate limits (max M requests per user per minute)
 *
 * Falls back to in-memory counting when Deno KV is unavailable,
 * and gracefully degrades when KV operations fail.
 */

import { RateLimitError, InternalError } from './errors.ts';

// ── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  /** Max concurrent AI requests per user (1 = no parallel AI calls per user) */
  PER_USER_CONCURRENCY: 2,
  /** Max concurrent AI requests across all users (multi-model rotation supports higher throughput) */
  GLOBAL_CONCURRENCY: 50,
  /** Max requests per user per minute (time-based window) */
  PER_USER_RATE_LIMIT: 20,
  /** Rate limit window in seconds */
  RATE_LIMIT_WINDOW_MS: 60_000,
  /** KV key prefixes */
  KV_PREFIX: 'ratelimit',
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds to wait before retrying
  reason?: string;
  currentConcurrent: number;
}

// ── KV Helpers ───────────────────────────────────────────────────────────────

let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv | null> {
  if (kv) return kv;
  try {
    kv = await Deno.openKv();
    return kv;
  } catch {
    console.warn('[RateLimiter] Deno KV not available (expected in local dev)');
    return null;
  }
}

// ── In-memory fallback (for local dev without KV) ────────────────────────────

const inMemoryState = {
  concurrent: new Map<string, { count: number; expiresAt: number }>(),
  usage: new Map<string, { count: number; windowStart: number }>(),
  globalConcurrent: 0,
};

// ── Core Rate Limiting Logic ─────────────────────────────────────────────────

/**
 * Check if a request should be allowed based on rate limits.
 *
 * @param userId - The authenticated user's ID
 * @param operation - The operation type (e.g. 'JD_ANALYSIS', 'RESUME_GENERATION')
 * @returns RateLimitResult indicating if the request is allowed
 */
export async function checkRateLimit(
  userId: string,
  operation: string,
): Promise<RateLimitResult> {
  const kv = await getKv();

  if (kv) {
    return checkRateLimitWithKv(kv, userId, operation);
  }

  return checkRateLimitInMemory(userId, operation);
}

/**
 * KV-based rate limit check (production, Supabase managed environment).
 */
async function checkRateLimitWithKv(
  kv: Deno.Kv,
  userId: string,
  operation: string,
): Promise<RateLimitResult> {
  const now = Date.now();
  const userKey = [CONFIG.KV_PREFIX, 'user', userId];
  const globalKey = [CONFIG.KV_PREFIX, 'global', operation];
  const usageKey = [CONFIG.KV_PREFIX, 'usage', userId, operation];

  try {
    // ── 1. Check global concurrency ──────────────────────────────────────────
    const globalEntry = await kv.get<number>(globalKey);
    const globalCount = globalEntry?.value ?? 0;

    if (globalCount >= CONFIG.GLOBAL_CONCURRENCY) {
      return {
        allowed: false,
        reason: 'Global concurrency limit reached. Please try again shortly.',
        retryAfter: 5,
        currentConcurrent: globalCount,
      };
    }

    // ── 2. Check per-user concurrency ────────────────────────────────────────
    const userEntry = await kv.get<number>(userKey);
    const userCount = userEntry?.value ?? 0;

    if (userCount >= CONFIG.PER_USER_CONCURRENCY) {
      return {
        allowed: false,
        reason: 'You already have an analysis in progress. Please wait for it to complete.',
        retryAfter: 10,
        currentConcurrent: userCount,
      };
    }

    // ── 3. Check time-based rate limit ───────────────────────────────────────
    const usageEntry = await kv.get<{ count: number; windowStart: number }>(usageKey);
    const usage = usageEntry?.value;

    if (usage) {
      const windowElapsed = now - usage.windowStart;
      if (windowElapsed < CONFIG.RATE_LIMIT_WINDOW_MS && usage.count >= CONFIG.PER_USER_RATE_LIMIT) {
        const retryAfter = Math.ceil((CONFIG.RATE_LIMIT_WINDOW_MS - windowElapsed) / 1000);
        return {
          allowed: false,
          reason: `Rate limit reached. You can make ${CONFIG.PER_USER_RATE_LIMIT} requests per minute.`,
          retryAfter,
          currentConcurrent: userCount,
        };
      }
    }

    // ── 4. All checks passed — increment counters atomically ─────────────────
    const atomic = kv.atomic();

    // Increment global concurrency (expire after 30s to prevent stale increments)
    atomic.set(globalKey, globalCount + 1, { expireIn: 30_000 });
    // Increment user concurrency
    atomic.set(userKey, userCount + 1, { expireIn: 30_000 });
    // Update usage counter (reset window if expired)
    if (usage && now - usage.windowStart < CONFIG.RATE_LIMIT_WINDOW_MS) {
      atomic.set(usageKey, { count: usage.count + 1, windowStart: usage.windowStart });
    } else {
      atomic.set(usageKey, { count: 1, windowStart: now });
    }

    const commitResult = await atomic.commit();
    if (!commitResult.ok) {
      console.warn('[RateLimiter] KV atomic commit failed, falling through');
    }

    return {
      allowed: true,
      currentConcurrent: globalCount + 1,
    };
  } catch (err) {
    console.error('[RateLimiter] KV error, allowing request through:', err);
    return {
      allowed: true, // Fail open — don't block users if KV is down
      currentConcurrent: 0,
    };
  }
}

/**
 * In-memory rate limit check (for local dev without Deno KV).
 */
function checkRateLimitInMemory(
  userId: string,
  _operation: string,
): RateLimitResult {
  const now = Date.now();

  // ── 1. Check global concurrency ────────────────────────────────────────────
  if (inMemoryState.globalConcurrent >= CONFIG.GLOBAL_CONCURRENCY) {
    return {
      allowed: false,
      reason: 'Too many requests being processed. Please try again in a moment.',
      retryAfter: 5,
      currentConcurrent: inMemoryState.globalConcurrent,
    };
  }

  // ── 2. Check per-user concurrency ──────────────────────────────────────────
  const userConcurrent = inMemoryState.concurrent.get(userId);
  if (userConcurrent && userConcurrent.expiresAt > now) {
    if (userConcurrent.count >= CONFIG.PER_USER_CONCURRENCY) {
      return {
        allowed: false,
        reason: 'You already have a request in progress. Please wait.',
        retryAfter: 10,
        currentConcurrent: userConcurrent.count,
      };
    }
  }

  // ── 3. Check time-based rate limit ─────────────────────────────────────────
  const userUsage = inMemoryState.usage.get(userId);
  if (userUsage) {
    const windowElapsed = now - userUsage.windowStart;
    if (windowElapsed < CONFIG.RATE_LIMIT_WINDOW_MS && userUsage.count >= CONFIG.PER_USER_RATE_LIMIT) {
      const retryAfter = Math.ceil((CONFIG.RATE_LIMIT_WINDOW_MS - windowElapsed) / 1000);
      return {
        allowed: false,
        reason: `Rate limit reached. Please wait ${retryAfter} seconds before trying again.`,
        retryAfter,
        currentConcurrent: userConcurrent?.count ?? 0,
      };
    }
  }

  // ── 4. Increment counters ──────────────────────────────────────────────────
  inMemoryState.globalConcurrent++;
  inMemoryState.concurrent.set(userId, {
    count: (userConcurrent?.count ?? 0) + 1,
    expiresAt: now + 30_000,
  });
  if (userUsage && now - userUsage.windowStart < CONFIG.RATE_LIMIT_WINDOW_MS) {
    inMemoryState.usage.set(userId, { count: userUsage.count + 1, windowStart: userUsage.windowStart });
  } else {
    inMemoryState.usage.set(userId, { count: 1, windowStart: now });
  }

  return {
    allowed: true,
    currentConcurrent: inMemoryState.globalConcurrent,
  };
}

/**
 * Decrement the concurrent counter when a request completes.
 * MUST be called in a finally block after the AI operation.
 */
export async function releaseRateLimit(
  userId: string,
  _operation: string,
): Promise<void> {
  const kv = await getKv();

  if (kv) {
    try {
      const userKey = [CONFIG.KV_PREFIX, 'user', userId];
      const globalKey = [CONFIG.KV_PREFIX, 'global', _operation];

      // Decrement global counter
      const globalEntry = await kv.get<number>(globalKey);
      if (globalEntry?.value && globalEntry.value > 0) {
        await kv.set(globalKey, globalEntry.value - 1, { expireIn: 30_000 });
      }

      // Decrement user counter
      const userEntry = await kv.get<number>(userKey);
      if (userEntry?.value && userEntry.value > 0) {
        await kv.set(userKey, userEntry.value - 1, { expireIn: 30_000 });
      }
    } catch (err) {
      console.warn('[RateLimiter] Failed to release KV counters:', err);
    }
  } else {
    // In-memory fallback
    inMemoryState.globalConcurrent = Math.max(0, inMemoryState.globalConcurrent - 1);
    const userConcurrent = inMemoryState.concurrent.get(userId);
    if (userConcurrent) {
      userConcurrent.count = Math.max(0, userConcurrent.count - 1);
    }
  }
}

/**
 * Higher-order function that wraps an AI call with rate limiting.
 * Handles acquire → execute → release lifecycle.
 *
 * Usage:
 *   const result = await withRateLimit(user.id, 'JD_ANALYSIS', async () => {
 *     return await aiClient.callWithJson(...);
 *   });
 */
export async function withRateLimit<T>(
  userId: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const check = await checkRateLimit(userId, operation);

  if (!check.allowed) {
    throw new RateLimitError(
      check.reason || 'Too many requests are being processed right now. Please try again in a few moments.',
      check.retryAfter,
    );
  }

  try {
    return await fn();
  } finally {
    await releaseRateLimit(userId, operation);
  }
}