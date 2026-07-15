/**
 * credits-monthly-reset Edge Function
 *
 * Fallback monthly credit reset scheduler.
 * Called by a Supabase cron schedule OR triggered manually.
 *
 * Deploy this function, then set up a cron schedule in Supabase Dashboard:
 *   Supabase Dashboard → Edge Functions → credits-monthly-reset → Schedule
 *   Cron expression: 0 0 1 * *   (midnight UTC on the 1st of every month)
 *
 * Alternatively, if pg_cron is enabled, the migration 010_fix_credit_system.sql
 * already registers the schedule at the database level.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow service-role or internal cron calls
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';

    const isCronCall = authHeader === `Bearer ${cronSecret}`;
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

    if (!isCronCall && !isServiceRole) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    // Call the database function that handles both free and expired pro users
    const { error } = await supabase.rpc('reset_monthly_credits');

    if (error) {
      console.error('reset_monthly_credits failed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Monthly credit reset completed at ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({ success: true, ran_at: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('credits-monthly-reset error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
