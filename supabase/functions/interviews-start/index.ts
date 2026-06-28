import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const StartInterviewInput = z.object({
  job_application_id: z.string().uuid().optional(),
  role: z.string().min(1),
  company: z.string().optional(),
  job_description: z.string().optional(),
  interview_type: z.enum(['TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN', 'MIXED', 'CASE_STUDY']),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'SENIOR']).optional().default('INTERMEDIATE'),
});

type StartInterviewInputType = z.infer<typeof StartInterviewInput>;

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
    let input: StartInterviewInputType;

    try {
      input = StartInterviewInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid start interview input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Check credits (Mock Interview costs 5 credits)
    const hasCredits = await checkCredits(user.id, 'MOCK_INTERVIEW', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(5, 0);
    }

    // Deduct credits
    await deductCredits(user.id, 'MOCK_INTERVIEW', {
      role: input.role,
      interview_type: input.interview_type,
    });

    // Generate first message (System/Interviewer greeting)
    const companyText = input.company ? ` at ${input.company}` : '';
    const initialMessage = {
      role: 'assistant',
      content: `Hello! I'll be your interviewer today for the ${input.role} position${companyText}. We'll be doing a ${input.interview_type.toLowerCase().replace('_', ' ')} interview. Are you ready to begin?`,
      timestamp: new Date().toISOString()
    };

    // Save to database
    const { data: saved, error: saveError } = await client
      .from('mock_interviews')
      .insert({
        user_id: user.id,
        job_application_id: input.job_application_id || null,
        role: input.role,
        company: input.company || null,
        job_description: input.job_description || null,
        interview_type: input.interview_type,
        status: 'IN_PROGRESS',
        messages: [initialMessage],
        question_count: 0,
      })
      .select('*')
      .single();

    if (saveError) {
      console.error('Failed to create mock interview:', saveError);
      throw new Error('Database insertion failed');
    }

    return c.json(
      {
        interview: saved,
        channel: `interview:${saved.id}`, // Channel for realtime streaming if client wants to subscribe
        message: 'Mock interview started successfully',
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

    console.error('Error in /interviews/start:', error);
    return c.json(
      { 
        error: 'Failed to start interview', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

Deno.serve(app.fetch);
