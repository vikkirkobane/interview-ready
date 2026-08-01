import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, NotFoundError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const MessageInput = z.object({
  interview_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  /** Extracted text from a file the candidate attached mid-interview (JD, spec, notes). */
  file_context: z.string().optional(),
});

type MessageInputType = z.infer<typeof MessageInput>;

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
    let input: MessageInputType;

    try {
      input = MessageInput.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid message input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    const interviewId = input.interview_id;

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

    if (interview.status !== 'IN_PROGRESS') {
      throw new ValidationError('Interview is already completed or abandoned');
    }

    const messages = Array.isArray(interview.messages) ? [...interview.messages] : [];

    // Append user message
    messages.push({
      role: 'user',
      content: input.content,
      timestamp: new Date().toISOString()
    });

    // Prepare context for AI
    const jdContext = interview.job_description 
      ? `\n\nJOB DESCRIPTION:\n${interview.job_description}\n\nCRITICAL INSTRUCTION: You must heavily base your questions and evaluation on the specific responsibilities, skills, and requirements mentioned in the job description above. Tailor the mock interview to feel exactly like a real-life interview for this specific role.` 
      : '';

    // Optional context from a file the candidate attached mid-interview.
    const fileContext = (input.file_context || '').trim();
    const fileContextBlock = fileContext
      ? `\n\nREFERENCE DOCUMENT (attached by the candidate):\n${fileContext}\n\nINSTRUCTION: Carefully read this reference document. It may contain a job description, specification, or notes the candidate wants the interview grounded in. Use it to shape your questions and feedback — for example, ask about specific responsibilities, skills, or requirements it mentions, or evaluate the candidate against it. Do not tell the candidate you were given a file; simply incorporate it naturally.`
      : '';

    const difficulty = (interview.difficulty || 'INTERMEDIATE').toUpperCase();
    const difficultyGuide = {
      BEGINNER: 'Ask approachable, foundational questions. Offer gentle hints when the candidate struggles and explain concepts clearly after their answer.',
      INTERMEDIATE: 'Ask solid mid-level questions with light probing follow-ups. Push for concrete examples and trade-off reasoning.',
      SENIOR: 'Ask advanced, ambiguous questions. Probe deeply, challenge assumptions, require trade-off analysis, scale/design reasoning, and leadership judgment. Keep the bar high.',
    }[difficulty] || 'Ask solid mid-level questions with light probing follow-ups.';

    const interviewTypeGuide = {
      TECHNICAL: 'Focus on technical skills, coding/architecture reasoning, debugging, and engineering judgment.',
      BEHAVIORAL: 'Use STAR-style behavioral questions about past experiences, teamwork, conflict, and leadership.',
      SYSTEM_DESIGN: 'Run a system design interview: gather requirements, propose architecture, discuss trade-offs, scaling, and failure modes.',
      MIXED: 'Blend behavioral and technical questions naturally, as a hiring manager would.',
      CASE_STUDY: 'Give business/product case prompts and evaluate structured, data-driven reasoning.',
    }[interview.interview_type] || 'Blend behavioral and technical questions naturally.';

    const systemPrompt = `You are an expert interviewer conducting a ${interview.interview_type} interview for the role of ${interview.role}${interview.company ? ` at ${interview.company}` : ''} at ${difficulty} difficulty.${jdContext}${fileContextBlock}

Interviewer persona rules:
- Stay in character as a professional, friendly, but rigorous interviewer. Never break character.
- ${interviewTypeGuide}
- Difficulty calibration (${difficulty}): ${difficultyGuide}
- Ask ONE clear question at a time. Do not list multiple questions in a single turn.
- After the candidate answers, give brief feedback or a light follow-up probing for depth, then move to the next question. If the answer is vague, push once for specifics or an example.
- Track the arc: opening/screening questions first, then deeper topic questions, then a closing question. Target roughly 6-8 questions per session, then signal you are wrapping up.
- Do NOT reveal scores, ratings, or a verdict during the session. Keep the conversation natural and interview-like.
- Keep each response concise: 1-2 short paragraphs max. Use "Great, let's move on."-style transitions when appropriate.`;

    // Map message history to format expected by Groq/LLM
    // We stringify the conversation history for the text prompt
    const conversationHistory = messages.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n\n');
    
    const userPrompt = `Conversation History:\n${conversationHistory}\n\nProvide the next response as the Interviewer. Ask a single focused question or a brief follow-up.`;

    // Call Groq (Text mode)
    const aiResponseContent = await aiClient.callText(
      systemPrompt,
      userPrompt,
      { temperature: 0.7, max_tokens: 500 }
    );

    const aiMessage = {
      role: 'assistant',
      content: aiResponseContent,
      timestamp: new Date().toISOString()
    };
    
    messages.push(aiMessage);

    const questionCount = interview.question_count + 1;

    // Update interview in DB
    const { error: updateError } = await client
      .from('mock_interviews')
      .update({
        messages,
        question_count: questionCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', interviewId);

    if (updateError) {
      console.error('Failed to update messages:', updateError);
      throw new Error('Database update failed');
    }

    return c.json({
      message: aiMessage,
      question_count: questionCount
    }, 200);

  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError ||
      error instanceof NotFoundError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /interviews/message:', error);
    return c.json(
      { 
        error: 'Failed to process message', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined
      },
      500
    );
  }
});

Deno.serve(app.fetch);
