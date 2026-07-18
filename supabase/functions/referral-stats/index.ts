import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import {
  UnauthorizedError,
  InternalError,
  errorHandler,
} from '../_shared/errors.ts';

const app = new Hono();

app.use('/*', cors());

app.post('/*', async (c) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      const err = new UnauthorizedError();
      return c.json(err.toJSON(), err.status);
    }

    // Get referral stats from the database function
    const { data, error } = await client.rpc('get_referral_stats', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('[ReferralStats] DB error:', error);
      const appError = new InternalError('Failed to fetch referral stats.');
      return c.json(appError.toJSON(), appError.status);
    }

    let statsData = data || {
      referral_code: null,
      total_referrals: 0,
      credits_earned: 0,
      referrals: [],
    };

    // Auto-generate referral code for existing users who don't have one
    if (!statsData.referral_code) {
      const { data: newCode, error: genError } = await client.rpc('generate_referral_code', {
        p_user_id: user.id,
      });

      if (!genError && newCode) {
        statsData.referral_code = newCode;
      }
    }

    return c.json({ success: true, data: statsData });
  } catch (err) {
    console.error('[ReferralStats] Unexpected error:', err);
    const appError = new InternalError('Failed to fetch referral stats.');
    return c.json(appError.toJSON(), appError.status);
  }
});

app.onError(errorHandler);

Deno.serve(app.fetch);
