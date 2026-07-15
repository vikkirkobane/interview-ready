import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { createPaystackClient } from '../_shared/paystack-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
  reference: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create authenticated Supabase client
    const supabase = createAuthClient(req);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { reference } = await req.json() as VerifyPaymentRequest;

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Payment reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transaction exists and belongs to user
    const { data: txData, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('reference', reference)
      .eq('user_id', user.id)
      .single();

    if (txError || !txData) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already verified, return existing data
    if (txData.status === 'success') {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'success',
            reference: txData.reference,
            amount: txData.amount,
            currency: txData.currency,
            paid_at: txData.paid_at,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Paystack client
    const paystack = createPaystackClient();

    // Verify payment with Paystack
    const verifyResponse = await paystack.verifyPayment(reference);

    if (!verifyResponse.status) {
      throw new Error(verifyResponse.message || 'Payment verification failed');
    }

    const paymentData = verifyResponse.data;

    // Update transaction status
    const { error: updateTxError } = await supabase
      .from('payment_transactions')
      .update({
        status: paymentData.status,
        provider_reference: paymentData.id.toString(),
        paid_at: paymentData.status === 'success' ? paymentData.paid_at : null,
        metadata: {
          ...txData.metadata,
          gateway_response: paymentData.gateway_response,
          channel: paymentData.channel,
          fees: paymentData.fees,
          customer_code: paymentData.customer.customer_code,
          authorization_code: paymentData.authorization?.authorization_code,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    if (updateTxError) {
      console.error('Failed to update transaction:', updateTxError);
    }

    // If payment successful, create/update subscription
    if (paymentData.status === 'success') {
      const planCode = txData.metadata?.plan_code;
      
      if (planCode && paymentData.authorization) {
        try {
          // Create subscription with Paystack
          const subscriptionResponse = await paystack.createSubscription({
            customer: paymentData.customer.customer_code,
            plan: planCode,
            authorization: paymentData.authorization.authorization_code,
          });

          if (subscriptionResponse.status) {
            const subData = subscriptionResponse.data;
            
            // Calculate period dates
            const currentPeriodStart = new Date();
            const currentPeriodEnd = new Date(subData.next_payment_date);

            // Use the database function to create/update subscription
            const { data: subscriptionId, error: subError } = await supabase.rpc(
              'upsert_paystack_subscription',
              {
                p_user_id: user.id,
                p_subscription_code: subData.subscription_code,
                p_customer_code: paymentData.customer.customer_code,
                p_plan_code: planCode,
                p_authorization_code: paymentData.authorization.authorization_code,
                p_status: 'ACTIVE',
                p_current_period_start: currentPeriodStart.toISOString(),
                p_current_period_end: currentPeriodEnd.toISOString(),
              }
            );

            if (subError) {
              console.error('Failed to create subscription:', subError);
            } else {
              // upsert_paystack_subscription already sets ai_credits + credit_balance
              // per plan tier (PREMIUM=150, PREMIUM_PLUS=400) — no extra update needed.

              // Update transaction with subscription_id
              await supabase
                .from('payment_transactions')
                .update({ subscription_id: subscriptionId })
                .eq('reference', reference);
            }
          }
        } catch (subError) {
          console.error('Subscription creation error:', subError);
          // Don't fail the payment verification if subscription creation fails
          // We can retry later or handle manually
        }
      }

      // Log usage event
      await supabase.from('usage_events').insert({
        user_id: user.id,
        event: 'payment_successful',
        metadata: {
          reference,
          amount: paymentData.amount,
          plan_code: planCode,
        },
        credits_used: 0,
      });
    }

    // Return verification result
    return new Response(
      JSON.stringify({
        success: paymentData.status === 'success',
        data: {
          status: paymentData.status,
          reference: paymentData.reference,
          amount: paymentData.currency === 'NGN' ? paymentData.amount / 100 : paymentData.amount, // Only NGN uses kobo sub-units
          currency: paymentData.currency,
          paid_at: paymentData.paid_at,
          gateway_response: paymentData.gateway_response,
          channel: paymentData.channel,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        code: 'PAYMENT_VERIFY_ERROR',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
