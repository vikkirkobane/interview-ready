import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createAuthClient } from '../_shared/supabase-client.ts';
import { UnauthorizedError, InsufficientCreditsError } from '../_shared/errors.ts';
import { checkCredits, deductCredits } from '../_shared/credits.ts';
import { z } from 'npm:zod@3.22.4';

const app = new Hono();
app.use('/*', cors());

const SGAI_API_KEY = Deno.env.get('SGAI_API_KEY');

const reqSchema = z.object({
  linkedin_url: z.string().url(),
});

app.post('/', async (c) => {
  const supabaseClient = createAuthClient(c.req.raw);
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const body = await c.req.json();
  const { linkedin_url } = reqSchema.parse(body);

  if (!SGAI_API_KEY) {
    return c.json({ error: 'SGAI_API_KEY is not configured on the server.' }, 500);
  }

  const hasCredits = await checkCredits(user.id, 'LINKEDIN_SCRAPE');
  if (!hasCredits) {
    throw new InsufficientCreditsError(2, 0);
  }

  const scrapePayload = {
    url: linkedin_url,
    prompt: `Extract the following details from this LinkedIn profile:
1. headline: The professional headline under the person's name.
2. about: The content of the 'About' or 'Summary' section.
3. experience: A list of work experiences. For each, include 'title', 'company', and 'description'.
4. skills: A list of string skills from the skills section.
Return the output strictly as JSON matching the provided schema.`,
    schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        about: { type: 'string' },
        experience: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              company: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        skills: {
          type: 'array',
          items: { type: 'string' },
        },
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

  if (!scrapeResponse.ok) {
    const errorText = await scrapeResponse.text();
    console.error('ScrapeGraphAI error:', errorText);
    return c.json({ error: `Failed to scrape LinkedIn profile: ${scrapeResponse.statusText}` }, 502);
  }

  const scrapeResult = await scrapeResponse.json();
  const extractedData = scrapeResult.data ?? scrapeResult.result ?? scrapeResult;

  await deductCredits(user.id, 'LINKEDIN_SCRAPE');

  return c.json({ data: extractedData, message: 'Profile successfully scraped' });
});

Deno.serve(app.fetch);
