import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { LINKEDIN_ANALYSIS_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const LinkedInAnalyzeInput = z.object({
  headline: z.string().optional(),
  about: z.string().optional(),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    description: z.string(),
  })).optional(),
  skills: z.array(z.string()).optional(),
});

type LinkedInAnalyzeInputType = z.infer<typeof LinkedInAnalyzeInput>;

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
    let input: LinkedInAnalyzeInputType;

    try {
      input = LinkedInAnalyzeInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid LinkedIn profile input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Check credits (LinkedIn Analysis costs 2 credits)
    const hasCredits = await checkCredits(user.id, 'LINKEDIN_ANALYSIS', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(2, 0);
    }

    const systemPrompt = `You are an expert technical recruiter and LinkedIn profile optimizer.
Review the provided LinkedIn profile sections. Score them based on impact, keyword richness, and clarity.
Provide constructive feedback, identify issues, and suggest improvements.
Return exactly in the JSON format specified.`;

    const userPrompt = `LinkedIn Profile Content:
Headline: ${input.headline || 'Not provided'}
About: ${input.about || 'Not provided'}
Experience: ${input.experience ? JSON.stringify(input.experience) : 'Not provided'}
Skills: ${input.skills ? input.skills.join(', ') : 'Not provided'}

Analyze the profile.`;

    const analysis = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      LINKEDIN_ANALYSIS_SCHEMA,
      { temperature: 0.3, max_tokens: 2500 }
    );

    // Deduct credits
    await deductCredits(user.id, 'LINKEDIN_ANALYSIS');

    return c.json(
      {
        analysis,
        message: 'LinkedIn profile analyzed successfully',
      },
      200
    );
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError ||
      error instanceof InsufficientCreditsError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /linkedin/analyze:', error);
    return c.json(
      { 
        error: 'Failed to analyze LinkedIn profile', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

Deno.serve(app.fetch);
