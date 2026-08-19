import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient, createServiceClient } from '../_shared/supabase-client.ts';
import {
  UnauthorizedError,
  ValidationError,
  RateLimitError,
  InternalError,
  errorHandler,
} from '../_shared/errors.ts';
import { sendEmail } from '../_shared/email-service.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

/**
 * Multi-Tier Rate Limiting via Deno KV:
 * 1. User Rate Limit: Max 5 code attempts per 15 minutes per user.
 * 2. IP Rate Limit: Max 15 code attempts per 15 minutes per IP address.
 * Thwarts automated dictionary and brute-force scans.
 */
const MAX_USER_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 15;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

async function checkRateLimit(keyName: string, maxAttempts: number): Promise<boolean> {
  try {
    const kv = await Deno.openKv();
    const key = ['rate_limit:code_submit', keyName];
    const entry = await kv.get<number>(key);
    const currentCount = entry.value ?? 0;

    if (currentCount >= maxAttempts) {
      return false;
    }

    if (currentCount === 0) {
      await kv.set(key, 1, { expireIn: WINDOW_MS });
    } else {
      const result = await kv.atomic()
        .check(entry)
        .set(key, currentCount + 1)
        .commit();
      if (!result.ok) {
        const freshEntry = await kv.get<number>(key);
        if ((freshEntry.value ?? 0) >= maxAttempts) {
          return false;
        }
      }
    }

    return true;
  } catch (err) {
    console.error('[RateLimit] Deno KV error, failing open:', err);
    return true;
  }
}

/**
 * Log failed code attempts for intrusion detection & threat monitoring
 */
async function logFailedAttempt(
  userId: string,
  code: string,
  ip: string,
  reason: string
) {
  try {
    const serviceClient = createServiceClient();
    await serviceClient.from('failed_code_attempts').insert({
      user_id: userId,
      attempted_code: code.slice(0, 30),
      ip_address: ip,
      attempt_type: 'unknown',
      error_reason: reason,
    });
  } catch (err) {
    console.error('[SecurityAudit] Failed to log attempt:', err);
  }
}

/**
 * Delay execution slightly on failed attempts to neutralize timing attacks & slow brute-force bots
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strict Input Schema:
 * Only uppercase alphanumeric characters, underscores, and hyphens (3-20 chars).
 * Blocks SQLi, XSS, control characters, unicode homoglyphs, and buffer fuzzing.
 */
const CODE_REGEX = /^[A-Z0-9_-]{3,20}$/;

const applySchema = z.object({
  referralCode: z
    .string()
    .trim()
    .min(3, 'Code must be at least 3 characters.')
    .max(20, 'Code cannot exceed 20 characters.')
    .regex(CODE_REGEX, 'Code contains invalid characters.'),
});

