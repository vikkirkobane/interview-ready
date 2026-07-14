import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateKey?: string;
  templateVariables?: Record<string, string>;
  emailType: string;
  metadata?: Record<string, any>;
}

interface ResendEmailResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
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

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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
    const {
      to,
      subject,
      html,
      text,
      templateKey,
      templateVariables,
      emailType,
      metadata = {},
    }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!to || !emailType) {
      throw new Error('Missing required fields: to, emailType');
    }

    let emailHtml = html;
    let emailText = text;
    let emailSubject = subject;

    // If template key provided, fetch and render template
    if (templateKey) {
      const { data: template, error: templateError } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('template_key', templateKey)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        throw new Error(`Template not found: ${templateKey}`);
      }

      // Replace template variables
      emailHtml = template.html_body;
      emailText = template.text_body;

      if (templateVariables) {
        Object.entries(templateVariables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailHtml = emailHtml?.replace(regex, value);
          emailText = emailText?.replace(regex, value);
        });
      }

      // Use template subject if user didn't provide one
      if (!emailSubject && template.subject) {
        emailSubject = template.subject;
        if (templateVariables) {
          Object.entries(templateVariables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            emailSubject = emailSubject.replace(regex, value);
          });
        }
      }
    }

    // Validate subject after template resolution
    if (!emailSubject) {
      throw new Error('Missing required field: subject (provide directly or via template)');
    }

    // Validate email content
    if (!emailHtml && !emailText) {
      throw new Error('Either html or text content must be provided');
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Get sender email
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Interview Ready <noreply@interviewready.app>';

    // Log email attempt
    const { data: logData, error: logError } = await supabaseClient.rpc('log_email', {
      p_user_id: user.id,
      p_email_to: to,
      p_email_type: emailType,
      p_subject: emailSubject,
      p_template_id: templateKey || null,
      p_metadata: metadata,
      p_status: 'pending',
      p_provider: 'resend',
    });

    if (logError) {
      console.error('Error logging email:', logError);
    }

    const logId = logData;

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      // Update log with failure
      if (logId) {
        await supabaseClient.rpc('update_email_status', {
          p_log_id: logId,
          p_status: 'failed',
          p_error_message: resendData.message || 'Failed to send email',
        });
      }

      throw new Error(resendData.message || 'Failed to send email via Resend');
    }

    // Update log with success
    if (logId) {
      await supabaseClient.rpc('update_email_status', {
        p_log_id: logId,
        p_status: 'sent',
      });
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message_id: resendData.id,
          log_id: logId,
          to: to,
          subject: emailSubject,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
