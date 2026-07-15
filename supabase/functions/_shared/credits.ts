import { createServiceClient, createAuthClient } from './supabase-client.ts';
import { InsufficientCreditsError } from './errors.ts';

/**
 * Credit deduction and checking utilities
 * All credit operations are atomic and race-condition safe via PostgreSQL functions
 */

const CREDIT_COSTS = {
  JD_ANALYSIS: 1,
  RESUME_GENERATION: 3,
  RESUME_SECTION_REWRITE: 1,
  RESUME_ATS_SCORING: 1,
  COVER_LETTER: 2,
  MOCK_INTERVIEW: 5,
  LINKEDIN_ANALYSIS: 2,
  LINKEDIN_SECTION_OPTIMIZE: 2,
  LINKEDIN_ENGAGEMENT_PLAN: 2,   // Optional 30-day plan add-on
  LINKEDIN_SCRAPE: 2,
  COMPANY_RESEARCH: 2,
  PROFILE_ANALYSIS: 2,
  ELEVATOR_PITCH: 1,
  ROADMAP_GENERATION: 5,
  ASK_AI_QUESTION: 2,
} as const;


export type CreditType = keyof typeof CREDIT_COSTS;

/**
 * Check if user has enough credits for an operation
 */
export async function checkCredits(
  userId: string,
  costType: CreditType,
  req?: Request
): Promise<boolean> {
  const cost = CREDIT_COSTS[costType];
  const client = req ? createAuthClient(req) : createServiceClient();

  const { data: user, error } = await client
    .from('users')
    .select('ai_credits')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user credits: ${error.message}`);
  }

  return (user?.ai_credits || 0) >= cost;
}

/**
 * Get current credit balance for user
 */
export async function getCreditsBalance(userId: string): Promise<number> {
  const client = createServiceClient();

  const { data: user, error } = await client
    .from('users')
    .select('ai_credits')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch credits: ${error.message}`);
  }

  return user?.ai_credits || 0;
}

/**
 * Deduct credits from user account (atomic operation)
 * Returns true if successful, throws InsufficientCreditsError if not enough
 */
export async function deductCredits(
  userId: string,
  costType: CreditType,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const cost = CREDIT_COSTS[costType];
  const client = createServiceClient();

  // First check balance
  const balance = await getCreditsBalance(userId);
  if (balance < cost) {
    throw new InsufficientCreditsError(cost, balance);
  }

  // Perform atomic deduction via RPC
  const { data, error } = await client.rpc('deduct_credits', {
    user_uuid: userId,
    amount: cost,
  });

  if (error) {
    throw new Error(`Failed to deduct credits: ${error.message}`);
  }

  if (!data) {
    const newBalance = await getCreditsBalance(userId);
    throw new InsufficientCreditsError(cost, newBalance);
  }

  return true;
}

/**
 * Record a credit usage event (for analytics, non-blocking)
 */
export async function logCreditEvent(
  userId: string,
  eventType: CreditType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const client = createServiceClient();
  const cost = CREDIT_COSTS[eventType];

  await client.from('usage_events').insert({
    user_id: userId,
    event: eventType,
    credits_used: cost,
    metadata: metadata || null,
  });
}

/**
 * Free tier check: do users get unlimited credits for this operation?
 * Currently, onboarding allows 1 free JD analysis
 */
export function isFreeOperation(costType: CreditType, isOnboarding: boolean): boolean {
  if (isOnboarding && costType === 'JD_ANALYSIS') {
    return true;
  }
  return false;
}

export { CREDIT_COSTS };
