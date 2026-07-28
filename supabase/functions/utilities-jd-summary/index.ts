import { Hono } from 'npm:hono@4.0.0'; // eslint-disable-line import/no-unresolved
import { cors } from 'npm:hono@4.0.0/cors'; // eslint-disable-line import/no-unresolved
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { JD_SUMMARY_SCHEMA } from '../_shared/zod-schemas.ts';
import { z } from 'npm:zod@3.22.4'; // eslint-disable-line import/no-unresolved

const app = new Hono();

app.use('/*', cors());

const JDSummaryInput = z.object({
  job_description: z.string().max(10000).optional(),
  job_url: z.string().url().optional(),
}).refine((data: any) => data.job_description || data.job_url, {
  message: "Either job_description or job_url must be provided",
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

    let actualJobDescription = input.job_description || '';

    if (input.job_url) {
      console.log(`Scraping job from URL: ${input.job_url}`);
      const SGAI_API_KEY = Deno.env.get('SGAI_API_KEY');
      if (!SGAI_API_KEY) {
        throw new ValidationError('SGAI_API_KEY is not configured. Cannot scrape URL.', { url: input.job_url });
      }
      try {
        const scrapePayload = {
          url: input.job_url,
          prompt: `Extract the complete job description from this page. Include: job title, company name, location, job type, required qualifications, responsibilities, required skills, preferred skills, benefits, and any other relevant job details. Return all text content in a structured, readable format.`,
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
      } catch (err: any) {
        console.warn('Failed to scrape job URL for JD summary:', err.message);
      }
    }

    // Proceed even if description is short — the AI will extract what it can.

    const systemPrompt = `You are an expert technical recruiter. Analyze the job description and extract a concise summary.
Focus on identifying the core responsibilities, must-have requirements, nice-to-haves, and any potential red flags or culture signals.
Return exactly in the JSON format specified.`;

    const userPrompt = `Job Description:\n${actualJobDescription}`;

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
