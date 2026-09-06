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
  template_id: z.string().min(1).optional(),
  job_analysis_id: z.string().uuid().optional(),
  is_base: z.boolean().default(false),
});

type CreateResumeInputType = z.infer<typeof CreateResumeInput>;

function getTemplateSystemPrompt(templateId: string): string {
  const outputSchema = `
OUTPUT FORMAT
You output ONLY a single, valid JSON object — no markdown wrapping, no explanation, no preamble, no trailing text.

You MUST output exactly this JSON structure:
{
  "meta": { "candidate_name": "string", "profession": "string", "target_role": "string", "generated_at": "string", "ats_keywords_used": ["string"], "page_fit_estimate": "comfortable" },
  "header": { "name": "string", "title": "string", "subtitle": "string", "email": "string", "phone": "string", "linkedin": "string", "portfolio": "string", "location": "string" },
  "summary": { "text": "string" },
  "skills": [ { "category": "string", "items": ["string"] } ],
  "experience": [ { "title": "string", "company": "string", "date_range": "string", "location": "string", "bullets": ["string"] } ],
  "featured_project": { "name": "string", "tech_stack": "string", "bullet": "string", "include": true },
  "education": [ { "degree": "string", "institution": "string", "year": "string", "note": "string" } ],
  "certifications": [ { "name": "string", "issuer": "string", "year": "string" } ],
  "languages": [ { "language": "string", "proficiency": "string" } ],
  "recognition": [ { "name": "string", "issuer": "string", "year": "string" } ],
  "sections_to_include": { "summary": true, "skills": true, "experience": true, "featured_project": true, "education": true, "certifications": true, "languages": false, "recognition": false }
}`;

  const contactRule = `CONTACT ACCURACY: ONLY use contact info explicitly provided. If location, phone, or linkedin is missing/empty, set that field to "" — never invent placeholder data.`;

  switch (templateId) {
    case 'minimal':
      return `You are a precision resume writer specializing in clean, editorial-quality minimal resumes. Produce a high-signal, aesthetically balanced resume where every word earns its place.

MINIMAL TEMPLATE RULES:
1. PAGE DENSITY MANDATE: Every resume MUST fill a minimum of 1 full standard page (approx 450 to 600 words). NEVER output a sparse half-page resume. Even with minimalist design and clean whitespace, provide rich, substantial career substance so the document is complete.
2. HEADER: title = exact target role from JD. subtitle = high-impact specialization phrase.
3. SUMMARY: 3 sharp, compelling sentences: (a) professional title + years of experience + primary specialization, (b) key quantified career impact directly aligned with target role, (c) unique value proposition for the employer.
4. SKILLS: Exactly 3 distinct, well-organized categories (e.g. "Core Expertise & Strategy", "Tools & Methodologies", "Leadership & Operations"). 6 to 8 tight, high-value ATS keywords per category.
5. EXPERIENCE: 4 to 5 crisp, impact-driven bullets for the primary role, and 3 to 4 bullets for earlier roles. Every bullet MUST follow: Action Verb + Context + Measurable Result (quantify with %, numbers, scale whenever possible).
6. FEATURED PROJECT (ALWAYS include=true): Include a standout project. name = descriptive title. tech_stack = key tools/methods. bullet = 2 to 3 sentences detailing problem, implementation, and measurable result.
7. EDUCATION: Comprehensive Degree + Institution + Year + relevant honor or specialization note.
8. sections_to_include: summary=true, skills=true, experience=true, featured_project=true, education=true, certifications=true (if certs exist), recognition=false unless distinguished.

${contactRule}

${outputSchema}`;

    case 'tech-stack':
      return `You are an elite technical resume writer for software engineers, developers, and technical professionals. Produce a technically rigorous, project-forward resume.

TECH STACK TEMPLATE RULES:
1. PAGE DENSITY MANDATE: Every resume MUST comfortably fill at least 1 full standard page (approx 500 to 650 words). Never output a brief or sparse technical resume.
2. HEADER: title = exact technical role from JD. subtitle = primary tech specialization (e.g. "Senior Full Stack Distributed Systems Engineer"). portfolio = GitHub or technical portfolio link if provided.
3. SUMMARY: 3 rich technical sentences: (a) technical title + years + core engineering stack, (b) key architecture or system scale accomplishment (throughput, users, latency, cloud efficiency), (c) target focus aligned with JD requirements.
4. SKILLS (CRITICAL): Exactly 4 rich, distinct technical categories: "Languages & Runtimes", "Frameworks & Libraries", "Cloud & Infrastructure / DevOps", "Databases & Data Architecture". 7 to 10 specific ATS technical keywords per category.
5. FEATURED PROJECT (FLAGSHIP - ALWAYS include=true): Highlight an impressive engineering project. name = technical project title. tech_stack = 5 to 7 specific technologies. bullet = 2 to 3 sentences covering architectural challenge, solution built, and measurable scale metrics (e.g. "Architected event-driven microservices processing 15M+ daily requests with 99.99% uptime, cutting latency by 45%").
6. EXPERIENCE: 4 to 5 rigorous bullets for the most recent role, 3 to 4 for earlier roles. Every bullet must include what was engineered + technologies utilized + quantified business/performance impact. Use power technical verbs: "Architected", "Refactored", "Optimized", "Migrated", "Shipped", "Instrumented".
7. EDUCATION: Degree + Institution + Year + relevant STEM coursework or GPA if 3.7+.
8. sections_to_include: featured_project=true ALWAYS, certifications=true if cloud/technical certs exist, recognition=false.

${contactRule}

${outputSchema}`;

    case 'academic':
      return `You are an expert academic CV writer. Produce a scholarly, education-forward resume following academic hiring conventions.

ACADEMIC TEMPLATE RULES:
1. PAGE DENSITY MANDATE: Every academic CV/resume MUST fill at least 1 full standard page (approx 500 to 700 words) with scholarly depth and rigor. Never output a brief or sparse CV.
2. HEADER: title = academic/research target title (e.g. "Postdoctoral Research Fellow", "Senior Research Scientist"). subtitle = specialized research domain. portfolio = Google Scholar, ORCID, or academic profile URL if provided.
3. SUMMARY: 3 to 4 scholarly sentences: (a) academic title + years + research domain, (b) key methodologies and theoretical contributions, (c) research impact (publications, grant funding, research groups led), (d) institutional alignment. Tone: formal, scholarly, precise.
4. EDUCATION (CRITICAL - LIST ALL DEGREES): Full degree + institution + year + thesis title if available + advisor if applicable. GPA if 3.8+ or Latin honors. Academic awards per degree.
5. SKILLS: Exactly 4 categories: "Research Methodologies & Protocols", "Technical & Computational Tools", "Domain Subject Expertise", "Teaching & Pedagogy". 6 to 8 items per category.
6. EXPERIENCE: Frame as "Research & Professional Experience". 4 to 5 bullets per role. Focus: research questions, methodologies, findings, publications, grants, students supervised. Verbs: "Investigated", "Designed", "Conducted", "Published", "Supervised", "Presented".
7. FEATURED PROJECT: Landmark research study or key publication. name = project/paper title. tech_stack = research tools/methods. bullet = research question + methodology + contribution/findings.
8. RECOGNITION: Set recognition array with fellowships, grants, prizes, scholarships. sections_to_include.recognition = true.
9. sections_to_include: education=true, experience=true, skills=true, featured_project=true, recognition=true, certifications=true for research ethics/teaching certs.

${contactRule}

${outputSchema}`;

    case 'executive':
    default:
      return `You are an elite, ATS-first executive resume writer and career architect. Produce a comprehensive, commanding, fully populated resume that passes ATS at 95%+ and captivates hiring managers.

EXECUTIVE TEMPLATE RULES:
1. PAGE DENSITY MANDATE: Every resume MUST fill at least 1 full standard page (approx 500 to 700 words). Zero sparse outputs.
2. ADAPTIVE DENSITY:
   - Sparse profile (1-2 jobs, few skills): Expand primary role to 5 to 6 quantified bullets. Synthesize 4 rich skill categories with 7 to 9 keywords each. Generate a high-impact Featured Project. Write a 3 to 4 sentence executive summary.
   - Rich profile (4+ jobs): Select accomplishments most relevant to JD. 4 to 5 bullets for most recent role, 3 to 4 for second, 2 for earlier. Group top 20 to 28 skills into 4 categories.
3. HEADER: title = EXACT target job title from JD. subtitle = compelling specialization phrase (e.g. "Enterprise SaaS & Global Growth Operations Leader").
4. SUMMARY: 3 to 4 authoritative, metric-dense sentences: (a) executive title + years + core domain, (b) quantified career milestones (revenue growth, cost reduction, market share), (c) cross-functional leadership or organizational scale, (d) strategic value for the hiring organization.
5. SKILLS: 4 executive categories ("Executive Leadership & Strategy", "Revenue & P&L Operations", "Technical & Systems Innovation", "Governance & Stakeholder Relations"). 7 to 10 ATS keywords per category.
6. EXPERIENCE: Use Google X-Y-Z formula. Quantify with percentages, revenue, latency, user scale, team size, budget. Use power verbs: "Spearheaded", "Architected", "Orchestrated", "Transformed".
7. FEATURED PROJECT (ALWAYS include=true): High-impact enterprise initiative with problem, implementation, and measurable business results.
8. sections_to_include: summary=true, skills=true, experience=true, featured_project=true, education=true, certifications=true if relevant, recognition=true if awards exist.

${contactRule}

${outputSchema}`;
  }
}

