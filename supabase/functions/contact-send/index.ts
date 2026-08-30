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
    const sanitizedName = name.replace(/[<>]/g, '');
    const sanitizedEmail = email.replace(/[<>]/g, '');
    const sanitizedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; }
          .card { max-width: 580px; margin: 20px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 24px; color: #ffffff; text-align: center; }
          .body { padding: 28px; }
          .detail-box { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #edf2f7; margin-bottom: 20px; }
          .msg-box { background: #eff6ff; border-radius: 12px; padding: 16px; border: 1px solid #bfdbfe; color: #1e3a8a; line-height: 1.6; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h2 style="margin: 0; font-size: 20px;">New Support Inquiry</h2>
          </div>
          <div class="body">
            <div class="detail-box">
              <p style="margin: 0 0 6px;"><strong>Sender:</strong> ${sanitizedName}</p>
              <p style="margin: 0 0 6px;"><strong>Email:</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
              <p style="margin: 0;"><strong>Date:</strong> ${new Date().toUTCString()}</p>
            </div>
            <h3 style="font-size: 15px; margin: 0 0 8px;">Message:</h3>
            <div class="msg-box">${sanitizedMessage}</div>
          </div>
          <div class="footer">
            <p style="margin: 0;">Hit "Reply" in your email client to respond to ${sanitizedEmail}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: COMPANY_SUPPORT_EMAIL,
        subject: `[Support Inquiry] Message from ${sanitizedName}`,
        html: htmlBody,
        text: `New contact message from: ${name} (${email})\n\n${message}`,
        emailType: 'contact_inquiry',
        metadata: { sender_name: sanitizedName, sender_email: sanitizedEmail },
      });
      emailSent = true;
    } catch (inquiryErr) {
      console.warn('Failed to send admin notification email:', inquiryErr);
    }

    // 3. Dispatch auto-acknowledgement email to sender
    try {
      await sendEmail({
        to: email.trim(),
        subject: `Message Received: Interview Ready Support`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; }
              .card { max-width: 580px; margin: 20px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
              .header { background: linear-gradient(135deg, #1E40AF 0%, #2563EB 100%); padding: 28px; color: #ffffff; text-align: center; }
              .body { padding: 28px; }
              .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid #dbeafe; }
              .msg-box { background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #edf2f7; margin: 16px 0; color: #475569; font-size: 14px; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1 style="margin: 0; font-size: 22px;">Interview Ready Support</h1>
              </div>
              <div class="body">
                <div class="badge">✓ INQUIRY RECEIVED</div>
                <h2 style="font-size: 18px; margin: 0 0 12px;">Hi ${sanitizedName},</h2>
                <p style="font-size: 14px; color: #475569; line-height: 1.6;">Thank you for contacting Interview Ready. Our support team has received your message and will reply within 24 to 48 hours.</p>
                <div class="msg-box">
                  <strong style="color: #0f172a;">Your Message:</strong><br>
                  ${sanitizedMessage}
                </div>
                <p style="font-size: 13px; color: #64748b;">You can reply directly to this email or reach us anytime at <a href="mailto:info@appinterviewready.top" style="color: #2563eb;">info@appinterviewready.top</a>.</p>
              </div>
              <div class="footer">
                <p>Interview Ready • <a href="https://appinterviewready.top" style="color: #2563eb; text-decoration: none;">appinterviewready.top</a></p>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">You received this transactional confirmation for your support inquiry. <a href="mailto:info@appinterviewready.top?subject=unsubscribe">Unsubscribe</a></p>
                <p>© 2026 Interview Ready. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${sanitizedName},\n\nThank you for contacting Interview Ready. We have received your message and will reply within 24 to 48 hours.\n\nYour message:\n${message}\n\nInterview Ready Support\ninfo@appinterviewready.top`,
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
