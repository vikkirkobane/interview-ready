import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface SendEmailRequest {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  templateKey?: string;
  templateVariables?: Record<string, string>;
  emailType: string;
  metadata?: Record<string, any>;
  supabaseClient?: any;
}

// PII sanitization helpers
function sanitizeEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function sanitizeSubject(subject: string): string {
  // Remove any potential PII from subject
  return subject
    .replace(/\d{3}-\d{3}-\d{4}/g, '[PHONE]')
    .replace(/\d{5,}/g, '[ID]');
}

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  // Strip sensitive fields from metadata
  const safeMetadata = { ...metadata };
  delete safeMetadata.user_data;
  delete safeMetadata.profile;
  return safeMetadata;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  templateKey,
  templateVariables,
  emailType,
  metadata = {},
  supabaseClient,
}: SendEmailRequest) {
  // Use provided supabaseClient or create a service role client
  const supabase = supabaseClient ?? createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let emailHtml = html;
  let emailText = text;
  let emailSubject = subject;

  // If template key provided, fetch and render template
  if (templateKey) {
    const { data: template, error: templateError } = await supabase
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

  // Get user_id if we have a supabase client that is authenticated, otherwise we might need to find the user by email
  let userId = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    userId = user.id;
  } else {
    // Try to get user_id by email from public.users table just for logging purposes
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', to)
      .single();
    if (userData) {
      userId = userData.id;
    }
  }

  // Log email attempt with PII sanitization
  const { data: logData, error: logError } = await supabase.rpc('log_email', {
    p_user_id: userId,
    p_email_to: sanitizeEmail(to),
    p_email_type: emailType,
    p_subject: sanitizeSubject(emailSubject),
    p_template_id: templateKey || null,
    p_metadata: sanitizeMetadata(metadata),
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
      await supabase.rpc('update_email_status', {
        p_log_id: logId,
        p_status: 'failed',
        p_error_message: resendData.message || 'Failed to send email',
      });
    }

    throw new Error(resendData.message || 'Failed to send email via Resend');
  }

  // Update log with success
  if (logId) {
    await supabase.rpc('update_email_status', {
      p_log_id: logId,
      p_status: 'sent',
    });
  }

  return {
    success: true,
    message_id: resendData.id,
    log_id: logId,
  };
}