import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import {
  LINKEDIN_HEADLINE_SCHEMA,
  LINKEDIN_ABOUT_SCHEMA,
  LINKEDIN_EXPERIENCE_SCHEMA,
  LINKEDIN_SKILLS_SCHEMA,
  LINKEDIN_FEATURED_SCHEMA,
  LINKEDIN_OUTREACH_SCHEMA,
} from '../_shared/zod-schemas.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

/**
 * Section enum — covers every section from Master Prompt Step 3.
 */
const SECTION_ENUM = z.enum([
  'HEADLINE',
  'ABOUT',
  'EXPERIENCE_BULLETS',
  'SKILLS',
  'FEATURED',
  'OUTREACH_KIT',
]);

const LinkedInOptimizeInput = z.object({
  section: SECTION_ENUM,

  // Current content (required for HEADLINE / ABOUT / SKILLS)
  current_content: z.string().optional(),

  // For EXPERIENCE_BULLETS — full work history
  work_history: z.array(z.object({
    title:       z.string(),
    company:     z.string(),
    description: z.string(),
  })).optional(),

  // Strategic context (from intake wizard — always passed)
  target_roles:     z.array(z.string()).min(1).max(3),
  target_companies: z.array(z.string()).optional(),
  years_experience: z.number().optional(),

  // SPIKE differentiator
  spike: z.object({
    differentiator:  z.string(),
    praised_for:     z.string(),
    problems_solved: z.string(),
  }).optional(),

  // Tone preference
  tone: z.enum(['PROFESSIONAL', 'APPROACHABLE', 'DATA_DRIVEN', 'NARRATIVE', 'INSPIRATIONAL']).optional(),
});

type LinkedInOptimizeInputType = z.infer<typeof LinkedInOptimizeInput>;

// ── Section-specific system prompts (Master Prompt Step 3 formulas) ───────────

