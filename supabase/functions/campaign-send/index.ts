// @ts-nocheck
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default fallback domain when custom domain is not verified
const DEFAULT_RESEND_DOMAIN = 'onboarding@resend.dev';

interface CampaignEmailRequest {
  to: string[];
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  bulk?: boolean;
  tags?: { name: string; value: string }[];
}

/**
 * Resend API client for marketing/campaign emails.
 */
async function sendViaResend({
  to,
  from,
  subject,
  html,
  text,
  replyTo,
  tags,
}: {
  to: string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}): Promise<{ id: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured in edge function secrets');
  }

  const payload: Record<string, any> = {
    from,
    to,
    subject,
    html,
    text,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  if (tags && tags.length > 0) {
    payload.tags = tags;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result?.message || result?.error || `Resend API error: ${response.status}`;

    // If domain not verified, retry with default Resend domain
    if (errorMessage.includes('domain is not verified') && from !== DEFAULT_RESEND_DOMAIN) {
      console.warn(`[Resend] Domain not verified, retrying with default: ${DEFAULT_RESEND_DOMAIN}`);
      return sendViaResend({
        to,
        from: DEFAULT_RESEND_DOMAIN,
        subject,
        html,
        text,
        replyTo,
        tags,
      });
    }

    throw new Error(errorMessage);
  }

  return { id: result.id };
}

/**
 * Send batch emails via Resend batch API (up to 100 per call).
 */
async function sendBatchViaResend(
  emails: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    tags?: { name: string; value: string }[];
  }[]
): Promise<{ id: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured in edge function secrets');
  }

  const batchPayload = emails.map((email) => ({
    from: email.from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    ...(email.tags ? { tags: email.tags } : {}),
  }));

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batchPayload),
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result?.message || result?.error || `Resend batch API error: ${response.status}`;

    // If domain not verified, retry with default domain
    if (errorMessage.includes('domain is not verified')) {
      console.warn(`[Resend] Domain not verified in batch, retrying with default: ${DEFAULT_RESEND_DOMAIN}`);
      const fallbackEmails = emails.map((e) => ({ ...e, from: DEFAULT_RESEND_DOMAIN }));
      return sendBatchViaResend(fallbackEmails);
    }

    throw new Error(errorMessage);
  }

  return { id: result.id };
}

serve(async (req: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization') || '';
    const apiKey = req.headers.get('apikey') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    let user: any = null;
    if (token && token !== anonKey && token !== serviceKey) {
      try {
        const authClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          anonKey,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data } = await authClient.auth.getUser();
        user = data?.user || null;
      } catch {
        // ignore token decode failure
      }
    }

    const isAuthorized = !!user || Boolean(apiKey) || Boolean(token);
    if (!isAuthorized) {
      throw new Error('Unauthorized');
    }

    const body: CampaignEmailRequest = await req.json();
    const { to, from, subject, html, text, replyTo, bulk, tags } = body;

    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new Error('Missing required field: to (must be a non-empty array of email addresses)');
    }
    if (!subject) {
      throw new Error('Missing required field: subject');
    }
    if (!html) {
      throw new Error('Missing required field: html');
    }

    const defaultFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'Interview Ready <info@appinterviewready.top>';
    const senderEmail = from || defaultFrom;

    let result;

    if (bulk && to.length > 1) {
      // Batch send for bulk campaigns
      const emails = to.map((recipient) => ({
        from: senderEmail,
        to: [recipient],
        subject,
        html,
        text,
        replyTo,
        tags,
      }));
      result = await sendBatchViaResend(emails);
    } else {
      // Single send
      result = await sendViaResend({
        to,
        from: senderEmail,
        subject,
        html,
        text,
        replyTo,
        tags,
      });
    }

    // Log to Supabase email_logs if table exists
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase.from('email_logs').insert({
        email_to: to.length === 1 ? to[0] : `${to.length} recipients`,
        email_type: 'campaign',
        subject,
        status: 'sent',
        provider: 'resend',
        message_id: result.id,
        metadata: {
          recipient_count: to.length,
          bulk: !!bulk,
          tags,
        },
      });
    } catch {
      // Log table may not exist, continue
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: result.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Resend Campaign Error]:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
