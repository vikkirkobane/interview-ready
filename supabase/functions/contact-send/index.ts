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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0A0D14; color: #FFFFFF; border-radius: 12px; border: 1px solid #1E293B;">
        <div style="margin-bottom: 20px; border-bottom: 1px solid #1E293B; padding-bottom: 16px;">
          <h2 style="color: #3377FF; margin: 0 0 8px 0;">New Contact Form Message</h2>
          <p style="color: #94A3B8; margin: 0; font-size: 14px;">Received via Interview Ready Web App</p>
        </div>
        
        <div style="background-color: #111827; padding: 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #1F2937;">
          <p style="margin: 0 0 8px 0;"><strong style="color: #94A3B8;">Sender Name:</strong> <span style="color: #FFFFFF;">${sanitizedName}</span></p>
          <p style="margin: 0 0 8px 0;"><strong style="color: #94A3B8;">Sender Email:</strong> <a href="mailto:${sanitizedEmail}" style="color: #38BDF8; text-decoration: none;">${sanitizedEmail}</a></p>
          <p style="margin: 0;"><strong style="color: #94A3B8;">Date & Time:</strong> <span style="color: #E2E8F0;">${new Date().toUTCString()}</span></p>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="color: #E2E8F0; font-size: 16px; margin: 0 0 8px 0;">Message:</h3>
          <div style="background-color: #1E293B; padding: 16px; border-radius: 8px; color: #F8FAFC; line-height: 1.6; font-size: 15px;">
            ${sanitizedMessage}
          </div>
        </div>

        <div style="border-top: 1px solid #1E293B; padding-top: 16px; font-size: 12px; color: #64748B; text-align: center;">
          <p style="margin: 0;">Hit "Reply" in your email client to respond directly to ${sanitizedEmail}.</p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        to: COMPANY_SUPPORT_EMAIL,
        subject: `[Support Inquiry] Message from ${sanitizedName}`,
        html: htmlBody,
        text: `New contact message from: ${name} (${email})\n\n${message}`,
        emailType: 'contact_inquiry',
        metadata: { sender_name: sanitizedName, sender_email: sanitizedEmail },
        supabaseClient: supabase,
      });
      emailSent = true;
    } catch (inquiryErr) {
      console.warn('Failed to send admin notification email:', inquiryErr);
    }

    // 3. Dispatch auto-acknowledgement email to sender
    try {
      await sendEmail({
        to: email.trim(),
        subject: `We've received your message - Interview Ready Support`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0A0D14; color: #FFFFFF; border-radius: 12px;">
            <h2 style="color: #3377FF; margin-top: 0;">Thank you for contacting Interview Ready</h2>
            <p style="color: #E2E8F0; line-height: 1.6;">Hi ${sanitizedName},</p>
            <p style="color: #E2E8F0; line-height: 1.6;">We have received your message and our support team is reviewing it. We strive to reply within 24 to 48 hours.</p>
            <div style="background-color: #1E293B; padding: 16px; border-radius: 8px; margin: 20px 0; color: #94A3B8; font-size: 14px;">
              <strong style="color: #CBD5E1;">Your message:</strong><br>
              ${sanitizedMessage}
            </div>
            <p style="color: #94A3B8; font-size: 13px;">If you have any further questions, feel free to reply directly to this email or reach us at <a href="mailto:info@appinterviewready.top" style="color: #38BDF8;">info@appinterviewready.top</a>.</p>
          </div>
        `,
        text: `Hi ${sanitizedName},\n\nWe have received your message and our team is reviewing it. We strive to reply within 24 to 48 hours.\n\nYour message:\n${message}\n\nInterview Ready Support`,
        emailType: 'contact_acknowledgement',
        metadata: { recipient_name: sanitizedName },
        supabaseClient: supabase,
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
