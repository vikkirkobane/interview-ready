import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient, createServiceClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError } from '../_shared/errors.ts';

const app = new Hono();

app.use('/*', cors());

/**
 * GET /auth/me
 * Returns current authenticated user + profile + plan info
 */
app.get('/*', async (c: any) => {
  try {
    const authClient = createAuthClient(c.req.raw);

    // Get current user from auth
    const {
      data: { user: authUser },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !authUser) {
      throw new UnauthorizedError('No active session');
    }

    // Get user data from public.users
    const { data: user, error: userError } = await authClient
      .from('users')
      .select('id, email, first_name, last_name, avatar_url, plan, ai_credits, plan_expires_at')
      .eq('id', authUser.id)
      .single();

    if (userError || !user) {
      throw new UnauthorizedError('User record not found');
    }

    // Get profile if exists
    const { data: profile } = await authClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    // Check if plan is expired
    const isExpired = user.plan_expires_at && new Date(user.plan_expires_at) < new Date();
    const effectivePlan = isExpired ? 'FREE' : user.plan;

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
      },
      plan: {
        type: effectivePlan,
        expiresAt: user.plan_expires_at,
        isExpired,
      },
      credits: {
        available: user.ai_credits,
        limit: effectivePlan === 'FREE' ? 10 : null, // null = unlimited
      },
      profile: profile || null,
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /auth/me:', error);
    return c.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

Deno.serve(app.fetch);
