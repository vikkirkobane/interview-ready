// @ts-nocheck
declare const Deno: any;
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
  return subject
    .replace(/\d{3}-\d{3}-\d{4}/g, '[PHONE]')
    .replace(/\d{5,}/g, '[ID]');
}

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const safeMetadata = { ...metadata };
  delete safeMetadata.user_data;
  delete safeMetadata.profile;
  return safeMetadata;
}

/**
 * Native SMTP over TLS client for Spaceship (Spacemail)
 * Connects directly to mail.spacemail.com:465
 */
async function sendSpaceshipSmtp({
  to,
  from,
  subject,
  html,
  text,
  host = Deno.env.get('SPACESHIP_SMTP_HOST') || 'mail.spacemail.com',
  port = Number(Deno.env.get('SPACESHIP_SMTP_PORT')) || 465,
  user = Deno.env.get('SPACESHIP_SMTP_USER') || Deno.env.get('SPACEMAIL_USER') || 'info@appinterviewready.top',
  pass = Deno.env.get('SPACESHIP_SMTP_PASS') || Deno.env.get('SPACESHIP_SMTP_PASSWORD') || Deno.env.get('SPACEMAIL_PASSWORD') || Deno.env.get('SMTP_PASS') || '',
}: {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
}): Promise<{ messageId: string }> {
  if (!pass) {
    console.warn('[Spaceship SMTP] No SMTP password set in SPACESHIP_SMTP_PASSWORD / SPACEMAIL_PASSWORD / SMTP_PASS');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Extract clean email from "Name <email@domain>"
  const fromEmailMatch = from.match(/<([^>]+)>/);
  const cleanFromEmail = fromEmailMatch ? fromEmailMatch[1] : from.trim();
  const cleanToEmail = to.trim();

  // Connect via TLS (Direct SSL on 465)
  const conn = await Deno.connectTls({
    hostname: host,
    port: port,
  });

  const readResponse = async (): Promise<string> => {
    const buf = new Uint8Array(2048);
    const n = await conn.read(buf);
    if (n === null) return '';
    return decoder.decode(buf.subarray(0, n));
  };

  const sendCommand = async (cmd: string): Promise<string> => {
    await conn.write(encoder.encode(cmd + '\r\n'));
    return await readResponse();
  };

  try {
    // 1. Initial Greeting
    const greeting = await readResponse();
    if (!greeting.startsWith('220')) {
      throw new Error(`Spaceship SMTP greeting failed: ${greeting}`);
    }

    // 2. EHLO
    const ehlo = await sendCommand('EHLO appinterviewready.top');
    if (!ehlo.startsWith('250')) {
      throw new Error(`EHLO failed: ${ehlo}`);
    }

    // 3. AUTH LOGIN if password provided
    if (pass && user) {
      const authInit = await sendCommand('AUTH LOGIN');
      if (!authInit.startsWith('334')) {
        throw new Error(`AUTH LOGIN initiation failed: ${authInit}`);
      }

      const userB64 = btoa(user);
      const userResp = await sendCommand(userB64);
      if (!userResp.startsWith('334')) {
        throw new Error(`AUTH username failed: ${userResp}`);
      }

      const passB64 = btoa(pass);
      const passResp = await sendCommand(passB64);
      if (!passResp.startsWith('235')) {
        throw new Error(`AUTH password failed: ${passResp}`);
      }
    }

    // 4. MAIL FROM
    const mailFromResp = await sendCommand(`MAIL FROM:<${cleanFromEmail}>`);
    if (!mailFromResp.startsWith('250')) {
      throw new Error(`MAIL FROM failed: ${mailFromResp}`);
    }

    // 5. RCPT TO
    const rcptToResp = await sendCommand(`RCPT TO:<${cleanToEmail}>`);
    if (!rcptToResp.startsWith('250') && !rcptToResp.startsWith('251')) {
      throw new Error(`RCPT TO failed: ${rcptToResp}`);
    }

    // 6. DATA
    const dataResp = await sendCommand('DATA');
    if (!dataResp.startsWith('354')) {
      throw new Error(`DATA initiation failed: ${dataResp}`);
    }

    // Generate Message-ID
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@appinterviewready.top>`;
    const dateHeader = new Date().toUTCString();
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let messageBody = '';
    messageBody += `From: ${from}\r\n`;
    messageBody += `To: ${to}\r\n`;
    messageBody += `Subject: ${subject}\r\n`;
    messageBody += `Date: ${dateHeader}\r\n`;
    messageBody += `Message-ID: ${messageId}\r\n`;
    messageBody += `MIME-Version: 1.0\r\n`;

    if (html && text) {
      messageBody += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
      messageBody += `--${boundary}\r\n`;
      messageBody += `Content-Type: text/plain; charset=UTF-8\r\n`;
      messageBody += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      messageBody += `${text}\r\n\r\n`;
      messageBody += `--${boundary}\r\n`;
      messageBody += `Content-Type: text/html; charset=UTF-8\r\n`;
      messageBody += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      messageBody += `${html}\r\n\r\n`;
      messageBody += `--${boundary}--\r\n`;
    } else if (html) {
      messageBody += `Content-Type: text/html; charset=UTF-8\r\n`;
      messageBody += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      messageBody += `${html}\r\n`;
    } else {
      messageBody += `Content-Type: text/plain; charset=UTF-8\r\n`;
      messageBody += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
      messageBody += `${text || ''}\r\n`;
    }

    messageBody += '\r\n.';

    const sendResp = await sendCommand(messageBody);
    if (!sendResp.startsWith('250')) {
      throw new Error(`Sending message payload failed: ${sendResp}`);
    }

    // 7. QUIT
    await sendCommand('QUIT');

    return { messageId };
  } finally {
    try {
      conn.close();
    } catch {
      // ignore close error
    }
  }
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

    // Use template subject if not explicitly given
    if (!emailSubject && template.subject) {
      emailSubject = template.subject;
      if (templateVariables) {
        Object.entries(templateVariables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailSubject = emailSubject?.replace(regex, value);
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

  // Sender email configuration (Spaceship / Spacemail)
  const fromEmail = Deno.env.get('SPACESHIP_FROM_EMAIL') || 'Interview Ready <info@appinterviewready.top>';

  // Resolve user_id for logging
  let userId = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    userId = user.id;
  } else {
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
    p_provider: 'spaceship',
  });

  if (logError) {
    console.error('Error logging email:', logError);
  }

  const logId = logData;

  try {
    // Send email via Spaceship (Spacemail SMTP)
    const result = await sendSpaceshipSmtp({
      to,
      from: fromEmail,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    // Update log with success
    if (logId) {
      await supabase.rpc('update_email_status', {
        p_log_id: logId,
        p_status: 'sent',
      });
    }

    return {
      success: true,
      message_id: result.messageId,
      log_id: logId,
    };
  } catch (smtpErr: any) {
    console.error('[Spaceship Email Error]:', smtpErr);

    // Fallback: If Resend API key is still present during transition, try fallback
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
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

        if (resendResponse.ok) {
          const resendData = await resendResponse.json();
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
      } catch (fallbackErr) {
        console.warn('Fallback delivery also failed:', fallbackErr);
      }
    }

    // Update log with failure
    if (logId) {
      await supabase.rpc('update_email_status', {
        p_log_id: logId,
        p_status: 'failed',
        p_error_message: smtpErr?.message || 'Failed to send email via Spaceship',
      });
    }

    throw new Error(smtpErr?.message || 'Failed to send email via Spaceship');
  }
}