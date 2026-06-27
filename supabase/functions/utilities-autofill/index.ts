import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const AutofillInput = z.object({
  form_html: z.string().min(10),
});

type AutofillInputType = z.infer<typeof AutofillInput>;

app.post('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    const body = await c.req.json();
    let input: AutofillInputType;

    try {
      input = AutofillInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid autofill input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    const { data: profile } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const systemPrompt = `You are a smart form-filling assistant. 
Given an HTML form for a job application and a user's profile data, output a JSON object where keys are the HTML input names/ids, and values are the best matching values from the profile.
Output ONLY a flat JSON object (key-value pairs of strings).`;

    // Limit form_html to a reasonable length to prevent token overflow
    const userPrompt = `Profile Data:\n${JSON.stringify(profile)}\n\nForm HTML:\n${input.form_html.substring(0, 3000)}`;

    const autofillData = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      z.record(z.string()),
      { temperature: 0.1, max_tokens: 1500 }
    );

    return c.json({ autofill: autofillData, message: 'Autofill data generated' }, 200);
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }
    console.error('Error in /utilities/autofill:', error);
    return c.json({ error: 'Failed to generate autofill', code: 'INTERNAL_ERROR' }, 500);
  }
});

Deno.serve(app.fetch);
