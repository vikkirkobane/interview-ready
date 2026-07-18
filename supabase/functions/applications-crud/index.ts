import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, NotFoundError } from '../_shared/errors.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const ApplicationSchema = z.object({
  job_title: z.string().min(1),
  company: z.string().min(1),
  job_url: z.string().url().optional().or(z.literal('')),
  location: z.string().optional(),
  is_remote: z.boolean().optional(),
  status: z.enum(['SAVED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'GHOSTED']).optional(),
  notes: z.string().optional(),
  applied_at: z.string().datetime().optional(),
  next_action: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().optional(),
  resume_id: z.string().uuid().optional(),
  cover_letter_id: z.string().uuid().optional(),
});

app.post('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) throw new UnauthorizedError('No active session');

    const body = await c.req.json();
    const input = ApplicationSchema.parse(body);

    const { data: application, error: insertError } = await client
      .from('job_applications')
      .insert({
        user_id: user.id,
        ...input,
        job_url: input.job_url || null,
        last_activity: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) throw new Error(insertError.message);

    return c.json({ application, message: 'Application created successfully' }, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation Error', details: error.errors }, 400);
    }
    if (error instanceof UnauthorizedError) return c.json({ error: error.message, code: error.code }, error.status);
    console.error('Error in POST /applications:', error);
    return c.json({ error: 'Failed to create application', code: 'INTERNAL_ERROR' }, 500);
  }
});

app.put('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new UnauthorizedError('No active session');

    const url = new URL(c.req.url);
    const parts = url.pathname.split('/');
    const appId = parts[parts.length - 1];

    const body = await c.req.json();
    const input = ApplicationSchema.partial().parse(body);

    const { data: application, error: updateError } = await client
      .from('job_applications')
      .update({
        ...input,
        job_url: input.job_url || null,
        updated_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .eq('id', appId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) throw new Error(updateError.message);
    if (!application) throw new NotFoundError('Application not found');

    return c.json({ application, message: 'Application updated successfully' }, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation Error', details: error.errors }, 400);
    }
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }
    console.error('Error in PUT /applications/:id:', error);
    return c.json({ error: 'Failed to update application', code: 'INTERNAL_ERROR' }, 500);
  }
});

app.delete('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new UnauthorizedError('No active session');

    const url = new URL(c.req.url);
    const parts = url.pathname.split('/');
    const appId = parts[parts.length - 1];

    const { error: deleteError } = await client
      .from('job_applications')
      .delete()
      .eq('id', appId)
      .eq('user_id', user.id);

    if (deleteError) throw new Error(deleteError.message);

    return c.json({ message: 'Application deleted successfully' }, 200);
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return c.json({ error: error.message, code: error.code }, error.status);
    console.error('Error in DELETE /applications/:id:', error);
    return c.json({ error: 'Failed to delete application', code: 'INTERNAL_ERROR' }, 500);
  }
});

Deno.serve(app.fetch);
