import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, NotFoundError } from '../_shared/errors.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const ContactSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  company: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  relationship: z.enum(['CLOSE', 'PROFESSIONAL', 'ACQUAINTANCE', 'RECRUITER', 'HIRING_MANAGER', 'MENTOR']).optional(),
  status: z.enum(['ACTIVE', 'DORMANT', 'ARCHIVED']).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  last_contacted_at: z.string().datetime().optional(),
  next_follow_up_at: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

app.get('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) throw new UnauthorizedError('No active session');

    const { data: contacts, error: fetchError } = await client
      .from('networking_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('next_follow_up_at', { ascending: true, nullsFirst: false });

    if (fetchError) throw new Error(fetchError.message);

    return c.json({ contacts });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return c.json({ error: error.message, code: error.code }, error.status);
    console.error('Error in GET /networking/contacts:', error);
    return c.json({ error: 'Failed to fetch contacts', code: 'INTERNAL_ERROR' }, 500);
  }
});

app.post('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) throw new UnauthorizedError('No active session');

    const body = await c.req.json();
    const input = ContactSchema.parse(body);

    const { data: contact, error: insertError } = await client
      .from('networking_contacts')
      .insert({
        user_id: user.id,
        ...input,
        // Empty strings should be null for URL/email validation in DB if any
        linkedin_url: input.linkedin_url || null,
        email: input.email || null,
      })
      .select('*')
      .single();

    if (insertError) throw new Error(insertError.message);

    return c.json({ contact, message: 'Contact created successfully' }, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation Error', details: error.errors }, 400);
    }
    if (error instanceof UnauthorizedError) return c.json({ error: error.message, code: error.code }, error.status);
    console.error('Error in POST /networking/contacts:', error);
    return c.json({ error: 'Failed to create contact', code: 'INTERNAL_ERROR' }, 500);
  }
});

app.put('/:id', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new UnauthorizedError('No active session');

    const contactId = c.req.param('id');
    const body = await c.req.json();
    const input = ContactSchema.partial().parse(body);

    const { data: contact, error: updateError } = await client
      .from('networking_contacts')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (updateError) {
      // Supabase returns an error or no rows if not found. Let's just handle it.
      throw new Error(updateError.message);
    }

    if (!contact) throw new NotFoundError('Contact not found');

    return c.json({ contact, message: 'Contact updated successfully' }, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation Error', details: error.errors }, 400);
    }
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }
    console.error('Error in PUT /networking/contacts/:id:', error);
    return c.json({ error: 'Failed to update contact', code: 'INTERNAL_ERROR' }, 500);
  }
});

app.delete('/:id', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new UnauthorizedError('No active session');

    const contactId = c.req.param('id');

    const { error: deleteError } = await client
      .from('networking_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', user.id);

    if (deleteError) throw new Error(deleteError.message);

    return c.json({ message: 'Contact deleted successfully' }, 200);
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return c.json({ error: error.message, code: error.code }, error.status);
    console.error('Error in DELETE /networking/contacts/:id:', error);
    return c.json({ error: 'Failed to delete contact', code: 'INTERNAL_ERROR' }, 500);
  }
});

Deno.serve(app.fetch);
