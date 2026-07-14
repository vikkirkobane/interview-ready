import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, NotFoundError, ValidationError } from '../_shared/errors.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();

app.use('/*', cors());

/**
 * Profile update schema - all fields optional for partial updates
 */
const UpdateProfileSchema = z.object({
  phone: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
  portfolio_url: z.string().url().optional(),
  summary: z.string().optional(),
  current_role: z.string().optional(),
  years_experience: z.number().int().min(0).optional(),
  target_roles: z.array(z.string()).optional(),
  target_industries: z.array(z.string()).optional(),
  technical_skills: z.array(z.string()).optional(),
  soft_skills: z.array(z.string()).optional(),
  work_preference: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  open_to_relocation: z.boolean().optional(),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    field: z.string(),
    start_date: z.string(),
    end_date: z.string().nullable(),
    gpa: z.string().optional(),
  })).optional(),
  work_history: z.array(z.object({
    company: z.string(),
    title: z.string(),
    start_date: z.string(),
    end_date: z.string().nullable(),
    current: z.boolean(),
    description: z.string(),
  })).optional(),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    date: z.string().optional(),
  })).optional(),
});

type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/**
 * PUT /profile/update
 * Updates user profile fields
 * Validates input and recalculates profile completeness
 */
app.put('/*', async (c: any) => {
  try {
    const client = createAuthClient(c.req.raw);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError('No active session');
    }

    // Parse and validate request body
    const body = await c.req.json();
    let updates: UpdateProfileInput;

    try {
      updates = UpdateProfileSchema.parse(body);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid profile data', {
          errors: error.errors,
        });
      }
      throw error;
    }

    // Update or create profile
    const { data: updated, error: updateError } = await client
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    if (!updated) {
      throw new NotFoundError('User profile not found');
    }

    // Calculate new completeness
    const completeness = calculateProfileCompleteness(updated);

    // Update completeness score
    await client
      .from('user_profiles')
      .update({ profile_completeness: completeness })
      .eq('user_id', user.id);

    return c.json({
      profile: {
        ...updated,
        profile_completeness: completeness,
      },
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError || 
        error instanceof NotFoundError || 
        error instanceof ValidationError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /profile/update:', error);
    return c.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

function calculateProfileCompleteness(profile: Record<string, unknown>): number {
  let score = 0;

  // Contact info (10%)
  if (profile.phone) score += 2;
  if (profile.location) score += 2;
  if (profile.linkedin_url) score += 3;
  if (profile.portfolio_url) score += 3;

  // Work history (30%)
  const workHistory = (profile.work_history as any[]) || [];
  if (workHistory.length > 0) {
    const workScore = Math.min(workHistory.length * 5, 30);
    score += workScore;
  }

  // Skills (20%)
  const technicalSkills = (profile.technical_skills as any[]) || [];
  const softSkills = (profile.soft_skills as any[]) || [];
  const totalSkills = technicalSkills.length + softSkills.length;
  if (totalSkills >= 5) {
    score += 20;
  } else if (totalSkills > 0) {
    score += (totalSkills / 5) * 20;
  }

  // Education (15%)
  const education = (profile.education as any[]) || [];
  if (education.length > 0) {
    score += 15;
  }

  // Projects/Portfolio (15%)
  const projects = (profile.projects as any[]) || [];
  const portfolio = profile.portfolio_url;
  if (projects.length > 0 || portfolio) {
    score += 15;
  }

  // Additional (10%)
  const certifications = (profile.certifications as any[]) || [];
  const awards = (profile.awards as any[]) || [];
  if (certifications.length > 0) score += 5;
  if (awards.length > 0) score += 5;

  return Math.round(Math.min(score, 100));
}

Deno.serve(app.fetch);
