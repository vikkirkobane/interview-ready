import { Hono } from 'npm:hono@4.0.0'; // eslint-disable-line import/no-unresolved
import { cors } from 'npm:hono@4.0.0/cors'; // eslint-disable-line import/no-unresolved
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { deductCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4'; // eslint-disable-line import/no-unresolved

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

    // Deduct 1 credit per rewrite
    try {
      await deductCredits(user.id, 'RESUME_SECTION_REWRITE', { section_type: input.section_type });
    } catch (error: any) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }
      throw new Error(`Credit deduction failed: ${error instanceof Error ? error.message : String(error)}`);
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
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError ||
      error instanceof InsufficientCreditsError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in section-rewrite:', error);
    return c.json({
      error: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    }, 500);
  }
});

Deno.serve(app.fetch);
