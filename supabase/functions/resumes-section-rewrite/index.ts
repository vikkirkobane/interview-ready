import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const RewriteInput = z.object({
  text: z.string().min(5),
  section_type: z.enum(['summary', 'experience', 'education', 'skills', 'projects']),
  jd_context: z.string().optional(),
});

type RewriteInputType = z.infer<typeof RewriteInput>;

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
    let input: RewriteInputType;

    try {
      input = RewriteInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid rewrite input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    const systemPrompt = `You are an elite executive resume writer and ATS optimization expert.
You are helping the user rewrite a specific section of their resume (${input.section_type}).
Your goal is to make it sound professional, impactful, and quantifiable.
Avoid generic buzzwords; use strong action verbs.
${input.jd_context ? `Crucially, tailor the wording to align with this job description context, incorporating keywords naturally: \n${input.jd_context}` : ''}

Respond ONLY with the rewritten text, nothing else. No markdown wrapping, no conversational pleasantries.`;

    const userPrompt = `Rewrite the following:\n${input.text}`;
    const rewrittenText = await aiClient.callText(systemPrompt, userPrompt, {
      temperature: 0.5,
      max_tokens: 500,
    });

    return c.json({
      rewritten: rewrittenText,
    }, 200);

  } catch (error: any) {
    console.error('Error in section-rewrite:', error);
    const status = error.statusCode || 500;
    return c.json({
      error: error.message || 'Internal Server Error',
      details: error.details || undefined,
    }, status as any);
  }
});

export default app;
