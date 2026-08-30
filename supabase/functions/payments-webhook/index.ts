import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createPaystackClient } from '../_shared/paystack-client.ts';
import { sendEmail } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Paystack signature
    const signature = req.headers.get('x-paystack-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body
    const body = await req.text();

    // Verify webhook signature
    const paystack = createPaystackClient();
    const isValid = await paystack.verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse event
    const event = JSON.parse(body);
    console.log('Paystack webhook event:', event.event);

    // Create Supabase service role client (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different event types
    switch (event.event) {
      case 'charge.success': {
        // Payment successful
        const data = event.data;
        const reference = data.reference;

        // Update transaction
        await supabase
          .from('payment_transactions')
          .update({
            status: 'success',
            provider_reference: data.id.toString(),
            paid_at: data.paid_at,
            metadata: {
              gateway_response: data.gateway_response,
              channel: data.channel,
              fees: data.fees,
              customer_code: data.customer.customer_code,
              authorization_code: data.authorization?.authorization_code,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('reference', reference);

        console.log(`Payment successful: ${reference}`);

        try {
          const { data: txData } = await supabase
            .from('payment_transactions')
            .select('user_id, metadata, users(email, first_name)')
            .eq('reference', reference)
            .single();

          const planCode = txData?.metadata?.plan_code || data.metadata?.plan_code || data.plan?.plan_code;
          const targetUserId = txData?.user_id || data.metadata?.user_id;

          if (planCode && targetUserId) {
            const currentPeriodStart = new Date();
            const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const { data: subscriptionId, error: subRpcErr } = await supabase.rpc(
              'upsert_paystack_subscription',
              {
                p_user_id: targetUserId,
                p_subscription_code: data.subscription_code || `SUB_${reference}`,
                p_customer_code: data.customer?.customer_code || 'CUST_DIRECT',
                p_plan_code: planCode,
                p_authorization_code: data.authorization?.authorization_code || 'AUTH_DIRECT',
                p_status: 'ACTIVE',
                p_current_period_start: currentPeriodStart.toISOString(),
                p_current_period_end: currentPeriodEnd.toISOString(),
              }
            );

            if (subRpcErr) {
              console.error('Failed to grant credits/subscription on charge.success:', subRpcErr);
            } else {
              console.log(`Granted credits/subscription on charge.success: ${reference}, subId: ${subscriptionId}`);
              if (subscriptionId) {
                await supabase
                  .from('payment_transactions')
                  .update({ subscription_id: subscriptionId })
                  .eq('reference', reference);
              }
            }
          }

          const recipientEmail = txData?.users?.email || data.customer?.email;
          if (recipientEmail) {
            await sendEmail({
              to: recipientEmail,
              templateKey: 'payment_success',
              templateVariables: {
                user_name: txData?.users?.first_name || data.customer?.first_name || 'Customer',
                transaction_id: reference,
                amount: (data.amount / 100).toString(),
                currency: data.currency,
                plan_name: txData?.metadata?.plan_name || data.metadata?.plan_name || 'Interview Ready Subscription',
              },
              emailType: 'payment_success',
              supabaseClient: supabase,
            });
            console.log(`Sent payment_success email to ${recipientEmail}`);
          }
        } catch (postPayErr) {
          console.error('Failed to process post-payment credit/email:', postPayErr);
        }
        break;
      }

      case 'subscription.create': {
        // Subscription created
        const data = event.data;
        const { data: txData } = await supabase
          .from('payment_transactions')
          .select('user_id, metadata')
          .eq('provider_reference', data.id.toString())
          .single();

        if (txData) {
          const currentPeriodStart = new Date();
          const currentPeriodEnd = new Date(data.next_payment_date);

          // upsert_paystack_subscription now reads monthly_credits from paystack_plans
          // and sets ai_credits + credit_balance to the correct tier amount.
          await supabase.rpc('upsert_paystack_subscription', {
            p_user_id: txData.user_id,
            p_subscription_code: data.subscription_code,
            p_customer_code: data.customer.customer_code,
            p_plan_code: data.plan.plan_code,
            p_authorization_code: data.authorization.authorization_code,
            p_status: 'ACTIVE',
            p_current_period_start: currentPeriodStart.toISOString(),
            p_current_period_end: currentPeriodEnd.toISOString(),
          });

          console.log(`Subscription created: ${data.subscription_code}`);
        }
        break;
      }

      case 'subscription.disable': {
        // Subscription cancelled
        const data = event.data;
        await supabase.rpc('cancel_paystack_subscription', {
          p_subscription_code: data.subscription_code,
        });

        // Reset user back to free tier — look up user_id from subscriptions
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('paystack_subscription_code', data.subscription_code)
          .single();

        if (subData?.user_id) {
          await supabase
            .from('users')
            .update({
              plan: 'FREE',
              plan_expires_at: null,
              ai_credits: 10,
              credit_balance: 10,
              updated_at: new Date().toISOString(),
            })
            .eq('id', subData.user_id);

          console.log(`Subscription cancelled — user ${subData.user_id} reverted to FREE tier`);
        }

        console.log(`Subscription cancelled: ${data.subscription_code}`);
        break;
      }

      case 'invoice.payment_failed': {
        // Payment failed for subscription renewal
        const data = event.data;
        
        // Update subscription status to past_due
        await supabase
          .from('subscriptions')
          .update({
            status: 'PAST_DUE',
            updated_at: new Date().toISOString(),
          })
          .eq('paystack_subscription_code', data.subscription.subscription_code);

        console.log(`Payment failed for subscription: ${data.subscription.subscription_code}`);
        break;
      }

      case 'invoice.update': {
        // Invoice updated (usually after successful payment)
        const data = event.data;
        
        if (data.paid) {
          // Update subscription period
          const currentPeriodEnd = new Date(data.next_payment_date);
          
          await supabase
            .from('subscriptions')
            .update({
              status: 'ACTIVE',
              current_period_end: currentPeriodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('paystack_subscription_code', data.subscription.subscription_code);

          // Reset credits for the user — update BOTH credit columns
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('user_id, plan')
            .eq('paystack_subscription_code', data.subscription.subscription_code)
            .single();

          if (subData) {
            const creditsByPlan: Record<string, number> = {
              PREMIUM: 150,
              PREMIUM_PLUS: 400,
              FREE: 10,
            };
            const newCredits = creditsByPlan[subData.plan] ?? 10;

            await supabase
              .from('users')
              .update({
                ai_credits: newCredits,
                credit_balance: newCredits,
                updated_at: new Date().toISOString(),
              })
              .eq('id', subData.user_id);
              
            // Send subscription renewed email
            const { data: userData } = await supabase
              .from('users')
              .select('email, first_name')
              .eq('id', subData.user_id)
              .single();
              
            if (userData?.email) {
              try {
                await sendEmail({
                  to: userData.email,
                  templateKey: 'subscription_renewed',
                  templateVariables: {
                    user_name: userData.first_name || 'Customer',
                    plan_name: subData.plan,
                    next_billing_date: new Date(data.next_payment_date).toLocaleDateString(),
                  },
                  emailType: 'subscription_renewed',
                  supabaseClient: supabase,
                });
                console.log(`Sent subscription_renewed email to ${userData.email}`);
              } catch (emailErr) {
                console.error('Failed to send subscription renewal email:', emailErr);
              }
            }
          }

          console.log(`Subscription renewed: ${data.subscription.subscription_code}`);
        }
        break;
      }

      case 'subscription.not_renew': {
        // Subscription will not renew
        const data = event.data;
        
        await supabase
          .from('subscriptions')
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('paystack_subscription_code', data.subscription_code);

        console.log(`Subscription set to not renew: ${data.subscription_code}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        code: 'WEBHOOK_ERROR',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
