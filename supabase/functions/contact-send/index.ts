// @ts-nocheck
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMPANY_SUPPORT_EMAIL = 'info@appinterviewready.top';

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { name, email, message } = body;

    // Validate fields
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Name, email, and message are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid email address.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get authenticated user if available
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // 1. Insert into contact_messages database table
    const { error: dbError } = await supabase.from('contact_messages').insert({
      user_id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      status: 'new',
      source: 'web_contact_form',
      metadata: {
        submitted_at: new Date().toISOString(),
      },
    });

    if (dbError) {
      console.warn('Could not insert contact message row:', dbError);
    }

    // 2. Dispatch notification email to company support email via Spaceship
    let emailSent = false;
    const sanitizedName = name.replace(/[<>]/g, '').trim();
    const sanitizedEmail = email.replace(/[<>]/g, '').trim().toLowerCase();
    const sanitizedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

    // Admin recipient: prioritize configured admin email (e.g. personal inbox or support address)
    const adminRecipient = Deno.env.get('ADMIN_NOTIFICATION_EMAIL') || 
                           Deno.env.get('SUPPORT_NOTIFICATION_EMAIL') || 
                           COMPANY_SUPPORT_EMAIL;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 24px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .header { background: #2563EB; padding: 20px 24px; color: #ffffff; }
    .header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; }
    .body { padding: 24px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 6px 0; font-size: 14px; vertical-align: top; }
    .label { color: #64748b; font-weight: 600; width: 80px; }
    .val { color: #0f172a; font-weight: 500; }
    .message-container { background: #f1f5f9; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h2>New Website Contact Inquiry</h2>
      </div>
      <div class="body">
        <table class="info-table">
          <tr>
            <td class="label">From:</td>
            <td class="val"><strong>${sanitizedName}</strong></td>
          </tr>
          <tr>
            <td class="label">Email:</td>
            <td class="val"><a href="mailto:${sanitizedEmail}" style="color: #2563EB;">${sanitizedEmail}</a></td>
          </tr>
          <tr>
            <td class="label">Date:</td>
            <td class="val">${new Date().toUTCString()}</td>
          </tr>
        </table>
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #334155;">Message Content:</p>
        <div class="message-container">${sanitizedMessage}</div>
      </div>
      <div class="footer">
        <p style="margin: 0;">Reply directly to this email to respond to ${sanitizedName} (${sanitizedEmail}).</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const plainTextBody = `New website contact inquiry received via Interview Ready.\n\n` +
      `From: ${sanitizedName}\n` +
      `Email: ${sanitizedEmail}\n` +
      `Date: ${new Date().toUTCString()}\n\n` +
      `Message Content:\n${message.trim()}\n\n` +
      `---\n` +
      `Reply directly to this email to respond to ${sanitizedName} (${sanitizedEmail}).`;

    try {
      await sendEmail({
        to: adminRecipient,
        replyTo: `${sanitizedName} <${sanitizedEmail}>`,
        subject: `Contact Inquiry: ${sanitizedName}`,
        html: htmlBody,
        text: plainTextBody,
        emailType: 'contact_inquiry',
        metadata: { sender_name: sanitizedName, sender_email: sanitizedEmail },
      });
      emailSent = true;
    } catch (inquiryErr) {
      console.warn('Failed to send admin notification email:', inquiryErr);
    }

    // 3. Dispatch auto-acknowledgement email to sender
    const ackSubject = `We received your message - Interview Ready Support`;
    const ackHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 24px 12px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .header { background: #2563EB; padding: 24px; color: #ffffff; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; }
    .body { padding: 24px; }
    .body p { font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; }
    .quote-box { background: #f8fafc; border-left: 3px solid #2563EB; border-radius: 4px; padding: 12px 16px; margin: 16px 0; color: #475569; font-size: 14px; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
    .footer a { color: #2563EB; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>Interview Ready Support</h1>
      </div>
      <div class="body">
        <p>Hello ${sanitizedName},</p>
        <p>Thank you for reaching out to Interview Ready. We have received your message and our team will get back to you within 24 to 48 hours.</p>
        <p style="margin-bottom: 6px; font-weight: 600; color: #1e293b;">Copy of your message:</p>
        <div class="quote-box">${sanitizedMessage}</div>
        <p>If you have additional details to add, feel free to reply directly to this email.</p>
        <p>Best regards,<br>The Interview Ready Team</p>
      </div>
      <div class="footer">
        <p>Interview Ready | <a href="https://appinterviewready.top">appinterviewready.top</a></p>
        <p>&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const ackText = `Hello ${sanitizedName},\n\n` +
      `Thank you for reaching out to Interview Ready. We have received your message and our team will get back to you within 24 to 48 hours.\n\n` +
      `Copy of your message:\n${message.trim()}\n\n` +
      `If you have additional details to add, feel free to reply directly to this email.\n\n` +
      `Best regards,\nThe Interview Ready Team\n\n` +
      `Interview Ready | appinterviewready.top`;

    try {
      await sendEmail({
        to: sanitizedEmail,
        replyTo: 'Interview Ready Support <info@appinterviewready.top>',
        subject: ackSubject,
        html: ackHtml,
        text: ackText,
        emailType: 'contact_acknowledgement',
        metadata: { recipient_name: sanitizedName },
      });
    } catch (ackErr) {
      console.warn('Failed to send auto-acknowledgement email:', ackErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your message has been sent to info@appinterviewready.top',
        emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact send error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
