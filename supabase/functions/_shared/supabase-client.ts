import { createClient } from 'npm:@supabase/supabase-js@2.49.0';

/**
 * Creates an authenticated Supabase client using the Authorization header.
 * Use this for actions that should respect Row Level Security (RLS).
 */
export function createAuthClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );
}

/**
 * Creates an admin Supabase client that bypasses RLS.
 * USE WITH CAUTION: Only for internal service operations.
 */
export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}
