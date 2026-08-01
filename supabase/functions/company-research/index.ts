import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, InsufficientCreditsError, ValidationError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { checkCredits, deductCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();
app.use('/*', cors());

const SGAI_API_KEY = Deno.env.get('SGAI_API_KEY');

const reqSchema = z.object({
  company_url: z.string().url(),
  context: z.string().optional(),
});

const CompanyResearchOutputSchema = z.object({
  company_name: z.string(),
  tagline: z.string().optional(),
  overview: z.string(),
  industry: z.string(),
  company_size: z.string().optional(),
  headquarters: z.string().optional(),
  founded: z.string().optional(),
  business_model: z.string(),
  key_products_services: z.array(z.string()),
  mission_values: z.string(),
  recent_news: z.array(z.object({
    headline: z.string(),
    summary: z.string(),
  })).optional(),
  financials: z.string().optional(),
  culture_insights: z.string(),
  tech_stack: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  growth_signals: z.array(z.string()),
  red_flags: z.array(z.string()),
  interview_talking_points: z.array(z.string()),
  smart_questions_to_ask: z.array(z.string()),
  cultural_fit_score: z.number().min(0).max(100).optional(),
  opportunity_score: z.number().min(0).max(100),
  summary_verdict: z.string(),
});

app.post('/*', async (c: any) => {
  try {
    const supabaseClient = createAuthClient(c.req.raw);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const body = await c.req.json();
    let company_url: string;
    let context: string | undefined;

    try {
      const parsed = reqSchema.parse(body);
      company_url = parsed.company_url;
      context = parsed.context;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid company research input', {
          errors: error.errors.map((e: any) => ({ path: e.path.join('.'), message: e.message })),
        });
      }
      throw error;
    }

    if (!SGAI_API_KEY) {
      throw new ValidationError('SGAI_API_KEY is not configured on the server.');
    }

    const hasCredits = await checkCredits(user.id, 'COMPANY_RESEARCH');
    if (!hasCredits) {
      throw new InsufficientCreditsError(2, 0);
    }

    // Step 1: Scrape company website (non-fatal — AI proceeds with URL-only if scraping fails)
    let scrapedData: any = {};
    try {
      const scrapePayload = {
        url: company_url,
        prompt: `You are a business intelligence analyst. Extract comprehensive company information from this website.
Extract: company name, tagline, what they do, their products/services, mission and values, company size if mentioned, industry, headquarters location, founding year, any tech stack mentioned, team or culture information, pricing models, notable clients or partnerships, recent news or blog posts.
Be thorough and extract as much factual data as possible.`,
        schema: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            tagline: { type: 'string' },
            description: { type: 'string' },
            industry: { type: 'string' },
            company_size: { type: 'string' },
            headquarters: { type: 'string' },
            founded: { type: 'string' },
            products_services: { type: 'array', items: { type: 'string' } },
            mission: { type: 'string' },
            values: { type: 'array', items: { type: 'string' } },
            tech_stack: { type: 'array', items: { type: 'string' } },
            notable_clients: { type: 'array', items: { type: 'string' } },
            recent_news: { type: 'array', items: { type: 'string' } },
            pricing_model: { type: 'string' },
            culture_info: { type: 'string' },
          },
        },
      };

      const scrapeResponse = await fetch('https://v2-api.scrapegraphai.com/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SGAI-APIKEY': SGAI_API_KEY,
        },
        body: JSON.stringify(scrapePayload),
      });

      if (scrapeResponse.ok) {
        const scrapeResult = await scrapeResponse.json();
        scrapedData = scrapeResult.data ?? scrapeResult.result ?? scrapeResult;
        console.log('Scrape successful for:', company_url);
      } else {
        console.warn('Scrape failed, proceeding with AI analysis on URL only:', await scrapeResponse.text());
      }
    } catch (scrapeErr: any) {
      console.warn('Scrape threw an exception (non-fatal):', scrapeErr.message);
    }

    // Step 2: AI deep analysis
    const systemPrompt = `You are a senior career strategist and business intelligence analyst helping a job seeker research a company before an interview or job application.

Your job is to produce a comprehensive, insightful company research report from the scraped website data provided. Focus on what matters most to a job seeker: culture fit, growth trajectory, interview preparation, and smart questions to ask.

STRICT OUTPUT RULES:
1. Return ONLY valid JSON. No markdown, no code fences, no commentary outside the JSON object.
2. Every required field must be present and non-empty. If a piece of data is unknown, use a concise, professional placeholder such as "Not publicly disclosed" — never invent facts, and never omit a required field.
3. Use proper capitalization everywhere: company name in Title Case (e.g. "Vercel", "Stripe"), people/place names capitalized, and every sentence capitalized. Do not return lowercase names or text.
4. Be honest and balanced. Flag genuine red flags if you see them; if you see none, return an empty array [].
5. Keep list items concise, specific, and free of promotional fluff. Use full sentences for overview, culture, mission, and verdict fields.
6. Scores must be integers between 0 and 100. Base them on concrete signals from the data.
7. Base everything on the scraped data first, then reasonable domain knowledge. Never state speculation as fact.

EXAMPLE OF THE REQUIRED OUTPUT SHAPE:
{
  "company_name": "Stripe",
  "tagline": "Online payment processing for internet businesses",
  "overview": "Stripe is a technology company that builds economic infrastructure for the internet. Its payments platform serves businesses of every size...",
  "industry": "Fintech / Payments",
  "company_size": "5,000+ employees",
  "headquarters": "Dublin, Ireland",
  "founded": "2010",
  "business_model": "Payments SaaS — revenue from transaction fees",
  "key_products_services": ["Payments", "Billing", "Connect"],
  "mission_values": "To increase the GDP of the internet...",
  "recent_news": [{ "headline": "Stripe launches new tool", "summary": "..." }],
  "financials": "Privately held, valued at $65B",
  "culture_insights": "Fast-paced, engineering-led...",
  "tech_stack": ["Ruby", "Go", "React"],
  "competitors": ["Adyen", "PayPal", "Square"],
  "growth_signals": ["Rapid revenue growth", "Global expansion"],
  "red_flags": [],
  "interview_talking_points": ["...", "..."],
  "smart_questions_to_ask": ["...", "..."],
  "cultural_fit_score": 78,
  "opportunity_score": 85,
  "summary_verdict": "A strong opportunity for candidates who value high-growth engineering culture..."
}`;

    const userPrompt = `Company URL: ${company_url}
${context ? `User Context: ${context}` : ''}

Scraped Company Data:
${JSON.stringify(scrapedData, null, 2)}

Perform a thorough company research analysis and return a JSON object with these exact fields:
{
  "company_name": "string — the company name in Title Case",
  "tagline": "string — their main tagline or value proposition",
  "overview": "string — 2-3 sentence company overview",
  "industry": "string — their sector",
  "company_size": "string — e.g. '51-200 employees' or 'Enterprise'",
  "headquarters": "string — HQ city and country",
  "founded": "string — year if known",
  "business_model": "string — how they make money (SaaS, marketplace, services, etc.)",
  "key_products_services": ["array of their main offerings"],
  "mission_values": "string — their stated mission and core values",
  "recent_news": [{ "headline": "string", "summary": "string" }],
  "financials": "string — funding stage, revenue signals, public/private",
  "culture_insights": "string — what working there is likely like",
  "tech_stack": ["array of technologies they use"],
  "competitors": ["array of main competitors"],
  "growth_signals": ["array of positive growth indicators"],
  "red_flags": ["array of potential concerns — be honest, can be an empty array []"],
  "interview_talking_points": ["array of 5-7 things the user should bring up or demonstrate knowledge of in an interview"],
  "smart_questions_to_ask": ["array of 5 insightful questions the user should ask the interviewer"],
  "cultural_fit_score": number 0-100 based on signals,
  "opportunity_score": number 0-100 overall opportunity rating,
  "summary_verdict": "string — 2-3 sentence actionable verdict for the job seeker"
}`;

    const result = await aiClient.callWithJson(
      systemPrompt,
      userPrompt,
      CompanyResearchOutputSchema,
      { max_tokens: 4000, temperature: 0.4 }
    );

    await deductCredits(user.id, 'COMPANY_RESEARCH');

    return c.json({ data: result, message: 'Company research complete' });

  } catch (error: any) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ValidationError ||
      error instanceof InsufficientCreditsError
    ) {
      return c.json({ error: error.message, code: error.code }, error.status);
    }

    console.error('Error in /company-research:', error);
    return c.json(
      {
        error: 'Failed to complete company research',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? { message: error.message } : undefined,
      },
      500
    );
  }
});

Deno.serve(app.fetch);
