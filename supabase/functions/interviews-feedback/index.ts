import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, NotFoundError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { INTERVIEW_SCORE_SCHEMA } from '../_shared/zod-schemas.ts';

const app = new Hono();

app.use('/*', cors());

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

    const url = new URL(c.req.url);
    const parts = url.pathname.split('/');
    const interviewId = parts[parts.length - 2];

    // Fetch existing interview
    const { data: interview, error: fetchError } = await client
      .from('mock_interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !interview) {
      throw new NotFoundError('Interview not found');
    }

    if (interview.status === 'COMPLETED' && interview.detailed_feedback) {
       // Already graded, just return existing feedback
       return c.json({ feedback: interview.detailed_feedback }, 200);
    }

    const messages = Array.isArray(interview.messages) ? [...interview.messages] : [];
    
    if (messages.length < 3) {
      throw new ValidationError('Interview is too short to generate meaningful feedback');
    }

    const systemPrompt = `You are an expert technical recruiter and interviewer evaluator.
Review the provided mock interview transcript. Provide comprehensive, structured feedback using the provided JSON schema.
Evaluate the candidate strictly against the provided Role, Interview Type, and Job Description.
Be highly objective, critical, and specific. Do not flatter the candidate. Point out exactly where they lacked depth, clarity, or technical accuracy.

Respond ONLY with a raw, valid JSON object matching this schema exactly (no markdown formatting, no comments, just the JSON):
{
  "overall_score": <number 0-100>,
  "dimension_scores": {
    "communication": <number 0-100>,
    "technical_knowledge": <number 0-100>,
    "problem_solving": <number 0-100>,
    "confidence": <number 0-100>,
    "cultural_fit": <number 0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areas_for_improvement": ["<area 1>", "<area 2>", "<area 3>"],
  "hiring_recommendation": "<Clear hire/no-hire/leaning recommendation with 1-2 sentence justification>",
  "feedback": "<Overall constructive summary of the performance>"
}`;

    const conversationHistory = messages.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n\n');
    
    const jdContext = interview.job_description 
      ? `\nJob Description:\n${interview.job_description}` 
      : '';

    const userPrompt = `Role: ${interview.role}${interview.company ? ` at ${interview.company}` : ''}
Interview Type: ${interview.interview_type}${jdContext}
    
Interview Transcript:
${conversationHistory}

Generate structured feedback.`;

    const feedbackData: any = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      INTERVIEW_SCORE_SCHEMA,
      { temperature: 0.3, max_tokens: 3000 }
    );

    // Update interview in DB
    const { error: updateError } = await client
      .from('mock_interviews')
      .update({
        status: 'COMPLETED',
        overall_score: feedbackData.overall_score,
        communication_score: feedbackData.dimension_scores?.communication || 0,
        technical_score: feedbackData.dimension_scores?.technical_knowledge || 0,
        confidence_score: feedbackData.dimension_scores?.confidence || 0,
        strengths: feedbackData.strengths || [],
        improvements: feedbackData.areas_for_improvement || [],
        detailed_feedback: feedbackData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', interviewId);

    if (updateError) {
      console.error('Failed to update interview with feedback:', updateError);
      throw new Error('Database update failed');
    }

    return c.json(
      {
        feedback: feedbackData,
        message: 'Interview feedback generated successfully'
      },
      200
    );
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError ||
      error instanceof NotFoundError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /interviews/:id/feedback:', error);
    return c.json(
      { 
        error: 'Failed to generate feedback', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

Deno.serve(app.fetch);
