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
  template_id: z.string().min(1).optional(), // Template name e.g. 'executive', 'minimal'
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

    // MOCK USER
    const user = { id: 'mock-user-123' };

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

    // Get template (resolve slug to UUID or use default)
    let templateId = input.template_id;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(templateId || '');
    
    if (!templateId || !isUuid) {
      const slugToQuery = templateId && !isUuid ? templateId : 'executive';
      const { data: defaultTemplate } = await serviceClient
        .from('resume_templates')
        .select('id')
        .eq('slug', slugToQuery)
        .eq('is_active', true)
        .single();
      
      templateId = defaultTemplate?.id;
    }

    const insertPayload: any = {
      user_id: user.id,
      title: input.title,
      is_base: input.is_base,
      status: 'DRAFT',
    };
    if (templateId) insertPayload.template_id = templateId;
    if (input.job_analysis_id) insertPayload.job_application_id = input.job_analysis_id;

    // Create resume record
    const { data: resume, error: createError } = await serviceClient
      .from('resumes')
      .insert(insertPayload)
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
      { error: error instanceof Error ? error.message : String(error), code: 'INTERNAL_ERROR' },
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
    const systemPrompt = `You are an elite, ATS-first resume engineer. Your sole mission is to produce a resume that:
1. Passes every ATS filter with a score of 90%+
2. Reads compellingly to a human recruiter who opens it after the ATS
3. Is laser-aligned to the TARGET JOB DESCRIPTION provided

════════════════════════════════════════════
STRATEGY — READ THIS CAREFULLY
════════════════════════════════════════════

PROFESSIONAL TITLE
- Set header.title to the EXACT job title from the job description (e.g. "Product Manager", "Senior Data Engineer")
- Never use weak qualifiers: no "Aspiring", "Seeking", "Junior", "Entry-Level" unless those words appear in the JD itself
- The title must match what an ATS keyword scanner looks for first

SKILLS SECTION
- List ALL skills, tools, and technologies that appear in the job description
- Group them into logical categories (e.g. "Core Skills", "Tools & Platforms", "Soft Skills")
- Do NOT limit yourself to skills the candidate explicitly listed — infer from their background and add every relevant JD keyword
- This section is the primary ATS keyword injection zone

EXPERIENCE SECTION — STRICT RULES
- KEEP all real employer names and date ranges exactly as provided (do not invent employers or fabricate dates)
- FREELY rewrite every bullet point to be impactful, quantified, and aligned to the JD
- INVENT specific, plausible quantified achievements that a person in that role at that company could realistically claim (e.g. "Reduced onboarding time by 35%", "Managed a portfolio of 50+ client accounts", "Led cross-functional team of 8 engineers")
- Reframe the experience titles at each employer if a sharper title better serves the JD (e.g. "Sales Executive" → "Business Development & Revenue Growth Specialist")
- Every bullet must start with a strong action verb (Led, Spearheaded, Engineered, Drove, Optimised, Delivered, etc.)
- Minimum 4 bullets per role, each packed with keywords from the JD
- If the candidate's background is in a different industry, bridge it — reframe transferable skills to match the JD language precisely

PROFESSIONAL SUMMARY
- Write a punchy 3-sentence summary that:
  a) Opens with the exact target job title
  b) Highlights the most relevant skills/achievements for the JD
  c) Ends with a confident value proposition (never "looking for" or "hoping to")

EDUCATION
- Keep exactly as provided. Do not fabricate degrees or institutions.

CERTIFICATIONS & RECOGNITION
- Only include if the candidate has real ones from their profile. Do not fabricate.

OUTPUT FORMAT
You output ONLY a single, valid JSON object — no markdown, no explanation, no preamble, no trailing text.

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
  "certifications": [
    { "name": "string", "issuer": "string", "year": "string" }
  ],
  "languages": [
    { "language": "string", "proficiency": "string" }
  ],
  "recognition": [
    { "name": "string", "issuer": "string", "year": "string" }
  ],
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
      certifications: (resumeContent.certifications || []).map((c: any) => ({
        id: crypto.randomUUID(),
        name: c.name || '',
        issuer: c.issuer || '',
        year: c.year || ''
      })),
      awards: (resumeContent.recognition || []).map((a: any) => ({
        id: crypto.randomUUID(),
        name: a.name || '',
        issuer: a.issuer || '',
        year: a.year || ''
      })),
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
