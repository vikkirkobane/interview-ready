// @ts-nocheck
declare const Deno: any;
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AIRTABLE_BASE_ID = Deno.env.get('AIRTABLE_BASE_ID') || 'app5axaWoe4MblFFS';
const AIRTABLE_TABLE = Deno.env.get('AIRTABLE_TABLE_NAME') || Deno.env.get('AIRTABLE_TABLE_ID') || 'Submissions';

interface AirtableSyncRequest {
  email: string;
  name?: string;
  status?: 'Confirmed' | 'Downloaded';
  waitlistSpot?: number;
  sendConfirmationEmail?: boolean;
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: AirtableSyncRequest = await req.json();
    const { 
      email, 
      name, 
      status = 'Confirmed', 
      waitlistSpot,
      sendConfirmationEmail = true,
    } = body;

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'A valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const spot = waitlistSpot || Math.floor(Math.random() * 400) + 500;
    const nowIso = new Date().toISOString();

    // 1. Sync to Airtable REST API
    const airtableApiKey = Deno.env.get('AIRTABLE_API_KEY') || Deno.env.get('AIRTABLE_PERSONAL_ACCESS_TOKEN');
    let airtableRecordId: string | null = null;
    let airtableSuccess = false;

    if (airtableApiKey) {
      try {
        const airtableResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              records: [
                {
                  fields: {
                    'Email': cleanEmail,
                    'Waitlist Spot': spot,
                    'Submitted At': nowIso,
                    'Status': status,
                    'Welcome Sent': true,
                    'V2 Sent': true,
                  },
                },
              ],
            }),
          }
        );

        if (airtableResponse.ok) {
          const resData = await airtableResponse.json();
          airtableRecordId = resData?.records?.[0]?.id || null;
          airtableSuccess = true;
        } else {
          const errData = await airtableResponse.json();
          console.warn('[Airtable Sync Error]:', errData);
        }
      } catch (atErr) {
        console.warn('[Airtable Fetch Error]:', atErr);
      }
    } else {
      console.log('[Airtable Sync] No AIRTABLE_API_KEY configured. Mocking success.');
      airtableSuccess = true;
    }

    // 2. Dispatch VIP Waitlist / Welcome Email via Spaceship
    let emailSent = false;
    if (sendConfirmationEmail) {
      try {
        await sendEmail({
          to: cleanEmail,
          templateKey: 'waitlist_confirmation',
          templateVariables: {
            first_name: name || 'there',
            user_name: name || 'there',
            queue_position: spot.toString(),
            app_url: 'https://appinterviewready.top',
          },
          emailType: 'waitlist_confirmation',
          metadata: {
            source: 'airtable_waitlist_sync',
            airtable_record_id: airtableRecordId,
            waitlist_spot: spot,
          },
        });
        emailSent = true;
      } catch (mailErr) {
        console.warn('[Spaceship Email Error]:', mailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          email: cleanEmail,
          waitlistSpot: spot,
          status,
          airtableRecordId,
          airtableSuccess,
          emailSent,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Airtable Sync Error]:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process airtable sync',
        details: error?.message || 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
