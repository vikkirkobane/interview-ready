import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { LINKEDIN_ANALYSIS_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

/**
 * Input schema — implements Master Prompt Step 1 (Universal User Intake).
 * Users manually paste their LinkedIn content; no scraping required.
 */
const LinkedInAnalyzeInput = z.object({
  // ── Step 1A: Core profile data ──────────────────────────────────────────
  /** The sections they want scored (at least one required) */
  headline:   z.string().optional(),
  about:      z.string().optional(),
  experience: z.array(z.object({
    title:       z.string(),
    company:     z.string(),
    description: z.string(),
  })).optional(),
  skills: z.array(z.string()).optional(),

  // ── Step 1A: Strategic context ────────────────────────────────────────
  /** 1-3 target job titles the user is pursuing */
  target_roles:     z.array(z.string()).min(1).max(3),
  /** Optional target companies / org types e.g. "Fortune 500", "Y Combinator startups" */
  target_companies: z.array(z.string()).optional(),
  /** Years of professional experience */
  years_experience: z.number().min(0).max(50).optional(),

  // ── Step 1C: SPIKE Differentiator (mandatory wizard step) ────────────
  spike: z.object({
    /** The one thing that sets this person apart */
    differentiator: z.string(),
    /** What colleagues / managers consistently praise */
    praised_for:    z.string(),
    /** Problems they solve better than most in their field */
    problems_solved: z.string(),
  }).optional(),

  // ── Step 1D: Tone preference ─────────────────────────────────────────
  tone: z.enum(['PROFESSIONAL', 'APPROACHABLE', 'DATA_DRIVEN', 'NARRATIVE', 'INSPIRATIONAL']).optional(),
});

type LinkedInAnalyzeInputType = z.infer<typeof LinkedInAnalyzeInput>;

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
    let input: LinkedInAnalyzeInputType;

    try {
      input = LinkedInAnalyzeInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid LinkedIn profile input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Check credits
    const hasCredits = await checkCredits(user.id, 'LINKEDIN_ANALYSIS', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(2, 0);
    }

    // ── System Prompt — Master Prompt Steps 2A + 2C + 3 ────────────────────
    const systemPrompt = `You are an elite Career Coach, Hiring Manager, and Talent Strategist specialising in LinkedIn profile optimisation for 2026.

Your expertise includes:
• 2026 recruiter search behaviour and LinkedIn algorithm mechanics
• ATS optimisation and keyword strategy
• "6-second profile scan" psychology
• Industry-agnostic frameworks for transforming job seekers into solution providers

## YOUR TASK
Perform a comprehensive LinkedIn profile audit using the Master Prompt methodology:

### STEP 2A — KEYWORD INTELLIGENCE
Identify the top 15 recruiter-searched keywords for the user's target role(s). Categorise each as:
- ROLE_TITLE: what recruiters type in the search bar (e.g. "Product Manager", "Senior Engineer")
- SKILL: technical or functional competency (e.g. "Python", "P&L management")
- IMPACT: outcome/results keywords (e.g. "cost reduction", "revenue growth")
- INDUSTRY: sector-specific terminology (e.g. "SaaS", "FMCG", "fintech")

For each keyword, check whether it appears in the provided profile content.

### STEP 2C — 2026 ALGORITHM RULES (apply when scoring)
- Headline: must be ≤ 220 characters; front-load target role keyword in first 40 chars; no fluff words ("passionate", "guru", "ninja")
- About: first 3 lines must contain primary keywords (visible before "see more"); short paragraphs for mobile readability
- Experience bullets: must start with quantified outcomes; use strong action verbs; show scale (team size, budget, volume)
- Skills: should have 30-50+ items; top 5 must match most-searched keywords for the role

### STEP 3 — SECTION-BY-SECTION SCORING (0-100 each)
Score each provided section strictly against:
1. Keyword density and relevance to target role(s)
2. Quantified impact vs. vague responsibilities
3. Clarity, readability, and professional tone
4. Adherence to 2026 algorithm optimisation rules
5. First-impression strength (6-second scan test)

### STEP 1C — SPIKE DIFFERENTIATOR
If spike data is provided, identify the candidate's unique differentiator and craft a 1-sentence unique value proposition that could anchor their headline and About section.

### OUTPUT RULES
- overall_score: weighted average (headline 25%, about 30%, experience 30%, skills 15%)
- estimated_score_after_optimization: realistic projection if all suggestions are implemented
- issues: an object with keys 'headline', 'about', 'experience', and 'skills', each containing an array of specific problems
- suggestions: an object with keys 'headline', 'about', and 'experience_bullets', containing 1 actionable one-liner for the "quick wins" panel
- Return ONLY valid JSON matching the schema. No prose outside JSON.`;

    // ── User Prompt — inject all profile content ────────────────────────────
    const spikeBlock = input.spike
      ? `\nSPIKE Differentiator Data:
- Unique differentiator: ${input.spike.differentiator}
- Praised for: ${input.spike.praised_for}
- Problems solved: ${input.spike.problems_solved}`
      : '';

    const userPrompt = `Target Role(s): ${input.target_roles.join(', ')}
Target Companies/Industries: ${input.target_companies?.join(', ') || 'Not specified'}
Years of Experience: ${input.years_experience ?? 'Not specified'}
Preferred Tone: ${input.tone || 'PROFESSIONAL'}
${spikeBlock}

--- LINKEDIN PROFILE CONTENT ---
Headline: ${input.headline || '[Not provided]'}

About / Summary:
${input.about || '[Not provided]'}

Experience:
${input.experience
  ? input.experience.map((e, i) => `Role ${i + 1}: ${e.title} at ${e.company}\n${e.description}`).join('\n\n')
  : '[Not provided]'}

Skills: ${input.skills?.join(', ') || '[Not provided]'}
--- END PROFILE CONTENT ---

Analyse the profile and return the JSON.`;

    const analysis = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      LINKEDIN_ANALYSIS_SCHEMA,
      { temperature: 0.3, max_tokens: 3000 }
    );

    // Deduct credits
    await deductCredits(user.id, 'LINKEDIN_ANALYSIS');

    return c.json(
      {
        analysis,
        message: 'LinkedIn profile analysed successfully',
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

    console.error('Error in /linkedin/analyze:', error);
    return c.json(
      {
        error: 'Failed to analyse LinkedIn profile',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined,
      },
      500
    );
  }
});

Deno.serve(app.fetch);
