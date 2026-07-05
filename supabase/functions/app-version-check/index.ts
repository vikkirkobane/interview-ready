import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VersionCheckRequest {
  platform: 'ios' | 'android';
  currentVersion: string;
}

interface VersionCheckResponse {
  is_valid: boolean;
  needs_update: boolean;
  force_update: boolean;
  current_version: string;
  minimum_version: string;
  latest_version: string;
  message: string;
  store_url: string | null;
  platform: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client (no auth required for version check)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Parse request body
    const { platform, currentVersion }: VersionCheckRequest = await req.json();

    // Validate input
    if (!platform || !currentVersion) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: platform, currentVersion',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['ios', 'android'].includes(platform)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid platform. Must be "ios" or "android"',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate version format (semantic versioning: x.y.z)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(currentVersion)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid version format. Must be semantic version (e.g., "1.0.0")',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call database function to check version
    const { data, error } = await supabaseClient.rpc('check_app_version', {
      p_platform: platform,
      p_current_version: currentVersion,
    });

    if (error) {
      console.error('Error checking app version:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to check app version',
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return version check result
    const result: VersionCheckResponse = data as VersionCheckResponse;

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
