import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError, RateLimitError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { JD_ANALYSIS_SCHEMA, JD_SUMMARY_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { withRateLimit } from '../_shared/rate-limiter.ts';
import { scrapeJobUrl, normalizeJobUrl } from '../_shared/scraper.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const AnalyzeJobInput = z.object({
  job_id: z.string().uuid().optional(),
  job_description: z.string().max(50000).optional(),
  job_url: z.string().optional().transform((val) => normalizeJobUrl(val)),
  user_role: z.string().optional(), // For context/personalization
  user_profile: z.record(z.any()).optional(), // The user's full profile
}).refine(data => (data.job_description && data.job_description.trim().length > 0) || (data.job_url && data.job_url.trim().length > 0), {
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

    let actualJobDescription = (input.job_description || '').trim();

    // Extract job URL if provided using shared scraper
    if (input.job_url) {
      console.log(`Scraping job from URL: ${input.job_url}`);
      const scrapeResult = await scrapeJobUrl(input.job_url);

      if (scrapeResult.success && scrapeResult.extractedText) {
        actualJobDescription = actualJobDescription
          ? actualJobDescription + '\n\n' + scrapeResult.extractedText
          : scrapeResult.extractedText;
        console.log(`Successfully scraped ${scrapeResult.extractedText.length} characters from URL`);
      } else {
        // If user provided NO text/file and ONLY gave a URL that failed to scrape,
        // do not deduct credits or run AI on empty text. Notify user to paste text or attach file.
        if (!actualJobDescription || actualJobDescription.length < 20) {
          throw new ValidationError(
            'Could not read job link. Please paste the job text or attach a file instead.',
            { url: input.job_url, code: 'SCRAPE_FAILED', details: scrapeResult.error }
          );
        }
        console.warn('URL scraping failed, proceeding with user provided description:', scrapeResult.error);
      }
    }

    if (!actualJobDescription || actualJobDescription.length < 20) {
      throw new ValidationError('Please provide a job description via text, file, or valid URL.');
    }

    // Ensure job description is capped safely for AI context window (max 15,000 chars)
    if (actualJobDescription.length > 15000) {
      actualJobDescription = actualJobDescription.substring(0, 15000) + '\n\n[Job description truncated for analysis]';
    }

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
- 'salary_min'/'salary_max'/'salary_currency': use null when the salary is not mentioned in the listing. When the listing gives a range, use the lower and upper bounds in numbers (e.g. 60000, 80000). Normalize the currency to ISO code (USD, KES, EUR, GBP, etc.).
- 'remote_option': infer from the listing. Use null when it is not specified.
- 'key_responsibilities', 'required_skills', 'preferred_skills', 'nice_to_haves', 'culture_signals', 'red_flags': extract directly and faithfully from the listing. Do not invent requirements that are not present.
- 'required_skills' proficiency should be inferred from the wording (e.g. "fluent in", "expert", "5+ years" → ADVANCED/EXPERT; "basic knowledge" → BEGINNER).
- 'recommendation_level' and 'fit_score' should be realistic and calibrated against the candidate's actual profile — avoid inflated scores.
- 'top_3_strengths' and 'top_3_gaps' must be specific and evidence-based, drawn from the candidate profile and the job requirements.
${input.user_profile ? `
Additionally, you have been provided with the candidate's profile. You MUST cross-reference the candidate's profile against the job description to generate:
- 'fit_score': A realistic score from 0-100 indicating how well the candidate fits the role. Score honestly: missing core requirements should lower the score significantly; only a candidate who meets the majority of hard requirements should exceed 80.
- 'missing_bonus_skills': Skills mentioned in the JD that the candidate lacks. Format as an array of objects with a 'skill' property. If no gaps exist, return an empty array.
- 'match_analysis': A granular breakdown of how their background matches the requirements. Provide 3-4 items. Each item MUST include 'title', 'description', 'score_percentage' (0-100), and a 'type' of 'SUCCESS' (100% Match), 'WARNING' (Partial Match), 'PRIMARY' (Bonus Multiplier), or 'INFO' (Neutral).
- 'top_3_strengths': the strongest, most verifiable matches between the candidate and the role.
- 'top_3_gaps': the most important missing skills or experience relative to the role.
` : `
Since no candidate profile was provided, leave 'fit_score', 'missing_bonus_skills', 'match_analysis', 'top_3_strengths', and 'top_3_gaps' blank or null.
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
