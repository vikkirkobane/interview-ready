import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckCreditsRequest {
  feature: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { feature }: CheckCreditsRequest = await req.json();

    if (!feature) {
      throw new Error('Feature code is required');
    }

    // Check credits using database function
    const { data, error } = await supabaseClient.rpc('check_credits', {
      p_user_id: user.id,
      p_feature: feature,
    });

    if (error) {
      throw error;
    }

    // Get user's current balance and plan
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('credit_balance, plan')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw userDataError;
    }

    // Get feature details
    const { data: featureData, error: featureError } = await supabaseClient
      .from('credit_pricing')
      .select('*')
      .eq('feature_code', feature)
      .eq('is_active', true)
      .single();

    if (featureError) {
      throw featureError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...data,
          user_plan: userData.plan,
          feature: {
            code: featureData.feature_code,
            name: featureData.feature_name,
            cost: featureData.credit_cost,
            category: featureData.category,
            description: featureData.description,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Credit check error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
