import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, ValidationError, NotFoundError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

const MessageInput = z.object({
  content: z.string().min(1).max(2000),
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

    const url = new URL(c.req.url);
    const parts = url.pathname.split('/');
    const interviewId = parts[parts.length - 2];
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

    const systemPrompt = `You are an expert interviewer conducting a ${interview.interview_type} interview for the role of ${interview.role}${interview.company ? ` at ${interview.company}` : ''}.${jdContext}
Maintain a professional, encouraging, yet critical tone. Ask clear, targeted follow-up questions or proceed to the next topic. Do not break character. Do not provide the score yet, just continue the conversation naturally. Keep your responses concise (1-2 paragraphs max).`;

    // Map message history to format expected by Groq/LLM
    // We stringify the conversation history for the text prompt
    const conversationHistory = messages.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n\n');
    
    const userPrompt = `Conversation History:\n${conversationHistory}\n\nProvide the next response as the Interviewer.`;

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
