// @ts-nocheck
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email-service.ts';

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

serve(async (req: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization or apikey header
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
        // ignore token decode failure, fallback to anon check
      }
    }

    const isAuthorized = !!user || Boolean(apiKey) || Boolean(token);
    if (!isAuthorized) {
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

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
      templateKey,
      templateVariables,
      emailType,
      metadata,
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
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
