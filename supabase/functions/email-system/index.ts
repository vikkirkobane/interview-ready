import { Hono } from 'https://deno.land/x/hono@v3.12.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { sendEmail } from '../_shared/email-service.ts';

const app = new Hono();

app.post('/welcome', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: c.req.header('Authorization')! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    await sendEmail({
      to: user.email,
      templateKey: 'welcome',
      templateVariables: {
        first_name: user.user_metadata?.first_name || 'there',
        app_url: Deno.env.get('APP_URL') || 'https://app.interviewready.app',
        help_url: Deno.env.get('HELP_URL') || 'https://interviewready.app/help',
        current_year: new Date().getFullYear().toString()
      },
      emailType: 'welcome',
      metadata: { user_id: user.id }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Welcome email failed:', error);
    return c.json({
      error: 'Failed to send welcome email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.post('/onboarding-recovery', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: c.req.header('Authorization')! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { step } = await c.req.json();
  if (!step || ![2, 3].includes(step)) {
    return c.json({ error: 'Invalid step specified' }, 400);
  }

  try {
    const templateKey = step === 2 ? 'onboarding_recovery_step2' : 'onboarding_recovery_step3';

    await sendEmail({
      to: user.email,
      templateKey,
      templateVariables: {
        first_name: user.user_metadata?.first_name || 'there',
        app_url: Deno.env.get('APP_URL') || 'https://app.interviewready.app',
        help_url: Deno.env.get('HELP_URL') || 'https://interviewready.app/help',
        ...(step === 3 ? {
          job_match_score: '85',
          ats_score: '8',
          skills_matched: '12',
          total_skills: '15'
        } : {})
      },
      emailType: `onboarding_recovery_step${step}`,
      metadata: {
        user_id: user.id,
        onboarding_step: step
      }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error(`Onboarding recovery step ${step} failed:`, error);
    return c.json({
      error: `Failed to send onboarding recovery email (step ${step})`,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.post('/credit-reset', async (c) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: c.req.header('Authorization')! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  try {
    // Determine credits based on plan
    const credits = user.user_metadata?.plan === 'FREE' ? 10 :
                  user.user_metadata?.plan === 'PREMIUM' ? 150 : 400;

    await sendEmail({
      to: user.email,
      templateKey: 'credit_reset',
      templateVariables: {
        first_name: user.user_metadata?.first_name || 'there',
        credits: credits.toString(),
        current_month: new Date().toLocaleString('default', { month: 'long' })
      },
      emailType: 'credit_reset',
      metadata: {
        user_id: user.id,
        credits: credits,
        plan: user.user_metadata?.plan || 'FREE'
      }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Credit reset email failed:', error);
    return c.json({
      error: 'Failed to send credit reset email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Function to handle subscription renewal emails
// This would be called from payments-webhook after renewal
app.post('/subscription-renewed', async (c) => {
  const { userId, planName, nextBillingDate } = await c.req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: userData } = await supabase
    .from('users')
    .select('email, user_metadata')
    .eq('id', userId)
    .single();

  if (!userData?.email) {
    return c.json({ error: 'User not found' }, 404);
  }

  try {
    await sendEmail({
      to: userData.email,
      templateKey: 'subscription_renewed',
      templateVariables: {
        user_name: userData.user_metadata?.first_name || 'Customer',
        plan_name: planName,
        next_billing_date: new Date(nextBillingDate).toLocaleDateString()
      },
      emailType: 'subscription_renewed',
      supabaseClient: supabase,
      metadata: {
        user_id: userId,
        plan: planName
      }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Subscription renewal email failed:', error);
    return c.json({
      error: 'Failed to send subscription renewal email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

Deno.serve(app.fetch);