app.post('/*', async (c) => {
  const clientIp =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    'unknown';

  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      const err = new UnauthorizedError();
      return c.json(err.toJSON(), err.status);
    }

    // 1. IP-level Rate Limit
    const ipAllowed = await checkRateLimit(`ip:${clientIp}`, MAX_IP_ATTEMPTS);
    if (!ipAllowed) {
      const err = new RateLimitError('Too many requests from this IP. Please try again later.');
      return c.json(err.toJSON(), err.status);
    }

    // 2. User-level Rate Limit
    const userAllowed = await checkRateLimit(`user:${user.id}`, MAX_USER_ATTEMPTS);
    if (!userAllowed) {
      const err = new RateLimitError(
        `Too many code attempts. Please wait 15 minutes before trying again.`
      );
      return c.json(err.toJSON(), err.status);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = applySchema.safeParse(body);
    
    if (!parsed.success) {
      await delay(500); // Artificial jitter to throttle bot fuzzing
      const firstError = parsed.error.issues[0]?.message || 'Invalid code format.';
      await logFailedAttempt(user.id, String(body?.referralCode || ''), clientIp, firstError);
      const err = new ValidationError(firstError);
      return c.json(err.toJSON(), err.status);
    }

    const normalizedCode = parsed.data.referralCode.toUpperCase();

    // ── 3. Evaluate Promo Code (e.g. LINKEDIN20) with Advisory Lock ───────────
    const { data: promoData, error: promoError } = await client.rpc('apply_promo_code', {
      p_user_id: user.id,
      p_promo_code: normalizedCode,
    });

    if (!promoError && promoData?.success) {
      const creditsGranted = promoData.credits_granted || 20;

      // Dispatched branded promo confirmation email
      try {
        const userName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'there';
        const serviceClient = createServiceClient();
        await sendEmail({
          to: user.email!,
          templateKey: 'promo_reward',
          templateVariables: {
            user_name: userName,
            promo_code: normalizedCode,
            credits: creditsGranted.toString(),
            app_url: 'https://appinterviewready.top',
            help_url: 'https://appinterviewready.top/#faq',
          },
          emailType: 'promo_reward',
          metadata: {
            user_id: user.id,
            promo_code: normalizedCode,
            credits_granted: creditsGranted,
          },
          supabaseClient: serviceClient,
        });
        console.log(`[ReferralApply] Promo email sent to ${user.email}`);
      } catch (emailErr) {
        console.error('[ReferralApply] Failed to send promo confirmation email:', emailErr);
      }

      return c.json({
        success: true,
        data: {
          is_promo: true,
          credits_granted: creditsGranted,
          promo_code: normalizedCode,
          message: promoData.message || `Success! Promo code applied! You received ${creditsGranted} bonus credits!`,
        },
      });
    }

    // If promo code specifically errored because user already redeemed one, return clean message
    if (!promoError && promoData && !promoData.success && promoData.error?.includes('already redeemed')) {
      await delay(600);
      await logFailedAttempt(user.id, normalizedCode, clientIp, promoData.error);
      return c.json({ success: false, error: promoData.error }, 400);
    }

    // ── 4. Evaluate Peer Referral Code (e.g. JOHN1234) with Advisory Lock ──────
    const { data: refData, error: refError } = await client.rpc('apply_referral_code', {
      p_referred_user_id: user.id,
      p_referral_code: normalizedCode,
    });

    if (refError || !refData?.success) {
      await delay(800); // Thwart brute-force enumeration attacks
      const reason = refData?.error || 'Invalid referral or promo code.';
      await logFailedAttempt(user.id, normalizedCode, clientIp, reason);
      return c.json({
        success: false,
        error: reason.includes('own referral') ? 'You cannot use your own referral code.' : 'Invalid referral or promo code. Please check and try again.',
      }, 400);
    }

    const creditsGranted = refData.credits_granted || 10;

    // Send transactional emails for peer referral
    try {
      const serviceClient = createServiceClient();
      const userName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'there';

      // 1. Email the referrer
      const { data: referrerUser } = await serviceClient
        .from('users')
        .select('id, email, first_name, referral_code, total_referrals')
        .eq('referral_code', normalizedCode)
        .single();

      if (referrerUser?.email) {
        await sendEmail({
          to: referrerUser.email,
          templateKey: 'referral_reward',
          templateVariables: {
            user_name: referrerUser.first_name || 'Friend',
            referred_user: userName,
            credits: (refData.referrer_credits || 10).toString(),
            referral_code: referrerUser.referral_code || normalizedCode,
            total_referrals: (referrerUser.total_referrals || 1).toString(),
          },
          emailType: 'referral_reward',
          metadata: {
            referrer_id: referrerUser.id,
            referred_id: user.id,
            referral_id: refData.referral_id,
          },
          supabaseClient: serviceClient,
        });
        console.log(`[ReferralApply] Referral reward email sent to referrer ${referrerUser.email}`);
      }

      // 2. Email the newly referred user
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: '🎉 Referral Bonus Activated! - Interview Ready',
          html: `<p>Hi ${userName},</p><p>You successfully used referral code <strong>${normalizedCode}</strong>! We have added <strong>${creditsGranted} bonus credits</strong> to your account.</p><p><a href="https://appinterviewready.top">Start Preparing</a></p>`,
          text: `Hi ${userName},\n\nYou successfully used referral code ${normalizedCode}! We have added ${creditsGranted} bonus credits to your account.\n\nStart now: https://appinterviewready.top`,
          emailType: 'referral_bonus_received',
          metadata: {
            user_id: user.id,
            referral_code: normalizedCode,
            credits_granted: creditsGranted,
          },
          supabaseClient: serviceClient,
        });
        console.log(`[ReferralApply] Referral welcome bonus email sent to ${user.email}`);
      }
    } catch (emailErr) {
      console.error('[ReferralApply] Failed to send referral emails:', emailErr);
    }

    return c.json({
      success: true,
      data: {
        is_promo: false,
        referral_id: refData.referral_id,
        credits_granted: creditsGranted,
        message: `Success! Referral code applied! You received ${creditsGranted} credits!`,
      },
    });
  } catch (err) {
    console.error('[ReferralApply] Unexpected error:', err);
    const appError = new InternalError('Failed to apply code.');
    return c.json(appError.toJSON(), appError.status);
  }
});

app.onError(errorHandler);

Deno.serve(app.fetch);
