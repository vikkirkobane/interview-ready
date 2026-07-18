import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { createPaystackClient } from '../_shared/paystack-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitializePaymentRequest {
  planCode: string;
  callbackUrl: string;
  countryCode?: string | null; // 'KE' for Kenya M-Pesa, null for international USD
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create authenticated Supabase client
    const supabaseClient = createAuthClient(req);

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { planCode, callbackUrl, countryCode }: InitializePaymentRequest = await req.json();

    if (!planCode || !callbackUrl) {
      throw new Error('Missing required fields: planCode, callbackUrl');
    }

    // Get plan details from database
    const { data: plan, error: planError } = await supabaseClient
      .from('paystack_plans')
      .select('*')
      .eq('plan_code', planCode)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      throw new Error('Invalid or inactive plan');
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabaseClient
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Generate unique reference
    const reference = `IR_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Determine payment channels based on currency and country
    let channels: string[];
    let metadata: Record<string, any> = {
      user_id: user.id,
      plan_code: planCode,
      plan_type: plan.plan_type,
      plan_interval: plan.interval,
    };

    if (plan.currency === 'KES' && countryCode === 'KE') {
      // Kenya - M-Pesa and Card payments
      channels = ['mobile_money', 'card'];
      metadata.country_code = 'KE';
      metadata.payment_mode = 'kenya';
    } else if (plan.currency === 'USD') {
      // All other countries - Card only
      channels = ['card'];
      metadata.payment_mode = 'international';
    } else {
      throw new Error('Invalid currency/country combination');
    }

    // We DO NOT call paystack.initializePayment() here because the 
    // react-native-paystack-webview component initializes the transaction 
    // directly from the client. Calling it here causes a "Duplicate Transaction Reference" error.

    // Store transaction in database
    const { error: txError } = await supabaseClient.from('payment_transactions').insert({
      user_id: user.id,
      reference,
      amount: plan.amount,
      currency: plan.currency,
      country_code: countryCode || null,
      status: 'pending',
      payment_provider: 'paystack',
      payment_method: plan.currency === 'KES' ? 'mobile_money' : 'card',
      metadata: {
        plan_code: planCode,
        plan_name: plan.name,
        plan_type: plan.plan_type,
        interval: plan.interval,
        channels,
      },
    });

    if (txError) {
      console.error('Failed to store transaction:', txError);
      throw new Error('Failed to store transaction record');
    }

    // Return success response with just the reference
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reference: reference,
          amount: plan.amount,
          currency: plan.currency,
          country: countryCode || 'INTERNATIONAL',
          plan: {
            code: plan.plan_code,
            name: plan.name,
            type: plan.plan_type,
            interval: plan.interval,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Payment initialization error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const isAuthError = errorMessage.includes('Unauthorized') || errorMessage.includes('Authorization');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isAuthError ? 401 : 400,
      }
    );
  }
});
