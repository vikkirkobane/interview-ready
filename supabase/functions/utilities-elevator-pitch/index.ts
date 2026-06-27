import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { ELEVATOR_PITCH_SCHEMA } from '../_shared/zod-schemas.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const ElevatorPitchInput = z.object({
  context: z.enum(['INTERVIEW', 'NETWORKING', 'EMAIL']),
  target_role: z.string().optional(),
  target_company: z.string().optional(),
});

type ElevatorPitchInputType = z.infer<typeof ElevatorPitchInput>;

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
    let input: ElevatorPitchInputType;

    try {
      input = ElevatorPitchInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid elevator pitch input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Fetch user profile for context
    const { data: profile } = await client
      .from('user_profiles')
      .select('summary, current_role, years_experience, target_roles, technical_skills, soft_skills')
      .eq('user_id', user.id)
      .single();

    let contextData = '';
    if (profile) {
      contextData += `Candidate Profile: ${JSON.stringify(profile)}\n`;
    }

    if (input.target_role) {
      contextData += `Target Role: ${input.target_role}\n`;
    }
    if (input.target_company) {
      contextData += `Target Company: ${input.target_company}\n`;
    }

    const systemPrompt = `You are an expert career coach helping a candidate craft their 'elevator pitch' or introduction.
Create two versions of the pitch: a short 30-second version and a more detailed 60-second version.
The tone and structure should be optimized for the specific context: ${input.context}.
- INTERVIEW: Focus on professional background and why they are a fit.
- NETWORKING: Focus on conversational hooks, mutual interests, and brief background.
- EMAIL: Focus on concise, written introduction and call to action.

Always return valid JSON matching the provided schema.`;

    const userPrompt = `Context: ${input.context}
Candidate Details:
${contextData}

Generate the elevator pitches.`;

    const generatedPitch = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      ELEVATOR_PITCH_SCHEMA,
      { temperature: 0.7, max_tokens: 1500 }
    );

    await client.from('usage_events').insert({
      user_id: user.id,
      event: 'ELEVATOR_PITCH',
      credits_used: 0,
    });

    return c.json(
      {
        pitch: generatedPitch,
        message: 'Elevator pitch generated successfully',
      },
      200
    );
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /utilities/elevator-pitch:', error);
    return c.json(
      { 
        error: 'Failed to generate elevator pitch', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

Deno.serve(app.fetch);
