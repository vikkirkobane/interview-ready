import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GrantCreditsRequest {
  userId?: string; // Optional: admin can grant to specific user
  amount: number;
  transactionType?: 'grant' | 'bonus' | 'purchase';
  expiresAt?: string;
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

    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
    const { userId, amount, transactionType, expiresAt, metadata }: GrantCreditsRequest = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required');
    }

    // Determine target user (self or specified user for admins)
    const targetUserId = userId || user.id;

    // Grant credits using database function
    const { data: transactionId, error: grantError } = await supabaseClient.rpc('grant_credits', {
      p_user_id: targetUserId,
      p_amount: amount,
      p_transaction_type: transactionType || 'grant',
      p_expires_at: expiresAt || null,
      p_metadata: metadata || {},
    });

    if (grantError) {
      throw grantError;
    }

    // Get updated balance
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('credit_balance, total_credits_earned')
      .eq('id', targetUserId)
      .single();

    if (userDataError) {
      throw userDataError;
    }

    // Log usage event
    await supabaseClient.from('usage_events').insert({
      user_id: targetUserId,
      event: 'credits_granted',
      metadata: {
        amount,
        transaction_type: transactionType || 'grant',
        transaction_id: transactionId,
        granted_by: user.id,
      },
      credits_used: 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transaction_id: transactionId,
          credits_granted: amount,
          new_balance: userData.credit_balance,
          total_earned: userData.total_credits_earned,
          user_id: targetUserId,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Credit grant error:', error);
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
