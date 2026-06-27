import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, NotFoundError } from '../_shared/errors.ts';

const app = new Hono();

app.use('/*', cors());

/**
 * GET /profile/get
 * Returns full user profile with completeness score
 */
app.get('/*', async (c: any) => {
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

    // Get user profile
    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new NotFoundError('User profile not found');
    }

    // Calculate completeness
    const completeness = calculateProfileCompleteness(profile);

    return c.json({
      profile: {
        ...profile,
        profile_completeness: completeness,
      },
    });
  } catch (error: any) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /profile/get:', error);
    return c.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      500
    );
  }
});

/**
 * Calculate profile completeness as percentage (0-100)
 * Weights different sections:
 * - Contact info: 10%
 * - Work history: 30%
 * - Skills: 20%
 * - Education: 15%
 * - Projects/Portfolio: 15%
 * - Additional (certifications, awards): 10%
 */
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
