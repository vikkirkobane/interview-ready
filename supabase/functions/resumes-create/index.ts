import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient, createServiceClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, NotFoundError, InsufficientCreditsError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { RESUME_CONTENT_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const CreateResumeInput = z.object({
  title: z.string().min(1).max(100),
  template_id: z.string().uuid().optional(),
  job_analysis_id: z.string().uuid().optional(), // If tailoring to specific job
  is_base: z.boolean().default(false),
});

type CreateResumeInputType = z.infer<typeof CreateResumeInput>;

/**
 * POST /resumes/create
 * Generate a new tailored resume for user
 * Streams content section-by-section via Supabase Realtime for real-time UX
 */
app.post('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const serviceClient = createServiceClient();

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
    let input: CreateResumeInputType;

    try {
      input = CreateResumeInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid resume creation input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Deduct 3 credits BEFORE generation
    try {
      await deductCredits(user.id, 'RESUME_GENERATION', {
        resume_title: input.title,
        job_analysis_id: input.job_analysis_id || null,
      });
    } catch (error: any) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }
      throw new Error(`Credit deduction failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Get user profile (required for resume generation)
    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new NotFoundError('User profile not found. Complete profile first.');
    }

    // Get job analysis if provided (for context/tailoring)
    let jobAnalysis = null;
    if (input.job_analysis_id) {
      const { data: job } = await client
        .from('job_applications')
        .select('*')
        .eq('id', input.job_analysis_id)
        .eq('user_id', user.id)
        .single();

      jobAnalysis = job;
    }

    // Get template (use default if not specified)
    let templateId = input.template_id;
    if (!templateId) {
      const { data: defaultTemplate } = await serviceClient
        .from('resume_templates')
        .select('id')
        .eq('slug', 'executive')
        .eq('is_active', true)
        .single();
      
      templateId = defaultTemplate?.id;
    }

    // Create resume record
    const { data: resume, error: createError } = await serviceClient
      .from('resumes')
      .insert({
        user_id: user.id,
        title: input.title,
        template_id: templateId,
        job_application_id: input.job_analysis_id || null,
        is_base: input.is_base,
        status: 'DRAFT',
      })
      .select('id')
      .single();

    if (createError || !resume) {
      throw new Error(`Failed to create resume: ${createError?.message}`);
    }

    // Generate resume content via AI (asynchronous, stream updates via Realtime)
    generateResumeContentAsync(user.id, resume.id, profile, jobAnalysis, templateId || '');

    // Return immediately with resume ID (content will be streamed)
    return c.json(
      {
        resume_id: resume.id,
        message: 'Resume creation started. Streaming content...',
        stream_channel: `resume:${resume.id}`,
      },
      202 // 202 Accepted (processing)
    );
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof InsufficientCreditsError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /resumes/create:', error);
    return c.json(
      { error: 'Failed to create resume', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

/**
 * Generate resume content asynchronously
 * Streams updates via Supabase Realtime for real-time UI updates
 */
async function generateResumeContentAsync(
  userId: string,
  resumeId: string,
  profile: any,
  jobAnalysis: any,
  templateId: string
) {
  const serviceClient = createServiceClient();

  try {
    const systemPrompt = `You are an expert resume strategist and professional writer with deep knowledge across
all industries and career levels. You craft resumes that are simultaneously:
- Optimised for Applicant Tracking Systems (ATS)
- Compelling to human recruiters and hiring managers
- Authentic to the candidate's voice and actual experience
- Precisely formatted for single-page professional output

You receive a candidate's raw professional information and a target job description.
You output ONLY a single, valid JSON object — no markdown, no explanation, no preamble,
no trailing text. The JSON is consumed directly by a mobile application to generate
DOCX and PDF resume files.

Your JSON must be complete, accurate, and production-ready. Every field matters.
If a field has no data, use an empty string "" — never omit a key.

You MUST output exactly this JSON structure and nothing else:
{
  "meta": {
    "candidate_name": "string",
    "profession": "string",
    "target_role": "string",
    "generated_at": "string",
    "ats_keywords_used": ["string"],
    "page_fit_estimate": "tight"
  },
  "header": {
    "name": "string",
    "title": "string",
    "subtitle": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "portfolio": "string",
    "location": "string"
  },
  "summary": { "text": "string" },
  "skills": [
    { "category": "string", "items": ["string"] }
  ],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "date_range": "string",
      "location": "string",
      "bullets": ["string"]
    }
  ],
  "featured_project": {
    "name": "string",
    "tech_stack": "string",
    "bullet": "string",
    "include": true
  },
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string",
      "note": "string"
    }
  ],
  "certifications": ["string"],
  "languages": [
    { "language": "string", "proficiency": "string" }
  ],
  "recognition": ["string"],
  "sections_to_include": {
    "summary": true,
    "skills": true,
    "experience": true,
    "featured_project": false,
    "education": true,
    "certifications": false,
    "languages": false,
    "recognition": false
  }
}`;

    const jobContext = jobAnalysis
      ? `\n\nTARGET JOB DESCRIPTION:\n${jobAnalysis.raw_jd || JSON.stringify(jobAnalysis.analysis_data)}`
      : '';

    const userPrompt = `CANDIDATE INFORMATION:\n\nProfile Data:\n${JSON.stringify(profile, null, 2)}${jobContext}`;

    // Call AI to generate resume content
    const resumeContent: any = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      RESUME_CONTENT_SCHEMA,
      { temperature: 0.3, max_tokens: 4000 }
    );

    // Save resume content mapped to DB schema
    await serviceClient.from('resume_contents').insert({
      resume_id: resumeId,
      name: resumeContent.header.name,
      title: resumeContent.header.title,
      contact: resumeContent.header,
      summary: resumeContent.summary.text,
      experience: resumeContent.experience,
      education: resumeContent.education,
      skills: resumeContent.skills,
      projects: (resumeContent.featured_project && resumeContent.featured_project.include) ? [resumeContent.featured_project] : [],
      certifications: resumeContent.certifications || [],
      awards: resumeContent.recognition || [],
    });

    // Update resume status to READY
    await serviceClient
      .from('resumes')
      .update({
        status: 'READY',
        updated_at: new Date().toISOString(),
      })
      .eq('id', resumeId);

    // Notify client via Realtime channel that generation is complete
    const supabase = createServiceClient();
    await supabase.channel(`resume:${resumeId}`).send({
      type: 'broadcast',
      event: 'generation_complete',
      payload: {
        resume_id: resumeId,
        status: 'READY',
        content: resumeContent,
      },
    });

    console.log(`Resume ${resumeId} generated successfully`);
  } catch (error: any) {
    console.error(`Failed to generate resume ${resumeId}:`, error);

    // Update resume status to FAILED
    await serviceClient
      .from('resumes')
      .update({
        status: 'DRAFT', // Keep as draft so user can retry
        updated_at: new Date().toISOString(),
      })
      .eq('id', resumeId);

    // Notify client of failure
    const supabase = createServiceClient();
    await supabase.channel(`resume:${resumeId}`).send({
      type: 'broadcast',
      event: 'generation_failed',
      payload: {
        resume_id: resumeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * GET /resumes/:resumeId
 * Retrieve resume with content
 */
app.get('/:resumeId', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    const resumeId = c.req.param('resumeId');

    // Get resume with content
    const { data: resume, error: resumeError } = await client
      .from('resumes')
      .select('*, resume_contents(*)')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (resumeError || !resume) {
      throw new NotFoundError('Resume not found');
    }

    return c.json({ resume });
  } catch (error: any) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /resumes/:resumeId:', error);
    return c.json(
      { error: 'Failed to retrieve resume', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

/**
 * GET /resumes
 * List all resumes for current user
 */
app.get('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    const { data: resumes, error: resumesError } = await client
      .from('resumes')
      .select('id, title, template_id, status, ats_score, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (resumesError) {
      throw resumesError;
    }

    return c.json({ resumes });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /resumes:', error);
    return c.json(
      { error: 'Failed to retrieve resumes', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

Deno.serve(app.fetch);
