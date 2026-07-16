import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError, RateLimitError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { JD_ANALYSIS_SCHEMA, JD_SUMMARY_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { withRateLimit } from '../_shared/rate-limiter.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const AnalyzeJobInput = z.object({
  job_id: z.string().uuid().optional(),
  job_description: z.string().max(50000).optional(),
  job_url: z.string().url().optional(),
  user_role: z.string().optional(), // For context/personalization
  user_profile: z.record(z.any()).optional(), // The user's full profile
}).refine(data => data.job_description || data.job_url, {
  message: "Either job_description or job_url must be provided",
});

type AnalyzeJobInputType = z.infer<typeof AnalyzeJobInput>;

/**
 * POST /jobs/analyze
 * Analyzes a job description and returns structured analysis with scores
 * This is the "magic moment" - where user first sees AI value
 */
app.post('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    // Parse and validate input
    const body = await c.req.json();
    let input: AnalyzeJobInputType;

    try {
      input = AnalyzeJobInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid job analysis input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Check if user has credits (1 credit for JD analysis)
    const hasCredits = await checkCredits(user.id, 'JD_ANALYSIS', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(1, 0);
    }

    let actualJobDescription = input.job_description || '';

    // Extract job URL if provided using ScrapeGraphAI
    if (input.job_url) {
      console.log(`Scraping job from URL: ${input.job_url}`);
      
      const SGAI_API_KEY = Deno.env.get('SGAI_API_KEY');
      if (!SGAI_API_KEY) {
        throw new ValidationError('SGAI_API_KEY is not configured. Cannot scrape URL.', { url: input.job_url });
      }
      
      try {
        const scrapePayload = {
          url: input.job_url,
          prompt: `Extract the complete job description from this page. Include: job title, company name, location, job type (remote/hybrid/onsite), salary range if mentioned, required qualifications, responsibilities, required skills, preferred skills, benefits, and any other relevant job details. Return all text content in a structured, readable format.`,
          schema: {
            type: 'object',
            properties: {
              job_title: { type: 'string' },
              company: { type: 'string' },
              location: { type: 'string' },
              job_type: { type: 'string' },
              salary: { type: 'string' },
              description: { type: 'string' },
              responsibilities: { type: 'array', items: { type: 'string' } },
              required_qualifications: { type: 'array', items: { type: 'string' } },
              required_skills: { type: 'array', items: { type: 'string' } },
              preferred_skills: { type: 'array', items: { type: 'string' } },
              benefits: { type: 'array', items: { type: 'string' } },
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

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text().catch(() => 'Unknown error');
          console.error(`ScrapeGraphAI failed with status ${scrapeResponse.status}:`, errorText);
          throw new Error(`Scraper returned ${scrapeResponse.status}: ${errorText}`);
        }

        const scrapeResult = await scrapeResponse.json();
        const extractedData = scrapeResult.data ?? scrapeResult.result ?? scrapeResult;
        
        // Convert structured data to readable text
        const scrapedText = [
          extractedData.job_title ? `Job Title: ${extractedData.job_title}` : '',
          extractedData.company ? `Company: ${extractedData.company}` : '',
          extractedData.location ? `Location: ${extractedData.location}` : '',
          extractedData.job_type ? `Job Type: ${extractedData.job_type}` : '',
          extractedData.salary ? `Salary: ${extractedData.salary}` : '',
          extractedData.description ? `\nDescription:\n${extractedData.description}` : '',
          extractedData.responsibilities?.length ? `\nResponsibilities:\n${extractedData.responsibilities.map((r: string) => `- ${r}`).join('\n')}` : '',
          extractedData.required_qualifications?.length ? `\nRequired Qualifications:\n${extractedData.required_qualifications.map((q: string) => `- ${q}`).join('\n')}` : '',
          extractedData.required_skills?.length ? `\nRequired Skills:\n${extractedData.required_skills.map((s: string) => `- ${s}`).join('\n')}` : '',
          extractedData.preferred_skills?.length ? `\nPreferred Skills:\n${extractedData.preferred_skills.map((s: string) => `- ${s}`).join('\n')}` : '',
          extractedData.benefits?.length ? `\nBenefits:\n${extractedData.benefits.map((b: string) => `- ${b}`).join('\n')}` : '',
        ].filter(Boolean).join('\n');
        
        if (!scrapedText || scrapedText.trim().length < 100) {
          // Soft fallback: some sites (LinkedIn, Greenhouse) block scrapers.
          // Log and continue — the AI will generate based on the user's profile only.
          console.warn('ScrapeGraphAI returned insufficient content (possibly bot-protected page). Falling back to profile-only generation.', JSON.stringify(extractedData).substring(0, 200));
        } else {
          actualJobDescription = actualJobDescription
            ? actualJobDescription + '\n\n' + scrapedText
            : scrapedText;
          console.log(`Successfully scraped ${scrapedText.length} characters from URL using ScrapeGraphAI`);
        }
      } catch (err: any) {
        // Non-fatal: log the error but don't block the user.
        // Many job boards (LinkedIn, Workday, Greenhouse) actively block scrapers.
        console.warn('URL scraping failed (non-fatal), proceeding without URL context:', err.message);
      }
    }

    // If no job description was extracted/provided, the AI will generate based on profile only.
    // This is a valid use-case (base resume, generic cover letter, etc.).

    // Call AI to analyze job
    const systemPrompt = `You are an expert career coach and ATS (Applicant Tracking System) specialist. 
Analyze the provided job description and return a comprehensive JSON response.

You MUST return a valid JSON object matching EXACTLY this structure:
{
  "title": "string",
  "company": "string",
  "salary_min": number | null,
  "salary_max": number | null,
  "salary_currency": "string" | null,
  "location": "string",
  "remote_option": "FULLY_REMOTE" | "HYBRID" | "ONSITE" | null,
  "job_description": "string",
  "key_responsibilities": ["string"],
  "required_skills": [{ "skill": "string", "proficiency": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" }],
  "preferred_skills": [{ "skill": "string", "proficiency": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" }],
  "nice_to_haves": ["string"],
  "red_flags": ["string"],
  "culture_signals": ["string"],
  "recommendation_level": "GREAT_FIT" | "GOOD_FIT" | "STRETCH_GOAL",
  "recommendation_reason": "string",
  "top_3_strengths": ["string"],
  "top_3_gaps": ["string"],
  "posted_date": "string" | null,
  "application_deadline": "string" | null,
  "company_size": "string" | null,
  "industry": "string" | null,
  "fit_score": number | null,
  "missing_bonus_skills": [{ "skill": "string" }] | null,
  "match_analysis": [{
    "title": "string",
    "description": "string",
    "score_percentage": number,
    "type": "SUCCESS" | "WARNING" | "INFO" | "PRIMARY"
  }] | null
}

CRITICAL:
- ONLY output the JSON object. Do not wrap in markdown tags like \`\`\`json.
- Strictly adhere to the enums provided above.
${input.user_profile ? `
Additionally, you have been provided with the candidate's profile. You MUST cross-reference the candidate's profile against the job description to generate:
- 'fit_score': A realistic score from 0-100 indicating how well the candidate fits the role.
- 'missing_bonus_skills': Skills mentioned in the JD that the candidate lacks. Format as an array of objects with a 'skill' property.
- 'match_analysis': A granular breakdown of how their background matches the requirements. Provide 3-4 items. Each item MUST include 'title', 'description', 'score_percentage' (0-100), and a 'type' of 'SUCCESS' (100% Match), 'WARNING' (Partial Match), 'PRIMARY' (Bonus Multiplier), or 'INFO' (Neutral).
` : `
Since no candidate profile was provided, leave 'fit_score', 'missing_bonus_skills', and 'match_analysis' blank or null.
`}`;

    const userPrompt = `Analyze this job description:\n\n${actualJobDescription}\n\n${
      input.user_role ? `The candidate is looking for a role as: ${input.user_role}\n\n` : ''
    }${
      input.user_profile ? `Candidate Profile:\n${JSON.stringify(input.user_profile, null, 2)}` : ''
    }`;

    const analysis = await withRateLimit(user.id, 'JD_ANALYSIS', async () => {
      return await aiClient.callWithJson(
        systemPrompt,
        userPrompt,
        JD_ANALYSIS_SCHEMA,
        { temperature: 0.3, max_tokens: 3000 }
      );
    });

    // Deduct credit from user
    await deductCredits(user.id, 'JD_ANALYSIS', {
      job_title: analysis.title,
      company: analysis.company,
    });

    // Save analysis to database
    const jobData = {
      user_id: user.id,
      job_title: analysis.title,
      company: analysis.company,
      raw_jd: actualJobDescription,
      job_url: input.job_url || null,
      location: analysis.location,
      salary_min: analysis.salary_min,
      salary_max: analysis.salary_max,
      salary_currency: analysis.salary_currency,
      is_remote: analysis.remote_option === "FULLY_REMOTE",
      match_score: analysis.fit_score || null,
      missing_skills: analysis.missing_bonus_skills ? analysis.missing_bonus_skills.map((s: any) => typeof s === 'string' ? s : s.skill) : [],
      required_skills: analysis.required_skills ? analysis.required_skills.map((s: any) => typeof s === 'string' ? s : s.skill) : [],
      recommendation: analysis.recommendation_level,
      jd_summary: JSON.stringify(analysis)
    };

    let saved = null;
    let saveError = null;

    if (input.job_id) {
      const { data, error } = await client
        .from('job_applications')
        .update(jobData)
        .eq('id', input.job_id)
        .eq('user_id', user.id)
        .select('id')
        .single();
      saved = data;
      saveError = error;
    } else {
      const { data, error } = await client
        .from('job_applications')
        .insert({ ...jobData, status: 'SAVED' })
        .select('id')
        .single();
      saved = data;
      saveError = error;
    }

    if (saveError) {
      console.error('Failed to save job analysis:', saveError);
      // Don't fail the request, analysis is valuable even if not saved
    }

    return c.json(
      {
        analysis,
        job_id: saved?.id || null,
        message: 'Job analyzed successfully',
      },
      200
    );
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError ||
      error instanceof InsufficientCreditsError ||
      error instanceof RateLimitError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /jobs/analyze:', error);
    return c.json(
      { 
        error: `Failed to analyze job: ${error instanceof Error ? error.message : JSON.stringify(error)}`, 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

/**
 * GET /jobs/analyze/:jobId
 * Retrieves a previously saved job analysis
 */
app.get('/:jobId', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    const jobId = c.req.param('jobId');

    // Get job analysis (RLS ensures user can only see their own)
    const { data: job, error: jobError } = await client
      .from('job_applications')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    return c.json({ job });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /jobs/analyze/:jobId:', error);
    return c.json(
      { error: 'Failed to retrieve job analysis', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

Deno.serve(app.fetch);
