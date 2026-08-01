import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { checkCredits, deductCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const AnswerQuestionInput = z.object({
  /** The user's question or request. For a pure file-analysis request the client
   *  sends a clear analysis prompt in this field. */
  question: z.string().min(1),
  context_source: z.enum(['profile', 'resume']),
  resume_id: z.string().uuid().optional(),
  job_url: z.string().url().optional(),
  /** Extracted text from an attached file (image OCR, PDF, DOCX) for keen analysis. */
  file_context: z.string().optional(),
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

    // Require a real question OR a file to analyze.
    const hasFileContext = (input.file_context || '').trim().length > 0;
    if (input.question.trim().length === 0 && !hasFileContext) {
      throw new ValidationError('A question or an attached file is required.');
    }

    // Check credits BEFORE doing any work — never charge for a failed request.
    const hasCredits = await checkCredits(user.id, 'ASK_AI_QUESTION', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(2, 0);
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

    const systemPrompt = `You are an elite interview coach and career consultant who answers job-application questions with precision and depth.

## CORE MISSION
Read and analyse ALL provided material carefully before responding:
1. The attached file content (a job description, application form, prompt, or any document the user uploaded). Mine it keenly for requirements, responsibilities, keywords, and any question it asks.
2. Any URL context (scraped from a job posting or company page).
3. The user's profile/resume background.
4. The user's explicit question or request.

Then produce the required output. If the user asked a specific question, answer it directly using the file/URL content as evidence. If the user simply attached a document without a specific question, produce a thorough, well-structured analysis of it (key points, requirements, and how to position the user's background against it).

## ANSWERING RULES
- For behavioral questions, use the STAR method (Situation, Task, Action, Result) with concrete, quantified results from the user's background when available.
- Tailor every answer to sound authentic, professional, and highly impactful — write as the candidate, in the first person.
- Explicitly connect the answer to requirements and keywords found in the attached file / job description.
- Format the answer for a job-application form: clear paragraphs, short bullet lists where useful, and section headings (e.g. ## Example, **Key point**) when it improves clarity. Use valid markdown.
- Use proper capitalization throughout — every sentence and proper noun capitalised.
- Be honest: never fabricate experience or metrics. If something is not in the user's background, say so and advise how to handle it.

## OUTPUT RULES
- Provide ONLY the paste-ready response the user needs. Do NOT start with filler like "Here is the answer" or "Based on your profile".
- If the question asks for a short answer, keep it short. If it asks for a detailed response, provide depth.
- Never reference "the file" or "the attached document" inside the answer itself — write the answer as if it is the candidate's own text.`;

    const userPrompt = `${urlContext}${hasFileContext
      ? `ATTACHED FILE CONTENT (analyze this keenly — it may be a job description, application form, or document):
${input.file_context}
--- END ATTACHED FILE CONTENT ---

`
      : ''}Context Information:
${contextData}

Job Application Question / Request:
"${input.question}"`;

    const response = await aiClient.callText(systemPrompt, userPrompt, { temperature: 0.6, max_tokens: 2500 });

    // Deduct 2 credits for Ask AI — only AFTER a successful response.
    await deductCredits(user.id, 'ASK_AI_QUESTION');

    return c.json({ answer: response }, 200);

  } catch (error: any) {
    if (error instanceof UnauthorizedError || error instanceof ValidationError || error instanceof InsufficientCreditsError) {
      return c.json({ error: error.message, code: error.code }, error.status || 400);
    }

    console.error('Error in answer-question:', error);
    return c.json({ error: error.message || 'Failed to generate answer', code: 'INTERNAL_ERROR' }, 500);
  }
});

Deno.serve(app.fetch);