function buildPrompts(input: LinkedInOptimizeInputType): { system: string; user: string; schema: z.ZodTypeAny } {
  const rolesStr    = input.target_roles.join(', ');
  const toneStr     = input.tone || 'PROFESSIONAL';
  const spikeStr    = input.spike
    ? `SPIKE: ${input.spike.differentiator}. Praised for: ${input.spike.praised_for}. Problems solved: ${input.spike.problems_solved}.`
    : '';

  switch (input.section) {
    // ── HEADLINE ─────────────────────────────────────────────────────────────
    case 'HEADLINE': {
      const system = `You are an elite LinkedIn profile strategist applying the 2026 Master Prompt methodology.

HEADLINE FORMULA: [Target Role/Seniority] | [Specialty/Value Proposition] | [Quantified Impact or Key Credential] | [Differentiator]

RULES:
- Max 220 characters per headline
- Front-load the most important search term (target job title) in the first 40 characters
- Include at least one quantified metric OR unique credential
- Include one differentiator (niche expertise, unique methodology, mission alignment)
- NEVER use: "passionate", "guru", "ninja", "thought leader", "rockstar"
- Each of the 3 variants must have a distinctly different strategic FOCUS:
  • SEARCH_RANK: maximise keyword density for recruiter Boolean searches
  • DIFFERENTIATION: lead with the SPIKE differentiator and unique angle
  • IMPACT_METRIC: lead with the strongest quantified achievement
- Provide a brief rationale explaining the strategy for each variant.
- Return ONLY valid JSON matching this exact structure:
{
  "variants": [
    {
      "text": "The actual headline string",
      "rationale": "Why this works",
      "focus": "SEARCH_RANK | DIFFERENTIATION | IMPACT_METRIC"
    }
  ]
}
No prose outside JSON.`;

      const user = `Target Role(s): ${rolesStr}
Tone: ${toneStr}
${spikeStr}
Current Headline: ${input.current_content || '[Not provided]'}

Generate 3 headline variants.`;

      return { system, user, schema: LINKEDIN_HEADLINE_SCHEMA };
    }

    // ── ABOUT ─────────────────────────────────────────────────────────────────
    case 'ABOUT': {
      const system = `You are an elite LinkedIn profile strategist applying the 2026 Master Prompt methodology.

ABOUT SECTION FORMULA (follow this structure in order):
1. OPENING HOOK (1-2 sentences): State the core value or problem you solve. Use outcome-focused language. Avoid generic openers. Must contain primary keywords — this is the "preview" text recruiters see before clicking "see more".
2. CREDIBILITY SNAPSHOT (2-3 sentences): Years of experience, domains served, unique credentials. Embed the SPIKE differentiator here.
3. VALUE DELIVERY FRAMEWORK (3-4 bullet arrows "→"): Each arrow = [Core competency/methodology] → [Business/human outcome] → [Scale/context indicator].
4. HUMAN DIFFERENTIATOR (1-2 sentences): Collaborative style, leadership philosophy, core values. Authentic tone.
5. CALL TO ACTION: Clear, low-friction invitation. Tailor to user's stated goals.

RULES:
- Max 2600 characters total
- Short paragraphs (2-3 lines max) for mobile readability
- First 3 lines MUST contain primary keywords (visible before "see more" click)
- Embed 5-8 recruiter-searched keywords naturally
- No clichés or generic statements
- keyword_map: list each keyword used and WHERE it appears in the text
- Return ONLY valid JSON. No prose outside JSON.`;

      const user = `Target Role(s): ${rolesStr}
Target Companies: ${input.target_companies?.join(', ') || 'Not specified'}
Tone: ${toneStr}
${spikeStr}
Current About Section:
${input.current_content || '[Not provided]'}

Generate the optimised About section and keyword map.`;

      return { system, user, schema: LINKEDIN_ABOUT_SCHEMA };
    }

    // ── EXPERIENCE_BULLETS ────────────────────────────────────────────────────
    case 'EXPERIENCE_BULLETS': {
      const system = `You are an elite LinkedIn profile strategist applying the 2026 Master Prompt methodology.

EXPERIENCE BULLET FORMULA (apply to every bullet):
**[Bolded Quantified Outcome]**: [Action Verb] + [Scope/Context] + [Methodology/Skill] + [Business/Human Impact]

RULES:
- EVERY bullet starts with a **bolded quantified outcome** using markdown bold syntax: **X% improvement**, **$Y savings**, **Z users served**
- Use strong, specific action verbs: Led, Optimised, Developed, Implemented, Transformed, Spearheaded, Mentored, Streamlined
- Include 2-3 relevant keywords per bullet (role-specific skills + impact terms)
- Show scale: team size, budget managed, client volume, geographic scope, project complexity
- Focus on outcomes over responsibilities: "What changed because of this person's work?"
- If a metric is missing or unclear from the provided text, suggest a realistic, defensible estimate and flag it with [NEEDS VALIDATION]
- Generate 3-5 bullets per role
- Return ONLY valid JSON. No prose outside JSON.`;

      const user = `Target Role(s): ${rolesStr}
Tone: ${toneStr}
${spikeStr}

Work History to Rewrite:
${(input.work_history || []).map((r, i) => `Role ${i + 1}: ${r.title} at ${r.company}\nCurrent description: ${r.description}`).join('\n\n')}

Rewrite all roles with the bolded outcome formula.`;

      return { system, user, schema: LINKEDIN_EXPERIENCE_SCHEMA };
    }

    // ── SKILLS ────────────────────────────────────────────────────────────────
    case 'SKILLS': {
      const system = `You are an elite LinkedIn profile strategist applying the 2026 Master Prompt methodology.

SKILLS SECTION STRATEGY:

PINNED TOP 5 (maximise recruiter Boolean search match rate):
- (a) Target role/title keyword (most-searched for this role)
- (b) Primary domain expertise or methodology
- (c) High-demand skill in target industry (current 2026 trends)
- (d) Impact/outcome competency (e.g. "Strategic Planning", "Process Improvement")
- (e) Unique differentiator or niche skill from SPIKE data

FULL CATEGORISED LIST (30-50+ skills total across 5 categories):
- core_technical: role-specific tools, methodologies, knowledge areas
- industry_domain: sector-specific terminology, regulations, frameworks
- tools_platforms: software, systems, technologies
- leadership: team management, stakeholder engagement, mentorship, cross-functional
- soft_skills: communication, adaptability, problem-solving, emotional intelligence

RULES:
- Skills in pinned_top_5 MUST also appear in the categorised list
- Ensure skills appear naturally in About and Experience sections for algorithmic reinforcement
- Prioritise skills with highest recruiter search volume for the target role
- Return ONLY valid JSON. No prose outside JSON.`;

      const user = `Target Role(s): ${rolesStr}
Target Companies: ${input.target_companies?.join(', ') || 'Not specified'}
Years Experience: ${input.years_experience || 'Not specified'}
${spikeStr}
Current Skills Listed: ${input.current_content || '[Not provided]'}

Generate the strategic skills section.`;

      return { system, user, schema: LINKEDIN_SKILLS_SCHEMA };
    }

    // ── FEATURED ──────────────────────────────────────────────────────────────
    case 'FEATURED': {
      const system = `You are an elite LinkedIn profile strategist applying the 2026 Master Prompt methodology.

FEATURED SECTION STRATEGY:
Recommend 3-5 "proof artifacts" that validate the claims made in the About and Experience sections.

TYPES (ordered by impact):
1. CREDENTIAL — link to publication, award, certification, patent, conference presentation
2. PORTFOLIO — case study, project summary, portfolio link, documented outcome
3. CASE_STUDY — one-page summary: challenge → action → result → lessons
4. CERTIFICATION — visual uploads of verified credentials relevant to target roles
5. THOUGHT_LEADERSHIP — article, post, or media appearance demonstrating expertise

FOR EACH ITEM:
- title: keyword-rich, attention-grabbing (not generic)
- description: 1-2 sentences: relevance to target role + quantified impact if possible
- cta: clear action text (e.g. "View case study", "Download portfolio", "Read article")

RULES:
- Order recommendations by expected recruiter impact (highest first)
- Tailor to the target role — a software engineer needs different artifacts than a nurse
- Remind user in the description to redact confidential information
- Return ONLY valid JSON. No prose outside JSON.`;

      const user = `Target Role(s): ${rolesStr}
Target Companies: ${input.target_companies?.join(', ') || 'Not specified'}
${spikeStr}
Current About/Experience context: ${input.current_content || '[Not provided]'}

Generate 3-5 Featured section recommendations.`;

      return { system, user, schema: LINKEDIN_FEATURED_SCHEMA };
    }

    // ── OUTREACH_KIT ──────────────────────────────────────────────────────────
    case 'OUTREACH_KIT': {
      const system = `You are an elite LinkedIn profile strategist applying the 2026 Master Prompt methodology.

OUTREACH KIT: Generate 3 customisable message templates.

TEMPLATE RULES:
- Each template is personalised with [PLACEHOLDERS] for the user to fill in
- Professional yet human tone; confident but not arrogant
- Specific about the user's value, not generic
- Max 300 characters each (LinkedIn connection request limit is 300; InMail is longer)

TEMPLATES REQUIRED:
1. inbound_response: User is responding to a recruiter who messaged them first. Should be warm, express interest, highlight 1 key selling point, suggest next step.
2. proactive_outreach: User is cold-messaging a hiring manager at a target company. Should mention the specific role/company, lead with a quantified achievement, connect their value to the company's needs.
3. referral_request: User is asking a mutual connection for a referral. Should reference the relationship, be specific about the role/company, and make it easy for the referrer to say yes.

Return ONLY valid JSON. No prose outside JSON.`;

      const user = `Target Role(s): ${rolesStr}
Target Companies: ${input.target_companies?.join(', ') || 'Not specified'}
${spikeStr}
Tone preference: ${toneStr}
Context / selling points: ${input.current_content || '[Not provided]'}

Generate the 3 outreach templates.`;

      return { system, user, schema: LINKEDIN_OUTREACH_SCHEMA };
    }

    default:
      throw new ValidationError(`Unknown section: ${input.section}`);
  }
}

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
    let input: LinkedInOptimizeInputType;

    try {
      input = LinkedInOptimizeInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid optimization input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Validate section-specific required fields
    if (input.section === 'EXPERIENCE_BULLETS' && (!input.work_history || input.work_history.length === 0)) {
      throw new ValidationError('work_history is required for EXPERIENCE_BULLETS section');
    }

    // Check credits (1 credit per section optimisation)
    const hasCredits = await checkCredits(user.id, 'LINKEDIN_SECTION_OPTIMIZE', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(1, 0);
    }

    // Build section-specific prompts and get the right schema
    const { system, user: userPrompt, schema } = buildPrompts(input);

    const optimizedData = await aiClient.callWithJson(
      system,
      userPrompt,
      schema,
      { temperature: 0.6, max_tokens: 2500 }
    );

    await deductCredits(user.id, 'LINKEDIN_SECTION_OPTIMIZE', {
      section: input.section,
    });

    return c.json(
      {
        result:  optimizedData,
        section: input.section,
        message: `${input.section} optimised successfully`,
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

    console.error('Error in /linkedin/optimize:', error);
    return c.json(
      {
        error:   'Failed to optimise LinkedIn section',
        code:    'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined,
      },
      500
    );
  }
});

Deno.serve(app.fetch);
