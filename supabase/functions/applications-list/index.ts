import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError } from '../_shared/errors.ts';

const app = new Hono();

app.use('/*', cors());

app.get('/*', async (c: any) => {
  try {
    const url = new URL(c.req.url);
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) throw new UnauthorizedError('No active session');

    if (url.pathname.endsWith('/stats')) {
      const { data: applications, error: fetchError } = await client
        .from('job_applications')
        .select('status, id')
        .eq('user_id', user.id);

      if (fetchError) throw new Error(fetchError.message);

      const stats = applications.reduce((acc: Record<string, number>, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});

      const total = applications.length;

      return c.json({ 
        stats, 
        total,
        funnel: {
          saved: stats['SAVED'] || 0,
          applied: stats['APPLIED'] || 0,
          interviews: stats['INTERVIEW'] || 0,
          offers: stats['OFFER'] || 0,
          rejected: stats['REJECTED'] || 0
        }
      }, 200);
    } else {
      const status = c.req.query('status');
      const sortBy = c.req.query('sortBy') || 'updated_at';
      const sortOrder = c.req.query('sortOrder') === 'asc' ? true : false;

      let query = client
        .from('job_applications')
        .select('*')
        .eq('user_id', user.id);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: applications, error: fetchError } = await query.order(sortBy, { ascending: sortOrder });

      if (fetchError) throw new Error(fetchError.message);

      return c.json({ applications }, 200);
    }
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return c.json({ error: error.message, code: error.code }, error.status);
    console.error('Error in GET /applications:', error);
    return c.json({ error: 'Failed to fetch applications', code: 'INTERNAL_ERROR' }, 500);
  }
});

Deno.serve(app.fetch);
