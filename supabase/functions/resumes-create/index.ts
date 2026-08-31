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
    const bgTask = generateResumeContentAsync(user.id, resume.id, profile, jobAnalysis, templateId || '');
    
    // Register background task with Deno EdgeRuntime so the isolate doesn't terminate early
    if ((globalThis as any).EdgeRuntime?.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(bgTask);
    } else {
      // In local testing or environments where EdgeRuntime is not attached, await directly
      await bgTask;
    }

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

  // Fetch the user's auth email so the generated resume header includes it.
  // user_profiles has no email column, so we pull it from auth.users.
  let userEmail = '';
  try {
    const { data: authUser } = await serviceClient.auth.admin.getUserById(userId);
    userEmail = authUser?.user?.email || '';
  } catch (emailErr: unknown) {
    console.warn(`[resumes-create] Could not fetch email for ${userId}:`, emailErr);
  }

  try {
    const systemPrompt = `You are an elite, ATS-first executive resume writer and career architect. Your mission is to produce a comprehensive, commanding, and fully populated resume that:
1. Passes every ATS filter with a score of 95%+
2. Captivates recruiters and hiring managers with substantive, metric-dense accomplishments
3. Is laser-aligned to the TARGET JOB DESCRIPTION provided
4. Substantively fills the majority of a standard page (or more) with zero sparse or empty sections

════════════════════════════════════════════
EXECUTIVE RESUME CREATION STANDARDS (ADAPTIVE DENSITY)
════════════════════════════════════════════

1. ADAPTIVE CONTENT BALANCING (THE FULL-PAGE STANDARD)
- CASE A: SPARSE / MINIMAL CANDIDATE INPUT (e.g. only 1 or 2 jobs, few skills, or minimal details):
  * You MUST synthesize and expand the candidate's experience into a rich, recruiter-grade resume.
  * Expand the primary role into 5 to 6 comprehensive, quantified accomplishment bullets.
  * Synthesize 3 to 4 rich, categorized skill domains with 6 to 8 keywords each based on the target role/JD.
  * Generate a relevant, high-impact "Featured Project" detailing technical problem-solving and outcomes.
  * Provide an expansive 3 to 4 sentence executive summary.
  * Guarantee that even the most minimal user profile produces a commanding resume that fills 90–100% of a standard page.
- CASE B: EXTENSIVE / RICH CANDIDATE INPUT (e.g. 4+ jobs, dozens of skills, multiple degrees):
  * Select and highlight the accomplishments most relevant to the target JD.
  * Group the top 18–24 skills into 3–4 clean categories without clutter.
  * Allocate 4–5 bullets for the most recent role, 3–4 for the second role, and 2 for earlier roles.
  * Ensure the content flows cleanly and fills 1 full page (or 2 pages for 10+ year careers) with zero awkward orphans.

2. PROFESSIONAL TITLE & HEADER (STRICT ANTI-HALLUCINATION FOR CONTACT DETAILS)
- Set header.title to the EXACT target job title from the job description (e.g. "Senior Full Stack Engineer", "Principal Product Manager")
- Never use weak qualifiers ("Aspiring", "Seeking", "Junior") unless explicitly in the JD
- Include a compelling subtitle that encapsulates specialization (e.g. "Distributed Systems & Cloud Architecture Specialist")
- CONTACT INFORMATION ACCURACY (CRITICAL):
  * ONLY use the candidate's real location, phone number, email, and linkedin/portfolio if provided in the CANDIDATE INFORMATION.
  * If location or phone or linkedin is NOT provided or is empty in CANDIDATE INFORMATION, set that field in the header to an empty string "" — DO NOT invent, hallucinate, or default to placeholder cities (such as "San Francisco, CA") or fake phone numbers (such as "+1 (555)...").
  * Do NOT add fake addresses, phone numbers, or fabricated locations to any role or header.

3. EXECUTIVE SUMMARY (MANDATORY: 3 TO 4 SUBSTANTIVE SENTENCES)
- Write an authoritative, metric-dense 3 to 4 sentence executive summary:
  a) Sentence 1: Strong opening with target title, years of experience, and core specialization
  b) Sentence 2: Major quantified career milestones and technical/domain expertise aligned to the JD
  c) Sentence 3: Demonstrated leadership, cross-functional collaboration, or systems-level impact
  d) Sentence 4: Definite, high-value proposition for the prospective employer (never "hoping" or "looking for")

4. SKILLS & COMPETENCIES (MANDATORY: 3 TO 4 RICH CATEGORIES)
- Organize skills into 3 to 4 distinct, structured categories (e.g., "Core Specialization & Strategy", "Technical & Methodologies", "Tools, Frameworks & Platforms", "Leadership & Operations")
- Include 6 to 10 high-value ATS keywords per category
- Infer complementary industry-standard technologies and methodologies from the candidate's background to thoroughly match the target JD

5. PROFESSIONAL EXPERIENCE (DEEPLY QUANTIFIED & EXPANSIVE)
- KEEP real employer names and date ranges provided; never fabricate dates or employers
- FREELY rewrite every bullet point to be powerful, outcome-oriented, and quantified using the Google X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]"
- QUANTIFY heavily: Include percentages, revenue impact, latency reductions, user scale, team size, budget, or throughput (e.g. "Spearheaded...", "Architected...", "Optimized p99 latency by 42% across 10M+ daily requests...")
- Bullet Allocation:
  * 1–2 total past roles: 5 to 6 comprehensive bullets per role
  * 3+ past roles: 4–5 bullets for primary role, 3–4 for secondary role, 2–3 for prior roles

6. FEATURED / STANDOUT PROJECT
- Provide a high-impact featured project relevant to the target role with:
  * name: Project title
  * tech_stack: Key technologies, architectures, or methodologies used
  * bullet: 1 to 2 sentences detailing the problem solved, implementation, and measurable results
  * include: true

7. EDUCATION, CERTIFICATIONS & CREDENTIALS
- Keep real educational background intact; include relevant coursework, honors, or academic focus if helpful
- Include relevant industry certifications and credentials when available

8. PAGE DENSITY MANDATE
- Every generated resume MUST populate the majority of 1 full page (or more). Sparse or brief outputs are strictly prohibited.

OUTPUT FORMAT
You output ONLY a single, valid JSON object — no markdown wrapping, no explanation, no preamble, no trailing text.

You MUST output exactly this JSON structure:
{
  "meta": {
    "candidate_name": "string",
    "profession": "string",
    "target_role": "string",
    "generated_at": "string",
    "ats_keywords_used": ["string"],
    "page_fit_estimate": "comfortable"
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
    "featured_project": true,
    "education": true,
    "certifications": true,
    "languages": false,
    "recognition": false
  }
}`;

    const jobContext = jobAnalysis
      ? `\n\nTARGET JOB DESCRIPTION:\n${jobAnalysis.raw_jd || JSON.stringify(jobAnalysis.analysis_data)}`
      : '';

    const promptProfile = { ...profile, email: userEmail };

    const userPrompt = `CANDIDATE INFORMATION:\n\nProfile Data:\n${JSON.stringify(promptProfile, null, 2)}${jobContext}`;

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
