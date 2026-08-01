import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError, NotFoundError } from '../_shared/errors.ts';
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
  job_url: z.string().url().optional(),
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
            jobDescriptionText = jobDescriptionText 
              ? jobDescriptionText + '\n\n' + scrapedText 
              : scrapedText;
          }
        }
      } catch (err: any) {
        console.warn('Failed to scrape job URL for cover letter:', err.message);
        // Continue with the text we already have
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
reflect the actual body word count (header and salutation excluded), and each
paragraph's word_count must reflect that paragraph's own word count.

──────────────────────────────────────────────────────────
PROFESSION DETECTION & TONE CALIBRATION
──────────────────────────────────────────────────────────
Detect the candidate's profession from the target role, resume, and job description,
and calibrate the tone accordingly:
- Engineering / Tech: confident, precise — technical depth, delivery, ownership
- Medicine / Healthcare: warm, patient-centred — outcomes, empathy, compliance
- Law / Legal: formal, measured — analytical rigour, outcomes
- Finance / Accounting: precise, authoritative — numbers, risk, returns
- Education / Academia: passionate, nurturing — outcomes, research impact
- Creative / Design: energetic, expressive — portfolio, brand impact
- Business / Management: strategic, results-oriented — leadership, P&L, influence
- Science / Research: methodical, curious — methodology, publications
- NGO / Non-Profit: mission-driven, collaborative — social impact, community
- Sales / Marketing: energetic, persuasive — revenue, growth, pipeline
- Trades / Technical: practical, reliable — certification, safety, project scale
Follow the requested "Target tone" first (Professional / Enthusiastic / Concise /
Storytelling / Formal). When the target tone is generic, let the profession's natural
tone guide the writing.

──────────────────────────────────────────────────────────
PARAGRAPH-LEVEL RULES (follow strictly)
──────────────────────────────────────────────────────────
Opening (2–3 sentences, 40–60 words):
- Hook the reader in sentence 1: name the specific role + company + ONE concrete
  reason this is the right fit. Do NOT open with "I am writing to apply for...",
  "I am excited to apply for the position of...", or "I came across this opportunity
  and...". Instead open with a confident, specific statement of fit.

Body 1 — Relevant Experience (3–5 sentences, 90–120 words):
- Lead with the most relevant experience (not necessarily the most recent).
- Name the specific tools, methods, environments, or scales the job description asks for.
- Include at least one metric or scope signal (team size, budget, %, users, revenue).
- Mirror the job description's exact phrasing where possible ("end-to-end delivery",
  not "handling things from start to finish").
- Do not summarise the resume — tell the story the resume cannot tell.

Body 2 — Achievements & Value (3–5 sentences, 90–120 words):
- Feature one or two specific, verifiable achievements: [What you did] + [How you did it]
  + [What it produced].
- If no hard metrics exist, use scope signals ("across 12 enterprise clients",
  "for an audience of 50,000 users").
- Show personality — this is where the human behind the CV becomes visible.
- Tie the achievement back to the company's context and the role's challenges.

Closing (2–3 sentences, 40–60 words):
- Reaffirm enthusiasm for THIS role at THIS company, not generic excitement.
- State availability for interview ("I would welcome the opportunity to discuss...").
- End with a confident, warm call to action — not a plea.

Word count targets: Opening 40–60 · Body 1 90–120 · Body 2 90–120 · Closing 40–60.
Total body (opening + body_1 + body_2 + closing) must be 280–380 words.

──────────────────────────────────────────────────────────
KEYWORD EXTRACTION & INJECTION (ATS)
──────────────────────────────────────────────────────────
1. Extract the most relevant keywords from the job description: hard requirements
   (tools, licences, methods, systems), soft/culture signals ("collaborative",
   "fast-paced"), and action language the employer uses ("drive", "lead", "build",
   "deliver", "grow").
2. Inject them naturally into full sentences — never list them. Distribute them
   across paragraphs (opening 2–3, body 1 4–6, body 2 2–4, closing 1–2).
3. Populate meta.ats_keywords_used with every keyword actually injected.
4. Never repeat the same keyword more than twice across the whole letter.
5. Mirror the employer's exact phrasing where possible.

──────────────────────────────────────────────────────────
VOICE & QUALITY RULES
──────────────────────────────────────────────────────────
- Match the candidate's natural vocabulary level. A junior applicant should not
  sound like a seasoned executive; a tradesperson should not sound like a lawyer.
- Enthusiasm must be earned by specifics, not performed by adjectives:
  "I'm excited because [specific reason]" is stronger than "I am deeply passionate
  about this opportunity".
- If a company description is provided, reference something specific about their
  mission, product, or culture. If not, reference the role requirements instead.
- Delete any sentence that could apply to any other company or role unchanged.
- NEVER use these clichés: "passion for excellence", "results-driven",
  "proven track record", "team player", "goes above and beyond",
  "think outside the box", "dynamic professional", "leverage synergies",
  "value-add", "hard-working individual", "I am confident I would be a great fit",
  "please find my CV attached", "do not hesitate to contact me".

──────────────────────────────────────────────────────────
SALUTATION & SIGN-OFF
──────────────────────────────────────────────────────────
- Salutation: if a hiring manager name is provided, use "Dear [Name],"
  (e.g. "Dear Ms. Johnson,"). Otherwise always use "Dear Hiring Manager," —
  never leave the salutation empty.
- Sign-off closing_phrase: a natural professional close such as "Sincerely,",
  "Best regards,", or "Warm regards,".
- sign_off.name must be the candidate's full name.
- header.date must be the exact "Today's Date" provided in the request.
- header.linkedin and header.portfolio: display URL only, without "https://".

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

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const userPrompt = `CANDIDATE INFORMATION:

Full Name: ${fullName}
Phone: ${profile?.phone || ''}
Email: ${email}
LinkedIn: ${profile?.linkedin_url || ''}
Portfolio / Website: ${profile?.portfolio_url || ''}
Location: ${profile?.location || ''}
Current Title: ${profile?.current_role || ''}
Today's Date (use this EXACT date in header.date): ${today}

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

Target Tone: ${input.tone}

ADDITIONAL CONTEXT (optional):
Why does this candidate want THIS company specifically? 
Any industry, cultural, or geographic context?`;

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
