import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, InsufficientCreditsError } from '../_shared/errors.ts';
import { aiClient } from '../_shared/ai-client.ts';
import { checkCredits, deductCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();
app.use('/*', cors());

const SGAI_API_KEY = Deno.env.get('SGAI_API_KEY');

const reqSchema = z.object({
  company_url: z.string().url(),
  context: z.string().optional(), // e.g. "I'm interviewing for a Senior PM role"
});

// Output schema validated by Zod
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

app.post('/', async (c) => {
  const supabaseClient = createAuthClient(c.req.raw);
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const body = await c.req.json();
  const { company_url, context } = reqSchema.parse(body);

  if (!SGAI_API_KEY) {
    return c.json({ error: 'SGAI_API_KEY is not configured on the server.' }, 500);
  }

  const hasCredits = await checkCredits(user.id, 'COMPANY_RESEARCH');
  if (!hasCredits) {
    throw new InsufficientCreditsError(2, 0);
  }

  // Step 1: Scrape company website
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

  let scrapedData: any = {};
  if (scrapeResponse.ok) {
    const scrapeResult = await scrapeResponse.json();
    scrapedData = scrapeResult.data ?? scrapeResult.result ?? scrapeResult;
  } else {
    console.warn('Scrape failed, proceeding with AI analysis on URL only:', await scrapeResponse.text());
  }

  // Step 2: AI deep analysis
  const systemPrompt = `You are a senior career strategist and business analyst helping a job seeker research a company before an interview or job application. 
Your job is to provide a comprehensive, insightful company research report based on the scraped data provided. 
Focus on what matters most to a job seeker: culture fit, growth trajectory, interview preparation, and smart questions to ask.
Always be honest — flag potential red flags if you see them.
Return ONLY valid JSON matching the exact schema provided. No markdown.`;

  const userPrompt = `Company URL: ${company_url}
${context ? `User Context: ${context}` : ''}

Scraped Company Data:
${JSON.stringify(scrapedData, null, 2)}

Perform a thorough company research analysis and return a JSON object with these exact fields:
{
  "company_name": "string — the company name",
  "tagline": "string — their main tagline or value proposition",
  "overview": "string — 2-3 sentence company overview",
  "industry": "string",
  "company_size": "string — e.g. '51-200 employees' or 'Enterprise'",
  "headquarters": "string",
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
  "red_flags": ["array of potential concerns — be honest, can be empty"],
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
    { max_tokens: 3000, temperature: 0.4 }
  );

  await deductCredits(user.id, 'COMPANY_RESEARCH');

  return c.json({ data: result, message: 'Company research complete' });
});

Deno.serve(app.fetch);
