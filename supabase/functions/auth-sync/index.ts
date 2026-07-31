import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createServiceClient } from '../_shared/supabase-client.ts';
import { AppError } from '../_shared/errors.ts';
import { sendEmail } from '../_shared/email-service.ts';

const app = new Hono();

app.use('/*', cors());

/**
 * Webhook handler for auth events
 * Called automatically by Supabase when user signs up, updates, or deletes account
 * 
 * Event types:
 * - user.signed_up: New user registered - sends welcome email
 * - user.updated: User profile changed - syncs metadata
 * - user.deleted: User deleted (GDPR) - cleanup
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

  // User creation is handled by database trigger handle_new_user()
  // This function only sends welcome email
  console.log(`User ${id} signed up, sending welcome email`);

  // Get user data for email
  const { data: userData } = await client
    .from('users')
    .select('first_name, ai_credits')
    .eq('id', id)
    .single();

  const userName = userData?.first_name || user_metadata?.first_name || email?.split('@')[0] || 'there';
  const credits = userData?.ai_credits || 10;

  try {
    // Send welcome email using template
    await sendEmail({
      to: email,
      templateKey: 'welcome',
      templateVariables: {
        user_name: userName,
        credits: credits.toString(),
      },
      emailType: 'welcome',
      metadata: {
        user_id: id,
        event: 'user.signed_up',
      },
      supabaseClient: client,
    });

    console.log(`Welcome email sent to ${email}`);
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError);
    // Don't fail the webhook if email fails - user is still created
  }

  return c.json({ message: 'Welcome email sent' }, 200);
}

async function handleUserUpdate(
  authUser: Record<string, unknown>,
  client: any,
  c: any
) {
  const { id, email, user_metadata } = authUser as any;

  // Resolve first_name — LinkedIn sends 'given_name', email/Google send 'first_name'
  const rawFirstName =
    user_metadata?.first_name ||
    user_metadata?.given_name ||
    null;

  // Resolve last_name — LinkedIn sends 'family_name', email/Google send 'last_name'
  const rawLastName =
    user_metadata?.last_name ||
    user_metadata?.family_name ||
    null;

  // Fallback: split full_name / name if both first & last are still missing
  let firstName = rawFirstName;
  let lastName = rawLastName;
  if (!firstName) {
    const fullName = user_metadata?.full_name || user_metadata?.name || '';
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      firstName = parts[0] || null;
      lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
    }
  }

  // Resolve avatar — LinkedIn sends 'picture', email/Google send 'avatar_url'
  const avatarUrl =
    user_metadata?.avatar_url ||
    user_metadata?.picture ||
    null;

  // Update user with new metadata (if different from current values)
  const { error } = await client
    .from('users')
    .update({
      email,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error(`Failed to update user ${id}:`, error.message);
    // Don't fail the webhook if update fails - non-critical
  }

  console.log(`User ${id} update processed`);
  return c.json({ message: 'User update processed' }, 200);
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
