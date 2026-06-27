import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { NETWORKING_MESSAGE_SCHEMA } from '../_shared/zod-schemas.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const FollowupInput = z.object({
  contact_id: z.string().uuid(),
  context: z.string().optional(), // E.g., "Ask for a referral", "Check in after 3 months"
});

type FollowupInputType = z.infer<typeof FollowupInput>;

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
    let input: FollowupInputType;

    try {
      input = FollowupInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid follow-up input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    // Get contact details
    const { data: contact, error: fetchError } = await client
      .from('networking_contacts')
      .select('*')
      .eq('id', input.contact_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !contact) {
      throw new ValidationError('Contact not found');
    }

    // Fetch user profile for context
    const { data: profile } = await client
      .from('user_profiles')
      .select('current_role, summary')
      .eq('user_id', user.id)
      .single();

    const systemPrompt = `You are an expert career coach. The user needs to follow up with a networking contact.
Write exactly 3 distinct follow-up message options based on the contact's details and the user's intent context.
The tone should be professional, respectful of their time, and appropriately warm given the relationship level.
Ensure the response is valid JSON matching the provided schema.`;

    const userPrompt = `Contact Details:
Name: ${contact.name}
Role: ${contact.role || 'Unknown'} at ${contact.company || 'Unknown'}
Relationship: ${contact.relationship}
Previous Notes: ${contact.notes || 'None'}

User Intent/Context: ${input.context || 'General check-in'}
User Current Role: ${profile?.current_role || 'Not provided'}

Generate 3 message options.`;

    const messageData: any = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      NETWORKING_MESSAGE_SCHEMA,
      { temperature: 0.7, max_tokens: 1500 }
    );

    // This is a free operation, but log it
    await client.from('usage_events').insert({
      user_id: user.id,
      event: 'NETWORKING_FOLLOWUP_GENERATION',
      credits_used: 0,
    });

    return c.json(
      {
        messages: messageData.messages,
        message: 'Follow-up messages generated successfully',
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

    console.error('Error in /networking/followup:', error);
    return c.json(
      { 
        error: 'Failed to generate follow-up messages', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

Deno.serve(app.fetch);
