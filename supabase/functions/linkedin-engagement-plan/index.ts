import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { LINKEDIN_ENGAGEMENT_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

/**
 * Optional add-on: 30-Day LinkedIn Engagement Plan
 * Master Prompt Step 5 — costs extra credits.
 * Only accessible after the user has completed the main analysis.
 */
const EngagementPlanInput = z.object({
  target_roles:     z.array(z.string()).min(0).max(10).optional().default(['Professional']),
  target_companies: z.array(z.string()).optional(),
  industry:         z.string().optional(),
  tone:             z.enum(['PROFESSIONAL', 'APPROACHABLE', 'DATA_DRIVEN', 'NARRATIVE', 'INSPIRATIONAL']).optional().default('PROFESSIONAL'),
  /** Key achievement or insight from the profile analysis to anchor content ideas */
  top_achievement:  z.string().optional(),
});

type EngagementPlanInputType = z.infer<typeof EngagementPlanInput>;

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
    let input: EngagementPlanInputType;

    try {
      input = EngagementPlanInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid engagement plan input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    const hasCredits = await checkCredits(user.id, 'LINKEDIN_ENGAGEMENT_PLAN', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(2, 0);
    }

    const systemPrompt = `You are an elite LinkedIn growth strategist creating a 30-day post-optimisation engagement plan.

## MASTER PROMPT STEP 5: POST-OPTIMISATION ENGAGEMENT STRATEGY

Your plan must be low-time-commitment, realistic, and directly tied to the user's job search goals.

### STRUCTURE REQUIRED:
Return exactly 3 week-groupings:
- weeks[0]: "Week 1-2: Profile Launch & Initial Visibility"
  Tasks: profile share post, 2-3 short insight posts, thoughtful comments on target company posts, 10-15 new recruiter/HM connections with personalised notes
- weeks[1]: "Week 3-4: Authority Building"
  Tasks: 1 medium-form article or long-form post ("How I achieved X" or "Lessons from Y"), behind-the-scenes professional decision post, engage with 2-3 industry LinkedIn groups
- weeks[2]: "Month 2+: Sustained Visibility"
  Tasks: monthly insight share, quarterly Featured section refresh, recommendation requests, strategic congratulations and job sharing

Each task needs:
- day: when to do it (e.g. "Day 1", "Day 3-4", "Weekly")
- action: specific, actionable instruction (not vague)
- time_needed: realistic time estimate (e.g. "10 min", "30 min")
- type: POST | COMMENT | CONNECT | PUBLISH | UPDATE | OUTREACH

monthly_cadence: 3-4 recurring monthly habits for ongoing visibility.

Return ONLY valid JSON matching this exact structure:
{
  "weeks": [
    {
      "week_label": "Week 1-2: ...",
      "theme": "...",
      "tasks": [
        {
          "day": "Day 1",
          "action": "...",
          "time_needed": "10 min",
          "type": "POST"
        }
      ]
    }
  ],
  "monthly_cadence": ["habit 1", "habit 2"]
}

OUTPUT RULES:
- Return ONLY valid JSON. No prose outside JSON. No markdown, no code fences.
- Use proper capitalization (Title Case for week labels and headings, full proper sentences).
- Never leave a task action empty — every task must be specific and actionable.
- month and week groupings must cover the full 30 days as described.`;

    const userPrompt = `Target Role(s): ${input.target_roles.join(', ')}
Target Companies/Industries: ${input.target_companies?.join(', ') || input.industry || 'Not specified'}
Communication Tone: ${input.tone || 'PROFESSIONAL'}
Key Achievement to Anchor Content: ${input.top_achievement || 'Not specified'}

Generate the 30-day engagement plan.`;

    const plan = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      LINKEDIN_ENGAGEMENT_SCHEMA,
      { temperature: 0.5, max_tokens: 2000 }
    );

    await deductCredits(user.id, 'LINKEDIN_ENGAGEMENT_PLAN');

    return c.json(
      {
        plan,
        message: '30-day engagement plan generated successfully',
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

    console.error('Error in /linkedin/engagement-plan:', error);
    return c.json(
      {
        error:   'Failed to generate engagement plan',
        code:    'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined,
      },
      500
    );
  }
});

Deno.serve(app.fetch);
