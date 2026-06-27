import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { AppError } from '../_shared/errors.ts';

const app = new Hono();

app.use('/*', cors());

/**
 * Webhook handler for auth.users → public.users sync
 * Called automatically by Supabase when user signs up, updates, or deletes account
 * 
 * Event types:
 * - user.signed_up: New user registered
 * - user.updated: User profile changed
 * - user.deleted: User deleted (GDPR)
 */
app.post('/*', async (c: any) => {
  const payload = await c.req.json();

  if (!payload.type) {
    return c.json({ error: 'Missing event type' }, 400);
  }

  const client = createServiceClient();

  try {
    switch (payload.type) {
      case 'user.signed_up':
        return await handleUserSignup(payload.data.user, client, c);

      case 'user.updated':
        return await handleUserUpdate(payload.data.user, client, c);

      case 'user.deleted':
        return await handleUserDelete(payload.data.user, client, c);

      default:
        return c.json({ message: 'Event processed but not handled', type: payload.type }, 200);
    }
  } catch (error: any) {
    console.error('Auth sync error:', error);
    return c.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

async function handleUserSignup(
  authUser: Record<string, unknown>,
  client: any,
  c: any
) {
  const { id, email, user_metadata } = authUser as any;

  // Check if user already exists (shouldn't happen, but safety first)
  const { data: existing } = await client
    .from('users')
    .select('id')
    .eq('id', id)
    .single();

  if (existing) {
    console.log(`User ${id} already exists, skipping signup`);
    return c.json({ message: 'User already exists' }, 200);
  }

  // Create user in public.users with metadata from auth
  const { error: insertError } = await client.from('users').insert({
    id,
    email,
    first_name: user_metadata?.first_name || null,
    last_name: user_metadata?.last_name || null,
    avatar_url: user_metadata?.avatar_url || null,
    plan: 'FREE',
    ai_credits: 10,
  });

  if (insertError) {
    throw new AppError(
      'INSERT_FAILED',
      500,
      `Failed to create user: ${insertError.message}`
    );
  }

  // Create empty user_profile - CRITICAL for app to work
  const { error: profileError } = await client.from('user_profiles').insert({
    user_id: id,
    profile_completeness: 0,
  });

  if (profileError) {
    console.error('CRITICAL: Failed to create user profile:', profileError);
    throw new AppError(
      'PROFILE_CREATE_FAILED',
      500,
      `Failed to create user profile: ${profileError.message}`
    );
  }

  console.log(`User ${id} signed up successfully`);
  return c.json({ message: 'User created' }, 201);
}

async function handleUserUpdate(
  authUser: Record<string, unknown>,
  client: any,
  c: any
) {
  const { id, email, user_metadata } = authUser as any;

  // Update user with new metadata
  const { error } = await client
    .from('users')
    .update({
      email,
      first_name: user_metadata?.first_name || null,
      last_name: user_metadata?.last_name || null,
      avatar_url: user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new AppError(
      'UPDATE_FAILED',
      500,
      `Failed to update user: ${error.message}`
    );
  }

  console.log(`User ${id} updated`);
  return c.json({ message: 'User updated' }, 200);
}

async function handleUserDelete(
  authUser: Record<string, unknown>,
  client: any,
  c: any
) {
  const { id } = authUser as any;

  // Delete user from public.users (cascade delete will handle related records)
  const { error } = await client.from('users').delete().eq('id', id);

  if (error) {
    throw new AppError(
      'DELETE_FAILED',
      500,
      `Failed to delete user: ${error.message}`
    );
  }

  console.log(`User ${id} deleted (GDPR compliance)`);
  return c.json({ message: 'User deleted' }, 200);
}

Deno.serve(app.fetch);
