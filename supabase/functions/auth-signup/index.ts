// @ts-nocheck
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { email, password, firstName = '', lastName = '' } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://appinterviewready.top';
    const redirectTo = `${appUrl}/auth/callback`;

    // 1. Generate Signup Confirmation Link & Create Auth User
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: cleanEmail,
      password: password,
      options: {
        redirectTo,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (linkError) {
      const msg = linkError.message || '';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'An account with this email already exists. Try signing in instead.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let actionLink = linkData?.properties?.action_link || redirectTo;
    // Strict domain hygiene: Replace supabase.co domain with our own /verify-email proxy
    // (Jellyfish flags free cloud subdomains like supabase.co/vercel.app in emails sent from custom domains)
    actionLink = actionLink
      .replace('https://rdxcvqcxgvdgvxvfkhlr.supabase.co/auth/v1/verify', 'https://appinterviewready.top/verify-email')
      .replace(/redirect_to=[^&]+/g, 'redirect_to=https%3A%2F%2Fappinterviewready.top%2Fauth%2Fcallback');
    const displayName = firstName || 'there';

    // 2. Sync to Airtable in background
    const airtableApiKey = Deno.env.get('AIRTABLE_API_KEY');
    const airtableBaseId = Deno.env.get('AIRTABLE_BASE_ID') || 'app5axaWoe4MblFFS';
    const airtableTableName = Deno.env.get('AIRTABLE_TABLE_NAME') || 'Submissions';

    if (airtableApiKey) {
      try {
        const spot = Math.floor(Math.random() * 400) + 500;
        await fetch(
          `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              records: [
                {
                  fields: {
                    'Email': cleanEmail,
                    'Waitlist Spot': spot,
                    'Submitted At': new Date().toISOString(),
                    'Status': 'Confirmed',
                    'Welcome Sent': true,
                    'V2 Sent': true,
                  },
                },
              ],
            }),
          }
        );
      } catch (atErr) {
        console.warn('[Airtable Sync Warning]:', atErr);
      }
    }

    // 3. Dispatch Branded Confirmation Email via sendEmail (Clean RFC 5322 Transactional)
    const confirmSubject = 'Confirm your email address - Interview Ready';
    const confirmHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); }
    .header { background: #2563EB; padding: 28px 24px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 22px; font-weight: 700; margin: 0; color: #ffffff; }
    .body { padding: 28px 24px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 600; font-size: 12px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid #dbeafe; }
    h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 14px 0; }
    p { font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; }
    .features-box { background-color: #f8fafc; border-radius: 8px; padding: 16px 20px; border: 1px solid #edf2f7; margin: 20px 0; }
    .feature-item { margin-bottom: 10px; font-size: 14px; color: #334155; }
    .feature-item:last-child { margin-bottom: 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 6px; display: inline-block; }
    .footer { padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
      </div>
      <div class="body">
        <div class="badge">EMAIL VERIFICATION</div>
        <h2>Hello ${displayName},</h2>
        <p>Thank you for creating an account with Interview Ready. Please verify your email address by clicking the button below:</p>
        <div class="btn-container">
          <a href="${actionLink}" class="btn">Confirm Email Address</a>
        </div>
        <div class="features-box">
          <div class="feature-item"><strong>Mock Interview Coach:</strong> Practice interviews with real-time AI feedback.</div>
          <div class="feature-item"><strong>Resume Scanner:</strong> Match your resume against target job descriptions.</div>
        </div>
        <p style="font-size: 13px; color: #64748b; margin-top: 20px;">If you did not create this account, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>Interview Ready | <a href="https://appinterviewready.top">appinterviewready.top</a> | <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 10px;">You received this transactional email for account verification.</p>
        <p>&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const confirmText = `Hello ${displayName},\n\nThank you for creating an account with Interview Ready. Please verify your email address by clicking the link below:\n\n${actionLink}\n\n- Mock Interview Coach: Practice interviews with real-time AI feedback.\n- Resume Scanner: Match your resume against target job descriptions.\n\nIf you did not create this account, you can safely ignore this email.\n\nInterview Ready | appinterviewready.top | info@appinterviewready.top`;

    let emailSent = false;
    try {
      await sendEmail({
        to: cleanEmail,
        subject: confirmSubject,
        html: confirmHtml,
        text: confirmText,
        emailType: 'signup_confirmation',
        metadata: { source: 'auth_signup_edge' },
      });
      emailSent = true;
    } catch (smtpErr) {
      console.warn('[SMTP Dispatch Error]:', smtpErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: linkData.user,
        emailSent,
        message: 'Account created. Confirmation email sent.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[auth-signup Error]:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Signup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
