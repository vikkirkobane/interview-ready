import { syncUserToAirtable } from '../../src/lib/airtableService';

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
  supabaseUrl: 'https://test-project.supabase.co',
}));

global.fetch = jest.fn() as any;

describe('Airtable Sync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid or missing email addresses', async () => {
    const result = await syncUserToAirtable({ email: '' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Valid email is required');
  });

  it('successfully synchronizes candidate email with exact table fields', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          email: 'victorchogo37@gmail.com',
          waitlistSpot: 521,
          status: 'Confirmed',
          airtableRecordId: 'rec12345678',
          emailSent: true,
        },
      }),
    });

    const result = await syncUserToAirtable({
      email: 'victorchogo37@gmail.com',
      name: 'Victor',
      status: 'Confirmed',
      waitlistSpot: 521,
      sendConfirmationEmail: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('victorchogo37@gmail.com');
    expect(result.data?.waitlistSpot).toBe(521);
    expect(result.data?.status).toBe('Confirmed');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/airtable-sync'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: expect.stringContaining('victorchogo37@gmail.com'),
      })
    );
  });

  it('handles server errors gracefully without crashing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Airtable rate limit' }),
    });

    const result = await syncUserToAirtable({
      email: 'test@example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Airtable rate limit');
  });
});
