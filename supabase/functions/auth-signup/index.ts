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

    const actionLink = linkData?.properties?.action_link || redirectTo;
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

    // 3. Dispatch Branded Confirmation Email via sendEmail
    const confirmSubject = 'Confirm Your Email - Interview Ready';
    const confirmHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ffffff; }
    .header-tagline { font-size: 13px; font-weight: 500; opacity: 0.9; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; color: #dbeafe; }
    .body { padding: 36px 32px; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; border: 1px solid #dbeafe; }
    h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .features-box { background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #edf2f7; margin: 24px 0; }
    .feature-item { margin-bottom: 12px; font-size: 14px; color: #334155; }
    .feature-item:last-child { margin-bottom: 0; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 9999px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28); }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1 class="header-logo">Interview Ready</h1>
        <div class="header-tagline">Confirm Your Email Address</div>
      </div>
      <div class="body">
        <div class="badge">🚀 1-STEP ACTIVATION</div>
        <h2>Hello ${displayName},</h2>
        <p>Thank you for signing up for <strong>Interview Ready</strong>. Click the button below to verify your email and activate your <strong>10 Free AI Credits</strong>:</p>
        <div class="btn-container">
          <a href="${actionLink}" class="btn">Confirm Email & Start</a>
        </div>
        <div class="features-box">
          <div class="feature-item">⚡ <strong>AI ATS Resume Scanner:</strong> Optimize your resume for any role.</div>
          <div class="feature-item">🎯 <strong>AI Mock Interview Coach:</strong> Practice with real-time feedback.</div>
          <div class="feature-item">🎁 <strong>10 Free Credits:</strong> Ready in your account upon verification.</div>
        </div>
        <p style="font-size: 13px; color: #64748b; margin-top: 24px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>Interview Ready • <a href="https://appinterviewready.top">appinterviewready.top</a> • <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a></p>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 12px;">You received this transactional email for your account verification. <a href="mailto:info@appinterviewready.top?subject=unsubscribe">Unsubscribe</a></p>
        <p>© 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const confirmText = `Hello ${displayName},\n\nThank you for signing up for Interview Ready. Please confirm your email address by clicking the link below:\n\n${actionLink}\n\nVisit: https://appinterviewready.top\nSupport: info@appinterviewready.top\n\n- The Interview Ready Team`;

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
