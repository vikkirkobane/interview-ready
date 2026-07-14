import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, NotFoundError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { ATS_SCORE_SCHEMA } from '../_shared/zod-schemas.ts';
import { deductCredits } from '../_shared/credits.ts';

const app = new Hono();

app.use('/*', cors());

/**
 * POST /resumes/score
 * Score a resume for ATS compatibility
 * Analyzes: keyword match, formatting, structure, readability, completeness
 */
app.post('/:resumeId/score', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const resumeId = c.req.param('resumeId');

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    // Deduct 1 credit for scoring
    try {
      await deductCredits(user.id, 'RESUME_ATS_SCORING', { resume_id: resumeId });
    } catch (error: any) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }
      throw new Error(`Credit deduction failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Get resume with content
    const { data: resume, error: resumeError } = await client
      .from('resumes')
      .select('*, resume_contents(*)')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (resumeError || !resume) {
      throw new NotFoundError('Resume not found');
    }

    const content = resume.resume_contents;
    if (!content) {
      throw new NotFoundError('Resume content not found');
    }

    // Get job analysis if linked (for keyword comparison)
    let jobAnalysis = null;
    if (resume.job_application_id) {
      const { data: job } = await client
        .from('job_applications')
        .select('analysis_data')
        .eq('id', resume.job_application_id)
        .single();

      jobAnalysis = job?.analysis_data;
    }

    // Format resume content for analysis
    const resumeText = formatResumeForAnalysis(content);

    // Call AI to score resume
    const systemPrompt = `You are an ATS (Applicant Tracking System) specialist. 
Score a resume on these 5 dimensions:
1. Keyword Match (0-100): Does it contain required keywords? Use provided job description if available.
2. Formatting (0-100): Is it properly formatted? Check for proper sections, bullet points, dates.
3. Structure (0-100): Are sections well-organized? Experience, education, skills in right order?
4. Readability (0-100): Is it scannable? Good fonts, spacing, clear hierarchy?
5. Completeness (0-100): Are all key sections filled? No gaps or missing info?

Return a JSON response with overall_score (average of 5 dimensions), individual scores, strengths, weaknesses, and improvements.
Always return valid JSON matching the ATS_SCORE_SCHEMA.`;

    const jobContext = jobAnalysis
      ? `\n\nJob Description Requirements (for keyword matching):\nRequired Skills: ${jobAnalysis.required_skills?.map((s: any) => s.skill).join(', ')}\nKey Responsibilities: ${jobAnalysis.key_responsibilities?.join(', ')}`
      : '';

    const userPrompt = `Score this resume for ATS compatibility:\n\n${resumeText}${jobContext}`;

    const score = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      ATS_SCORE_SCHEMA,
      { temperature: 0.3, max_tokens: 2000 }
    );

    // Save score to database
    await client
      .from('resumes')
      .update({
        ats_score: score.overall_score,
        ats_score_details: score,
        last_scored_at: new Date().toISOString(),
      })
      .eq('id', resumeId);

    return c.json(
      {
        resume_id: resumeId,
        score,
        message: 'Resume scored successfully',
      },
      200
    );
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError ||
      error instanceof InsufficientCreditsError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /resumes/score:', error);
    return c.json(
      { error: 'Failed to score resume', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

/**
 * POST /resumes/:resumeId/section-rewrite
 * Rewrite a specific section using AI
 */
app.post('/:resumeId/section-rewrite', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);
    const resumeId = c.req.param('resumeId');

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    // Deduct 1 credit per rewrite
    try {
      await deductCredits(user.id, 'RESUME_SECTION_REWRITE', { resume_id: resumeId });
    } catch (error: any) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }
      throw new Error(`Credit deduction failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const body = await c.req.json();
    const { section, tone = 'professional', instructions = '' } = body;

    if (!section) {
      return c.json({ error: 'Missing section parameter', code: 'VALIDATION_ERROR' }, 400);
    }

    // Get resume
    const { data: resume, error: resumeError } = await client
      .from('resumes')
      .select('*, resume_contents(*)')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (resumeError || !resume) {
      throw new NotFoundError('Resume not found');
    }

    const content = resume.resume_contents;
    if (!content) {
      throw new NotFoundError('Resume content not found');
    }

    // Get section content
    const sectionContent = (content as any)[section];
    if (!sectionContent) {
      return c.json(
        { error: `Section '${section}' not found in resume`, code: 'VALIDATION_ERROR' },
        400
      );
    }

    // Call AI to rewrite section
    const systemPrompt = `You are a professional resume writer. 
Rewrite the provided resume section to be:
- More impactful and quantifiable
- ATS-friendly
- Professional tone: "${tone}"
${instructions ? `\nAdditional instructions: ${instructions}` : ''}

Return ONLY the rewritten section content, no JSON wrapper.`;

    const userPrompt = `Rewrite this resume section:\n\n${JSON.stringify(sectionContent, null, 2)}`;

    const rewritten = await aiClient.callText(systemPrompt, userPrompt, {
      temperature: 0.5,
      max_tokens: 2000,
    });

    // Update section in resume content
    const updatedContent = {
      ...content,
      [section]: rewritten,
    };

    await client
      .from('resume_contents')
      .update(updatedContent)
      .eq('resume_id', resumeId);

    return c.json(
      {
        resume_id: resumeId,
        section,
        rewritten,
        message: `${section} rewritten successfully`,
      },
      200
    );
  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError ||
      error instanceof InsufficientCreditsError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /resumes/section-rewrite:', error);
    return c.json(
      { error: 'Failed to rewrite section', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

/**
 * Format resume content into readable text for AI analysis
 */
function formatResumeForAnalysis(content: any): string {
  const lines: string[] = [];

  lines.push(`# ${content.name}`);
  lines.push(`## ${content.title}`);
  lines.push('');

  // Contact info
  if (content.contact?.email) {
    lines.push(`Email: ${content.contact.email}`);
  }
  if (content.contact?.phone) {
    lines.push(`Phone: ${content.contact.phone}`);
  }
  if (content.contact?.location) {
    lines.push(`Location: ${content.contact.location}`);
  }
  lines.push('');

  // Summary
  if (content.summary) {
    lines.push('## PROFESSIONAL SUMMARY');
    lines.push(content.summary);
    lines.push('');
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    lines.push('## EXPERIENCE');
    content.experience.forEach((job: any) => {
      lines.push(`${job.title} at ${job.company} (${job.date_range || job.start_date || ''})`);
      if (job.bullets && Array.isArray(job.bullets)) {
        job.bullets.forEach((bullet: string) => {
          lines.push(`- ${bullet}`);
        });
      }
      lines.push('');
    });
  }

  // Education
  if (content.education && content.education.length > 0) {
    lines.push('## EDUCATION');
    content.education.forEach((edu: any) => {
      const degreeLine = [edu.degree, edu.institution || edu.school, edu.year].filter(Boolean).join(' — ');
      lines.push(degreeLine);
      if (edu.note || edu.gpa) {
        lines.push(`${edu.note || 'GPA: ' + edu.gpa}`);
      }
      lines.push('');
    });
  }

  // Skills
  if (content.skills && Array.isArray(content.skills)) {
    lines.push('## SKILLS');
    content.skills.forEach((skillGroup: any) => {
      if (skillGroup.category && skillGroup.items) {
        lines.push(`${skillGroup.category}: ${skillGroup.items.join(', ')}`);
      } else if (typeof skillGroup === 'string') {
        lines.push(`- ${skillGroup}`);
      }
    });
    lines.push('');
  } else if (content.skills && typeof content.skills === 'object') {
    lines.push('## SKILLS');
    Object.entries(content.skills).forEach(([category, skills]: any) => {
      if (Array.isArray(skills)) {
        lines.push(`${category}: ${skills.join(', ')}`);
      }
    });
    lines.push('');
  }

  // Projects
  if (content.projects && content.projects.length > 0) {
    lines.push('## PROJECTS');
    content.projects.forEach((project: any) => {
      lines.push(`${project.name}: ${project.description}`);
      if (project.url) {
        lines.push(`URL: ${project.url}`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}

Deno.serve(app.fetch);
