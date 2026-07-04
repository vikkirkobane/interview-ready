import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeductCreditsRequest {
  feature: string;
  amount?: number; // Optional: override default feature cost
  referenceId?: string;
  metadata?: Record<string, any>;
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
    const { feature, amount, referenceId, metadata }: DeductCreditsRequest = await req.json();

    if (!feature) {
      throw new Error('Feature code is required');
    }

    // Get feature cost if amount not provided
    let creditCost = amount;
    if (!creditCost) {
      const { data: featureData, error: featureError } = await supabaseClient
        .from('credit_pricing')
        .select('credit_cost')
        .eq('feature_code', feature)
        .eq('is_active', true)
        .single();

      if (featureError || !featureData) {
        throw new Error(`Feature not found or inactive: ${feature}`);
      }

      creditCost = featureData.credit_cost;
    }

    // Check if user has enough credits first
    const { data: checkData, error: checkError } = await supabaseClient.rpc('check_credits', {
      p_user_id: user.id,
      p_feature: feature,
    });

    if (checkError) {
      throw checkError;
    }

    if (!checkData.has_enough) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient credits',
          data: {
            required: checkData.required_credits,
            available: checkData.current_balance,
            shortfall: checkData.required_credits - checkData.current_balance,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 402, // Payment Required
        }
      );
    }

    // Deduct credits using database function
    const { data: transactionId, error: deductError } = await supabaseClient.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: creditCost,
      p_feature: feature,
      p_reference_id: referenceId || null,
      p_metadata: metadata || {},
    });

    if (deductError) {
      throw deductError;
    }

    // Get updated balance
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('credit_balance, total_credits_used')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw userDataError;
    }

    // Log usage event
    await supabaseClient.from('usage_events').insert({
      user_id: user.id,
      event: 'credits_deducted',
      metadata: {
        feature,
        amount: creditCost,
        transaction_id: transactionId,
        reference_id: referenceId,
      },
      credits_used: creditCost,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transaction_id: transactionId,
          credits_deducted: creditCost,
          new_balance: userData.credit_balance,
          total_used: userData.total_credits_used,
          feature,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Credit deduction error:', error);
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
