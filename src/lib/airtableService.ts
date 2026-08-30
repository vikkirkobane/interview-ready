import { supabaseUrl } from './supabase';

export interface AirtableSyncOptions {
  email: string;
  name?: string;
  status?: 'Confirmed' | 'Downloaded';
  waitlistSpot?: number;
  sendConfirmationEmail?: boolean;
}

export interface AirtableSyncResult {
  success: boolean;
  data?: {
    email: string;
    waitlistSpot: number;
    status: string;
    airtableRecordId?: string | null;
    emailSent: boolean;
  };
  error?: string;
}

/**
 * Synchronize candidate / user email to Airtable Base app5axaWoe4MblFFS / Table tbl0y0reK4q7PvA1t
 * and trigger the Spaceship confirmation email.
 */
export async function syncUserToAirtable(options: AirtableSyncOptions): Promise<AirtableSyncResult> {
  if (!options.email || !options.email.includes('@')) {
    return { success: false, error: 'Valid email is required' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/airtable-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({
        email: options.email.trim().toLowerCase(),
        name: options.name?.trim(),
        status: options.status || 'Confirmed',
        waitlistSpot: options.waitlistSpot,
        sendConfirmationEmail: options.sendConfirmationEmail ?? true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn('[AirtableService] Server returned error status:', response.status, err);
      return { success: false, error: err?.error || `HTTP ${response.status}` };
    }

    const json = await response.json();
    return {
      success: true,
      data: json.data,
    };
  } catch (err: any) {
    console.warn('[AirtableService] Network error during Airtable sync:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}
