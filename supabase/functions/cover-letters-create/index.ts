import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { COVER_LETTER_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const CreateCoverLetterInput = z.object({
  job_application_id: z.string().uuid().optional(),
  job_title: z.string().min(1),
  company_name: z.string().min(1),
  tone: z.enum(['PROFESSIONAL', 'ENTHUSIASTIC', 'CONCISE', 'STORYTELLING', 'FORMAL']),
  resume_id: z.string().uuid().optional(),
  job_description: z.string().optional(),
});

type CreateCoverLetterInputType = z.infer<typeof CreateCoverLetterInput>;

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
    let input: CreateCoverLetterInputType;

    try {
      input = CreateCoverLetterInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid cover letter input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Check credits (Cover Letter costs 2 credits)
    const hasCredits = await checkCredits(user.id, 'COVER_LETTER', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(2, 0);
    }

    // Gather candidate info from profile
    const { data: profile } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new NotFoundError('User profile not found. Complete profile first.');
    }

    // Fetch specific resume if provided
    let resumeText = '';
    let topAchievements = '';
    if (input.resume_id) {
      const { data: resumeContent } = await client
        .from('resume_contents')
        .select('*')
        .eq('resume_id', input.resume_id)
        .single();
        
      if (resumeContent) {
        resumeText = resumeContent.summary || '';
        if (resumeContent.experience && Array.isArray(resumeContent.experience)) {
          topAchievements = resumeContent.experience
            .slice(0, 2)
            .map((e: any) => e.bullets ? e.bullets.slice(0, 2).join('\\n- ') : '')
            .join('\\n- ');
        }
      }
    }

    // Fetch job application / JD context
    let jobDescriptionText = input.job_description || '';
    if (input.job_application_id) {
      const { data: jobApp } = await client
        .from('job_applications')
        .select('raw_jd, jd_summary')
        .eq('id', input.job_application_id)
        .single();
        
      if (jobApp) {
        jobDescriptionText = jobApp.raw_jd || JSON.stringify(jobApp.jd_summary);
      }
    }

    const systemPrompt = `You are an expert Career Coach and Professional Cover Letter Writer with 15+ years of
experience helping candidates across all industries — technology, business, finance,
marketing, healthcare, law, education, engineering, NGOs, creative fields, and trades —
land interviews and secure job offers.

Your cover letters are:
- Highly personalised and human-sounding — a recruiter should feel they are reading
  a real person, not a template
- Professionally confident without arrogance — achievement-oriented, not boastful
- Precisely targeted — every sentence earns its place by connecting the candidate
  to the specific role and company
- ATS-friendly — keywords from the job description are woven in naturally,
  never forced or listed
- Concise — 280 to 380 words total in the letter body, strictly enforced

You receive a candidate's professional information and a target job description.
You output ONLY a single, valid JSON object — no markdown, no explanation, no preamble,
no trailing text. The JSON is consumed directly by a mobile application to render
DOCX and PDF cover letter files.

Every field in the JSON must be complete and accurate. If data is unavailable, use
an empty string "" — never omit a key. The word count in meta.word_count must
reflect the actual body word count (header and salutation excluded).

You MUST output exactly this JSON structure and nothing else:
{
  "meta": {
    "candidate_name": "string",
    "target_role": "string",
    "target_company": "string",
    "generated_at": "string",
    "word_count": 0,
    "ats_keywords_used": ["string"],
    "tone": "string"
  },
  "header": {
    "candidate_name": "string",
    "phone": "string",
    "email": "string",
    "linkedin": "string",
    "portfolio": "string",
    "date": "string",
    "hiring_manager": "string",
    "company_name": "string",
    "company_address": "string"
  },
  "salutation": "string",
  "paragraphs": {
    "opening": { "text": "string", "word_count": 0 },
    "body_1": { "text": "string", "word_count": 0 },
    "body_2": { "text": "string", "word_count": 0 },
    "closing": { "text": "string", "word_count": 0 }
  },
  "sign_off": {
    "closing_phrase": "string",
    "name": "string"
  }
}`;

    const fullName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Candidate';
    const email = user.email || '';

    const userPrompt = `CANDIDATE INFORMATION:

Full Name: ${fullName}
Phone: ${profile?.phone || ''}
Email: ${email}
LinkedIn: ${profile?.linkedin_url || ''}
Portfolio / Website: ${profile?.portfolio_url || ''}
Location: ${profile?.location || ''}
Current Title: ${profile?.current_role || ''}

RESUME SUMMARY OR KEY EXPERIENCE:
${resumeText || profile?.resume_raw_text || profile?.summary || ''}

CANDIDATE'S TOP ACHIEVEMENTS (optional but highly recommended):
- ${topAchievements || ''}

TARGET JOB DETAILS:

Job Title: ${input.job_title}
Company Name: ${input.company_name}
Company Description (optional): 
Hiring Manager Name (optional): 
Job Description: ${jobDescriptionText}

ADDITIONAL CONTEXT (optional):
Why does this candidate want THIS company specifically? 
Any industry, cultural, or geographic context? Target tone: ${input.tone}`;

    const generatedLetter: any = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      COVER_LETTER_SCHEMA,
      { temperature: 0.4, max_tokens: 3000 }
    );

    // Deduct credits
    await deductCredits(user.id, 'COVER_LETTER', {
      job_title: input.job_title,
      company: input.company_name,
    });

    // Save to database
    const { data: saved, error: saveError } = await client
      .from('cover_letters')
      .insert({
        user_id: user.id,
        job_application_id: input.job_application_id || null,
        title: `${input.company_name} - ${input.job_title} Cover Letter`,
        tone: input.tone,
        subject: `Application for ${input.job_title} - ${generatedLetter.header?.company_name || input.company_name}`,
        greeting: generatedLetter.salutation,
        body: [
          generatedLetter.paragraphs?.opening?.text,
          generatedLetter.paragraphs?.body_1?.text,
          generatedLetter.paragraphs?.body_2?.text,
          generatedLetter.paragraphs?.closing?.text
        ].filter(Boolean).join('\n\n'),
        signature: `${generatedLetter.sign_off?.closing_phrase}\n${generatedLetter.sign_off?.name}`,
        word_count: generatedLetter.meta?.word_count || 300,
        version: 1,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Failed to save cover letter:', saveError);
    }

    return c.json(
      {
        cover_letter: generatedLetter,
        cover_letter_id: saved?.id || null,
        message: 'Cover letter generated successfully',
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

    console.error('Error in /cover-letters/create:', error);
    return c.json(
      { 
        error: 'Failed to generate cover letter', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

Deno.serve(app.fetch);
