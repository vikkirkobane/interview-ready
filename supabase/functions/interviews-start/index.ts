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
  job_url: z.string().url().optional(),
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

    // Extract job description from URL if provided
    let actualJobDescription = input.job_description || '';
    if (input.job_url) {
      const SGAI_API_KEY = Deno.env.get('SGAI_API_KEY');
      if (SGAI_API_KEY) {
        try {
          const scrapePayload = {
            url: input.job_url,
            prompt: `Extract the complete job description from this page. Include: job title, company name, responsibilities, required skills, and any other relevant job details.`,
            schema: {
              type: 'object',
              properties: {
                job_title: { type: 'string' },
                company: { type: 'string' },
                description: { type: 'string' },
                responsibilities: { type: 'array', items: { type: 'string' } },
                required_skills: { type: 'array', items: { type: 'string' } },
              },
            },
          };

          const scrapeResponse = await fetch('https://v2-api.scrapegraphai.com/api/extract', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'SGAI-APIKEY': SGAI_API_KEY,
            },
            body: JSON.stringify(scrapePayload),
          });

          if (scrapeResponse.ok) {
            const scrapeResult = await scrapeResponse.json();
            const extractedData = scrapeResult.data ?? scrapeResult.result ?? scrapeResult;
            
            const scrapedText = [
              extractedData.job_title ? `Job Title: ${extractedData.job_title}` : '',
              extractedData.company ? `Company: ${extractedData.company}` : '',
              extractedData.description ? `\nDescription:\n${extractedData.description}` : '',
              extractedData.responsibilities?.length ? `\nResponsibilities:\n${extractedData.responsibilities.map((r: string) => `- ${r}`).join('\n')}` : '',
              extractedData.required_skills?.length ? `\nRequired Skills:\n${extractedData.required_skills.map((s: string) => `- ${s}`).join('\n')}` : '',
            ].filter(Boolean).join('\n');
            
            if (scrapedText.trim().length > 50) {
              actualJobDescription = actualJobDescription 
                ? actualJobDescription + '\n\n' + scrapedText 
                : scrapedText;
            }
          }
        } catch (err) {
          console.warn('Failed to scrape job URL for interview:', err);
          // Non-fatal, continue with provided description
        }
      }
    }

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
        job_description: actualJobDescription || null,
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
