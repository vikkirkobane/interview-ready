import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const LinkedInOptimizeInput = z.object({
  section: z.enum(['HEADLINE', 'ABOUT', 'EXPERIENCE_BULLETS']),
  current_content: z.string().min(1),
  target_role: z.string().optional(),
});

type LinkedInOptimizeInputType = z.infer<typeof LinkedInOptimizeInput>;

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
    let input: LinkedInOptimizeInputType;

    try {
      input = LinkedInOptimizeInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid optimization input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Check credits (1 credit per section)
    const hasCredits = await checkCredits(user.id, 'LINKEDIN_SECTION_OPTIMIZE', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(1, 0);
    }

    const systemPrompt = `You are an expert technical recruiter and LinkedIn profile optimizer.
Rewrite the provided LinkedIn profile section to be highly engaging, impactful, and keyword-rich for the target role.
Return a flat JSON object with an array of 3 "variants" (different options).`;

    const userPrompt = `Section to optimize: ${input.section}
Target Role: ${input.target_role || 'General tech role'}
Current Content: ${input.current_content}

Provide 3 optimized variants.`;

    const optimizedData: any = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      z.object({ variants: z.array(z.string()).length(3) }),
      { temperature: 0.6, max_tokens: 1500 }
    );

    await deductCredits(user.id, 'LINKEDIN_SECTION_OPTIMIZE', {
      section: input.section
    });

    return c.json(
      {
        variants: optimizedData.variants,
        message: `${input.section} optimized successfully`,
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

    console.error('Error in /linkedin/optimize:', error);
    return c.json(
      { 
        error: 'Failed to optimize LinkedIn section', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

Deno.serve(app.fetch);
