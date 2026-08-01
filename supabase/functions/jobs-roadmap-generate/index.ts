import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { ROADMAP_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits, checkCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const GenerateRoadmapInput = z.object({
  job_id: z.string().uuid(),
});

type GenerateRoadmapInputType = z.infer<typeof GenerateRoadmapInput>;

/**
 * POST /jobs-roadmap-generate
 * Generates a dynamic AI roadmap based on the user's missing skills for a job application.
 */
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
    let input: GenerateRoadmapInputType;

    try {
      input = GenerateRoadmapInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid roadmap generation input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Check if user has credits (5 credits for Roadmap generation)
    const hasCredits = await checkCredits(user.id, 'ROADMAP_GENERATION', c.req.raw);
    if (!hasCredits) {
      throw new InsufficientCreditsError(5, 0); // Assuming 0 is placeholder for balance
    }

    // Fetch the job application to get the missing skills and JD context
    const { data: jobApplication, error: jobError } = await client
      .from('job_applications')
      .select('job_title, company, missing_skills, raw_jd, jd_summary')
      .eq('id', input.job_id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !jobApplication) {
      throw new ValidationError('Job application not found');
    }

    let missingSkills = jobApplication.missing_skills || [];
    
    // Attempt to extract more granular missing skills from jd_summary if available
    if (jobApplication.jd_summary) {
      try {
        const parsedSummary = JSON.parse(jobApplication.jd_summary);
        if (parsedSummary.missing_bonus_skills && Array.isArray(parsedSummary.missing_bonus_skills)) {
          missingSkills = parsedSummary.missing_bonus_skills.map((s: any) => typeof s === 'string' ? s : s.skill);
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (!missingSkills || missingSkills.length === 0) {
      throw new ValidationError('No missing skills identified. You are already a perfect fit!');
    }

    const systemPrompt = `You are an elite career coach and technical mentor.
Your task is to generate a dynamic, highly actionable learning roadmap for a candidate preparing for an interview.
The candidate needs to master specific missing skills required for the role.

You MUST return a valid JSON object matching EXACTLY this structure:
{
  "duration_days": number, // between 7 and 30
  "title": "string",
  "overview": "string",
  "modules": [
    {
      "module_title": "string",
      "days_allocated": "string", // e.g., "Days 1-3"
      "focus_skill": "string",
      "action_items": ["string"],
      "estimated_hours": number,
      "resources_to_use": ["string"]
    }
  ]
}

CRITICAL:
- ONLY output the JSON object. Do not wrap in markdown tags like \`\`\`json.
- The 'duration_days' should be dynamically adjusted between 7 and 30 days depending on the complexity of the missing skills. Harder skills (e.g. distributed systems, machine learning) warrant longer roadmaps; lighter skills (e.g. a single framework) warrant shorter ones.
- 'title' should be specific to the target role, e.g. "Senior Backend Engineer Interview Roadmap" — not generic.
- 'overview' should summarize the plan in 2-3 sentences and reference the candidate's specific gaps.
- Cover EACH missing skill with at least one module; do not leave any listed missing skill unaddressed.
- 'modules' should be 3-6 modules. Allocate 4-8 hours per module on average, spread evenly across the duration.
- 'days_allocated' ranges must be contiguous and cover the full duration (e.g. Days 1-3, Days 4-7, ...), with no gaps or overlaps.
- 'action_items': 3-5 concrete, step-by-step actions (build a project, implement X, complete a tutorial series, practice Y). Be highly specific rather than generic advice.
- 'resources_to_use': 2-4 real, well-known resources (official docs, specific tutorials, books, courses, practice platforms) named precisely.
- Order modules by priority: foundational skills first, advanced/complex skills later.`;

    const userPrompt = `Role: ${jobApplication.job_title} at ${jobApplication.company}
Missing Skills to Bridge:
${missingSkills.map((s: string) => `- ${s}`).join('\n')}

Job Description Context:
${jobApplication.raw_jd ? jobApplication.raw_jd.substring(0, 3000) : 'No JD provided.'}

Generate a comprehensive roadmap to bridge these gaps. Ensure every missing skill listed above is covered by at least one module.`;

    const roadmap = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      ROADMAP_SCHEMA,
      { temperature: 0.4, max_tokens: 3000 }
    );
    
    console.log("Raw Roadmap Output from AI:", JSON.stringify(roadmap, null, 2));

    // Deduct 5 credits from user
    await deductCredits(user.id, 'ROADMAP_GENERATION', {
      job_title: jobApplication.job_title,
      company: jobApplication.company,
      cost: 5
    });

    // We'll update the job application's jd_summary to cache this roadmap
    let updatedSummary = null;
    if (jobApplication.jd_summary) {
      try {
        const parsed = JSON.parse(jobApplication.jd_summary);
        parsed.roadmap = roadmap;
        updatedSummary = JSON.stringify(parsed);
      } catch (e) {}
    } else {
      updatedSummary = JSON.stringify({ roadmap });
    }

    if (updatedSummary) {
      await client
        .from('job_applications')
        .update({ jd_summary: updatedSummary })
        .eq('id', input.job_id);
    }

    return c.json({ data: roadmap, message: 'Roadmap generated successfully' });
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError ||
      error instanceof InsufficientCreditsError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /jobs-roadmap-generate:', error);
    return c.json(
      { error: 'Failed to generate roadmap', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

Deno.serve(app.fetch);
