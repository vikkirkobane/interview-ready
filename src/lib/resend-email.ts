/**
 * Resend Email Client — Marketing & Campaign Emails
 *
 * Uses the Resend HTTP API (https://resend.com) for transactional
 * and marketing emails. This runs through a Supabase Edge Function
 * to keep the API key server-side.
 *
 * Spaceship SMTP remains the provider for auth/transactional emails.
 */

import { supabase } from './supabase';

export interface CampaignEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface CampaignEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const DEFAULT_FROM = 'Interview Ready <info@appinterviewready.top>';
const RESEND_EDGE_FUNCTION = 'campaign-send';

/**
 * Send a marketing/campaign email via Resend API.
 * Routes through Supabase Edge Function to keep RESEND_API_KEY server-side.
 */
export async function sendCampaignEmail(
  params: CampaignEmailParams
): Promise<CampaignEmailResult> {
  const {
    to,
    subject,
    html,
    text,
    from = DEFAULT_FROM,
    replyTo,
    tags,
  } = params;

  try {
    const { data, error } = await supabase.functions.invoke(RESEND_EDGE_FUNCTION, {
      body: {
        to: Array.isArray(to) ? to : [to],
        from,
        subject,
        html,
        text: text || stripHtml(html),
        replyTo,
        tags,
      },
    });

    if (error) {
      console.error('[Resend] Edge function error:', error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: any) {
    console.error('[Resend] Campaign email failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a bulk campaign email to multiple recipients via Resend batch API.
 */
export async function sendBulkCampaignEmail(
  recipients: string[],
  subject: string,
  html: string,
  options?: {
    text?: string;
    from?: string;
    replyTo?: string;
    tags?: { name: string; value: string }[];
  }
): Promise<CampaignEmailResult> {
  const { data, error } = await supabase.functions.invoke(RESEND_EDGE_FUNCTION, {
    body: {
      bulk: true,
      to: recipients,
      from: options?.from || DEFAULT_FROM,
      subject,
      html,
      text: options?.text || stripHtml(html),
      replyTo: options?.replyTo,
      tags: options?.tags,
    },
  });

  if (error) {
    console.error('[Resend] Bulk campaign error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data?.id };
}

/**
 * Strip HTML tags for plain text fallback.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
