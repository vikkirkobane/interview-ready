import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient, createServiceClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, NotFoundError, ValidationError } from '../_shared/errors.ts';
import { RESUME_CONTENT_SCHEMA } from '../_shared/zod-schemas.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const UpdateResumeInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100).optional(),
  template_id: z.string().min(1).optional(), // Template name e.g. 'executive', 'minimal'
  resume_contents: z.array(RESUME_CONTENT_SCHEMA).min(1).optional(),
});

type UpdateResumeInputType = z.infer<typeof UpdateResumeInput>;

app.post('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    const body = await c.req.json();
    let input: UpdateResumeInputType;

    try {
      input = UpdateResumeInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid update input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Verify ownership
    const { data: existingResume, error: fetchError } = await serviceClient
      .from('resumes')
      .select('user_id')
      .eq('id', input.id)
      .single();

    if (fetchError || !existingResume) {
      throw new NotFoundError('Resume not found');
    }

    if (existingResume.user_id !== user.id) {
      throw new UnauthorizedError('Not authorized to update this resume');
    }

    // Build update payload
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.template_id !== undefined) updatePayload.template_id = input.template_id;
    if (input.resume_contents !== undefined) updatePayload.resume_contents = input.resume_contents;

    // Update
    const { data: updated, error: updateError } = await serviceClient
      .from('resumes')
      .update(updatePayload)
      .eq('id', input.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update resume: ${updateError.message}`);
    }

    return c.json({
      success: true,
      resume: updated,
    }, 200);

  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError ||
      error instanceof ValidationError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in resumes/update:', error);
    return c.json({
      error: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
});

Deno.serve(app.fetch);
