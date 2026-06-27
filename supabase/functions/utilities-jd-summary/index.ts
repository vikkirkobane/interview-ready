import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { JD_SUMMARY_SCHEMA } from '../_shared/zod-schemas.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const JDSummaryInput = z.object({
  job_description: z.string().min(50).max(10000),
});

type JDSummaryInputType = z.infer<typeof JDSummaryInput>;

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
    let input: JDSummaryInputType;

    try {
      input = JDSummaryInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid job description input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    const systemPrompt = `You are an expert technical recruiter. Analyze the job description and extract a concise summary.
Focus on identifying the core responsibilities, must-have requirements, nice-to-haves, and any potential red flags or culture signals.
Return exactly in the JSON format specified.`;

    const userPrompt = `Job Description:\n${input.job_description}`;

    const summary = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      JD_SUMMARY_SCHEMA,
      { temperature: 0.3, max_tokens: 1500 }
    );

    await client.from('usage_events').insert({
      user_id: user.id,
      event: 'JD_SUMMARY',
      credits_used: 0,
    });

    return c.json({ summary, message: 'JD summarized successfully' }, 200);
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }
    console.error('Error in /utilities/jd-summary:', error);
    return c.json({ error: 'Failed to summarize JD', code: 'INTERNAL_ERROR' }, 500);
  }
});

Deno.serve(app.fetch);
