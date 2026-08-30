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

    // Generate RFC 2822 & RFC 2047 compliant headers
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@appinterviewready.top>`;
    const dateHeader = new Date().toUTCString();
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const encodeMimeHeader = (val: string): string => {
      if (/^[\x20-\x7E]*$/.test(val)) return val;
      const utf8Bytes = new TextEncoder().encode(val);
      let bin = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        bin += String.fromCharCode(utf8Bytes[i]);
      }
      return `=?UTF-8?B?${btoa(bin)}?=`;
    };

    let encodedFrom = from;
    if (from.includes('<') && from.includes('>')) {
      const match = from.match(/^(.*?)\s*<([^>]+)>$/);
      if (match) {
        const displayName = match[1].trim();
        const emailAddr = match[2].trim();
        encodedFrom = `"${displayName.replace(/"/g, '')}" <${emailAddr}>`;
      }
    }

    let messageBody = '';
    messageBody += `From: ${encodedFrom}\r\n`;
    messageBody += `To: ${to}\r\n`;
    messageBody += `Subject: ${encodeMimeHeader(subject)}\r\n`;
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

  // If template key provided, fetch from DB with built-in VIP fallbacks
  if (templateKey) {
    let templateHtml: string | null = null;
    let templateText: string | null = null;
    let templateSubj: string | null = null;

    try {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', templateKey)
        .eq('is_active', true)
        .single();

      if (!templateError && template) {
        templateHtml = template.html_body;
        templateText = template.text_body;
        templateSubj = template.subject;
      }
    } catch {
      // ignore db error, proceed to fallback
    }

    // Built-in VIP template fallback if not in DB
    if (!templateHtml) {
      if (templateKey === 'waitlist_confirmation') {
        templateSubj = "Interview Ready: Waitlist Confirmation";
        templateHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04); }
    .header { background: #2563EB; padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { font-size: 22px; font-weight: 700; margin: 0; color: #ffffff; }
    .body { padding: 28px 24px; }
    .body p { font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; }
    .info-box { background-color: #f8fafc; border-radius: 8px; padding: 16px 20px; border: 1px solid #edf2f7; margin: 20px 0; }
    .info-item { margin-bottom: 10px; font-size: 14px; color: #334155; }
    .info-item:last-child { margin-bottom: 0; }
    .footer { padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; }
    .footer a { color: #2563EB; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>Interview Ready</h1>
      </div>
      <div class="body">
        <p>Hello {{first_name}},</p>
        <p>Thank you for joining the waitlist for <strong>Interview Ready</strong>. Your spot has been confirmed.</p>
        <div class="info-box">
          <div class="info-item"><strong>Waitlist Position:</strong> #{{queue_position}}</div>
          <div class="info-item"><strong>Status:</strong> Confirmed</div>
        </div>
        <p>We will notify you at this email address when access becomes available.</p>
        <p>If you have any questions, reply to this email at <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a>.</p>
        <p>Best regards,<br>The Interview Ready Team</p>
      </div>
      <div class="footer">
        <p>Interview Ready | <a href="https://appinterviewready.top">appinterviewready.top</a></p>
        <p>To unsubscribe, reply with subject: unsubscribe.</p>
        <p>&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
        templateText = `Hello {{first_name}},\n\nThank you for joining the waitlist for Interview Ready. Your spot has been confirmed.\n\nWaitlist Position: #{{queue_position}}\nStatus: Confirmed\n\nWe will notify you at this email address when access becomes available.\n\nIf you have any questions, reply to info@appinterviewready.top.\n\nBest regards,\nThe Interview Ready Team\n\nInterview Ready | appinterviewready.top\nTo unsubscribe, reply with subject: unsubscribe.`;
      } else if (templateKey === 'welcome') {
        templateSubj = "Welcome to Interview Ready - Your Account Details";
        templateHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04); }
    .header { background: #2563EB; padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { font-size: 22px; font-weight: 700; margin: 0; color: #ffffff; }
    .body { padding: 28px 24px; }
    .body p { font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { background: #2563EB; color: #ffffff !important; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; }
    .footer { padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; }
    .footer a { color: #2563EB; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>Interview Ready</h1>
      </div>
      <div class="body">
        <p>Hello {{first_name}},</p>
        <p>Welcome to <strong>Interview Ready</strong>. Your account is active and ready to use.</p>
        <div class="btn-container">
          <a href="https://appinterviewready.top" class="btn">Access Your Account</a>
        </div>
        <p>If you have any questions, reply directly to this email at <a href="mailto:info@appinterviewready.top">info@appinterviewready.top</a>.</p>
        <p>Best regards,<br>The Interview Ready Team</p>
      </div>
      <div class="footer">
        <p>Interview Ready | <a href="https://appinterviewready.top">appinterviewready.top</a></p>
        <p>To unsubscribe, reply with subject: unsubscribe.</p>
        <p>&copy; 2026 Interview Ready. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
        templateText = `Hello {{first_name}},\n\nWelcome to Interview Ready. Your account is active and ready to use.\n\nAccess Your Account: https://appinterviewready.top\n\nIf you have any questions, reply directly to info@appinterviewready.top.\n\nBest regards,\nThe Interview Ready Team\n\nInterview Ready | appinterviewready.top\nTo unsubscribe, reply with subject: unsubscribe.`;
      }
    }

    emailHtml = templateHtml || emailHtml;
    emailText = templateText || emailText;
    if (!emailSubject && templateSubj) {
      emailSubject = templateSubj;
    }

    if (templateVariables) {
      Object.entries(templateVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        emailHtml = emailHtml?.replace(regex, value);
        emailText = emailText?.replace(regex, value);
        emailSubject = emailSubject?.replace(regex, value);
      });
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

    // Update log with failure
    if (logId) {
      await supabase.rpc('update_email_status', {
        p_log_id: logId,
        p_status: 'failed',
        p_error_message: smtpErr?.message || 'Failed to send email via Spaceship SMTP',
      });
    }

    throw new Error(smtpErr?.message || 'Failed to send email via Spaceship SMTP');
  }
}