app.post('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

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

    const { data: profile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new NotFoundError('User profile not found. Complete profile first.');
    }

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

    // Resolve template slug — keep the original slug for the AI prompt
    const templateSlug = (input.template_id && !/^[0-9a-fA-F]{8}-/.test(input.template_id))
      ? input.template_id
      : 'executive';

    let templateId = input.template_id;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(templateId || '');

    if (!templateId || !isUuid) {
      const { data: defaultTemplate } = await serviceClient
        .from('resume_templates')
        .select('id')
        .eq('slug', templateSlug)
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

    const { data: resume, error: createError } = await serviceClient
      .from('resumes')
      .insert(insertPayload)
      .select('id')
      .single();

    if (createError || !resume) {
      throw new Error(`Failed to create resume: ${createError?.message}`);
    }

    const bgTask = generateResumeContentAsync(user.id, resume.id, profile, jobAnalysis, templateSlug);

    if ((globalThis as any).EdgeRuntime?.waitUntil) {
      (globalThis as any).EdgeRuntime.waitUntil(bgTask);
    } else {
      await bgTask;
    }

    return c.json(
      {
        resume_id: resume.id,
        message: 'Resume creation started. Streaming content...',
        stream_channel: `resume:${resume.id}`,
      },
      202
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

async function generateResumeContentAsync(
  userId: string,
  resumeId: string,
  profile: any,
  jobAnalysis: any,
  templateSlug: string
) {
  const serviceClient = createServiceClient();

  let userEmail = '';
  try {
    const { data: authUser } = await serviceClient.auth.admin.getUserById(userId);
    userEmail = authUser?.user?.email || '';
  } catch (emailErr: unknown) {
    console.warn(`[resumes-create] Could not fetch email for ${userId}:`, emailErr);
  }

  try {
    // Build the template-specific system prompt — primary content quality driver
    const systemPrompt = getTemplateSystemPrompt(templateSlug);

    const jobContext = jobAnalysis
      ? `\n\nTARGET JOB DESCRIPTION:\n${jobAnalysis.raw_jd || JSON.stringify(jobAnalysis.analysis_data)}`
      : '';

    const promptProfile = { ...profile, email: userEmail };

    const templateHint = `\n\nSELECTED TEMPLATE: ${templateSlug.toUpperCase()}\nApply ALL template-specific rules for this template as described in your system prompt above.`;

    const densityInstruction = `\n\nCRITICAL PAGE DENSITY REQUIREMENT:\nEnsure the resume content comfortably fills at least 1 full standard page (minimum 450 to 650 words, comprehensive achievement bullets, complete skill categories, and project). Tailor the content to the target job description while showcasing the candidate's career depth.`;

    const userPrompt = `CANDIDATE INFORMATION:\n\nProfile Data:\n${JSON.stringify(promptProfile, null, 2)}${jobContext}${templateHint}${densityInstruction}`;

    const resumeContent: any = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      RESUME_CONTENT_SCHEMA,
      { temperature: 0.3, max_tokens: 4000 }
    );

    // Ensure candidate's profile data is preserved for hidden sections in the resume builder
    if (!resumeContent.sections_to_include) {
      resumeContent.sections_to_include = {
        summary: true,
        skills: true,
        experience: true,
        featured_project: true,
        education: true,
        certifications: false,
        languages: false,
        recognition: false,
      };
    }

    // Pre-fill certifications from candidate profile if AI omitted them
    if ((!resumeContent.certifications || resumeContent.certifications.length === 0) && Array.isArray(profile.certifications) && profile.certifications.length > 0) {
      resumeContent.certifications = profile.certifications.map((c: any) => typeof c === 'string' ? { name: c, issuer: '', year: '' } : c);
      if (resumeContent.sections_to_include.certifications === undefined) {
        resumeContent.sections_to_include.certifications = false;
      }
    }

    // Pre-fill recognition/awards from candidate profile if AI omitted them
    const profileAwards = Array.isArray(profile.awards) ? profile.awards : Array.isArray(profile.recognition) ? profile.recognition : [];
    if ((!resumeContent.recognition || resumeContent.recognition.length === 0) && profileAwards.length > 0) {
      resumeContent.recognition = profileAwards.map((a: any) => typeof a === 'string' ? { name: a, issuer: '', year: '' } : a);
      if (resumeContent.sections_to_include.recognition === undefined) {
        resumeContent.sections_to_include.recognition = false;
      }
    }

    // Pre-fill featured project from candidate profile if AI omitted it
    if ((!resumeContent.featured_project || !resumeContent.featured_project.name) && Array.isArray(profile.projects) && profile.projects.length > 0) {
      const pProj = profile.projects[0];
      if (pProj) {
        resumeContent.featured_project = {
          name: pProj.name || pProj.title || '',
          tech_stack: pProj.tech_stack || '',
          bullet: pProj.bullet || pProj.description || '',
          include: false,
        };
      }
    }

    const contactWithMeta = {
      ...resumeContent.header,
      sections_to_include: resumeContent.sections_to_include,
    };

    await serviceClient.from('resume_contents').insert({
      resume_id: resumeId,
      name: resumeContent.header.name,
      title: resumeContent.header.title,
      contact: contactWithMeta,
      summary: resumeContent.summary.text,
      experience: resumeContent.experience,
      education: resumeContent.education,
      skills: resumeContent.skills,
      projects: (resumeContent.featured_project && (resumeContent.featured_project.include || resumeContent.featured_project.name)) ? [resumeContent.featured_project] : [],
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
      custom_sections: [{ type: 'config', sections_to_include: resumeContent.sections_to_include }],
    });

    await serviceClient
      .from('resumes')
      .update({
        status: 'READY',
        updated_at: new Date().toISOString(),
      })
      .eq('id', resumeId);

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

    console.log(`Resume ${resumeId} generated successfully (template: ${templateSlug})`);
  } catch (error: any) {
    console.error(`Failed to generate resume ${resumeId} (template: ${templateSlug}):`, error);

    await serviceClient
      .from('resumes')
      .update({
        status: 'DRAFT',
        updated_at: new Date().toISOString(),
      })
      .eq('id', resumeId);

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
