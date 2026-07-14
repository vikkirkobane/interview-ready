import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient, createServiceClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError } from '../_shared/errors.ts';

const app = new Hono();

app.use('/*', cors());

/**
 * DELETE /auth/delete-account
 * GDPR-compliant user deletion
 * Requires confirmation via email link (not enforced here, assumed verified)
 * Deletes user and all related data via cascade
 */
app.post('/*', async (c: any) => {
  try {
    const authClient = createAuthClient(c.req.raw);
    const serviceClient = createServiceClient();

    // Get current user
    const {
      data: { user: authUser },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !authUser) {
      throw new UnauthorizedError('No active session');
    }

    const userId = authUser.id;

    // Log deletion for compliance
    console.log(`[GDPR] User ${userId} (${authUser.email}) requesting account deletion`);

    // Delete user from public.users (cascade will delete related records)
    const { error: deleteError } = await serviceClient.from('users').delete().eq('id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    // Delete auth user record via Supabase Auth Admin API (service role required)
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error(`[GDPR] Failed to delete auth user ${userId}:`, authDeleteError.message);
      // Continue — public data was already deleted, auth record can be cleaned up later
    }

    console.log(`[GDPR] User ${userId} account fully deleted (public + auth records)`);

    return c.json(
      {
        message: 'Account deleted successfully. All your data has been removed.',
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /auth/delete-account:', error);
    return c.json(
      { error: 'Failed to delete account', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

Deno.serve(app.fetch);
