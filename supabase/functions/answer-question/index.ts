import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const AnswerQuestionInput = z.object({
  question: z.string().min(5),
  context_source: z.enum(['profile', 'resume']),
  resume_id: z.string().uuid().optional(),
  job_url: z.string().url().optional(),
});

type AnswerQuestionInputType = z.infer<typeof AnswerQuestionInput>;

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
    let input: AnswerQuestionInputType;

    try {
      input = AnswerQuestionInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid answer-question input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Gather user context
    let contextData = '';

    if (input.context_source === 'resume' && input.resume_id) {
      const { data: resume } = await client
        .from('resume_contents')
        .select('*')
        .eq('resume_id', input.resume_id)
        .single();
        
      if (resume) {
        contextData = `User's Selected Resume:\n${JSON.stringify(resume)}`;
      }
    } 
    
    // Fallback to profile if resume not found or profile was requested
    if (!contextData) {
      const { data: profile } = await client
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (profile) {
        contextData = `User Profile:\n${JSON.stringify(profile)}`;
      }
    }

    let urlContext = '';
    if (input.job_url) {
      console.log(`Scraping job from URL: ${input.job_url}`);
      const SGAI_API_KEY = Deno.env.get('SGAI_API_KEY');
      if (!SGAI_API_KEY) {
        throw new ValidationError('SGAI_API_KEY is not configured. Cannot scrape URL.', { url: input.job_url });
      }
      try {
        const scrapePayload = {
          url: input.job_url,
          prompt: `Extract the main content from this page. If it's a job description, include job title, company, requirements, and responsibilities. If it's a company page, summarize what they do. Return text content in a structured, readable format.`,
          schema: {
            type: 'object',
            properties: {
              content_summary: { type: 'string' },
              key_details: { type: 'array', items: { type: 'string' } },
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
            extractedData.content_summary ? `Summary:\n${extractedData.content_summary}` : '',
            extractedData.key_details?.length ? `\nKey Details:\n${extractedData.key_details.map((d: string) => `- ${d}`).join('\n')}` : '',
          ].filter(Boolean).join('\n');
          
          if (scrapedText.trim().length > 20) {
            urlContext = `Context from URL (${input.job_url}):\n${scrapedText}\n\n`;
          }
        }
      } catch (err: any) {
        console.warn('Failed to scrape URL for answer-question:', err.message);
      }
    }

    const systemPrompt = `You are an elite interview coach and career consultant. 
Craft a compelling response to the job application question based on the user's background details. 
Use the STAR method (Situation, Task, Action, Result) for behavioral questions when applicable. 
Tailor the answer to sound authentic, professional, and highly impactful. 
Do not include conversational filler like "Here is the answer". Just provide the exact text they should paste into the application form.`;
  
    const userPrompt = `${urlContext}Context Information:\n${contextData}\n\nJob Application Question:\n"${input.question}"`;

    const response = await aiClient.callText(systemPrompt, userPrompt, { temperature: 0.6 });

    return c.json({ answer: response }, 200);

  } catch (error: any) {
    if (error instanceof UnauthorizedError || error instanceof ValidationError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in answer-question:', error);
    return c.json({ error: error.message || 'Failed to generate answer', code: 'INTERNAL_ERROR' }, 500);
  }
});

Deno.serve(app.fetch);
