/**
 * Standardized Job URL Scraper Utility for Supabase Edge Functions
 * Uses ScrapeGraphAI to extract structured job posting data.
 */

export interface ScrapedJobData {
  job_title?: string;
  company?: string;
  location?: string;
  job_type?: string;
  salary?: string;
  description?: string;
  responsibilities?: string[];
  required_qualifications?: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  benefits?: string[];
}

export interface ScrapeJobResult {
  success: boolean;
  extractedText: string;
  data?: ScrapedJobData;
  error?: string;
}

/**
 * Normalizes a URL by trimming whitespace and ensuring http/https protocol.
 */
export function normalizeJobUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  let trimmed = url.trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.href;
  } catch {
    return trimmed;
  }
}

/**
 * Scrapes a job listing from a URL using ScrapeGraphAI.
 * Returns structured content and formatted markdown text.
 */
export async function scrapeJobUrl(url: string): Promise<ScrapeJobResult> {
  const normalizedUrl = normalizeJobUrl(url);
  if (!normalizedUrl) {
    return {
      success: false,
      extractedText: '',
      error: 'Invalid or missing job URL',
    };
  }

  const SGAI_API_KEY = Deno.env.get('SGAI_API_KEY');
  if (!SGAI_API_KEY) {
    return {
      success: false,
      extractedText: '',
      error: 'SGAI_API_KEY is not configured',
    };
  }

  try {
    const scrapePayload = {
      url: normalizedUrl,
      prompt: `Extract the complete job description from this page. Include: job title, company name, location, job type (remote/hybrid/onsite), salary range if mentioned, required qualifications, responsibilities, required skills, preferred skills, benefits, and any other relevant job details. Return all text content in a structured, readable format.`,
      schema: {
        type: 'object',
        properties: {
          job_title: { type: 'string' },
          company: { type: 'string' },
          location: { type: 'string' },
          job_type: { type: 'string' },
          salary: { type: 'string' },
          description: { type: 'string' },
          responsibilities: { type: 'array', items: { type: 'string' } },
          required_qualifications: { type: 'array', items: { type: 'string' } },
          required_skills: { type: 'array', items: { type: 'string' } },
          preferred_skills: { type: 'array', items: { type: 'string' } },
          benefits: { type: 'array', items: { type: 'string' } },
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
      const errorText = await scrapeResponse.text().catch(() => 'Unknown error');
      console.error(`[Scraper] ScrapeGraphAI returned status ${scrapeResponse.status}:`, errorText);
      return {
        success: false,
        extractedText: '',
        error: `Scraper error (${scrapeResponse.status})`,
      };
    }

    const scrapeResult = await scrapeResponse.json();
    const extractedData: ScrapedJobData = scrapeResult.data ?? scrapeResult.result ?? scrapeResult;

    // Convert structured data into clean, readable text
    const textSections = [
      extractedData.job_title ? `Job Title: ${extractedData.job_title}` : '',
      extractedData.company ? `Company: ${extractedData.company}` : '',
      extractedData.location ? `Location: ${extractedData.location}` : '',
      extractedData.job_type ? `Job Type: ${extractedData.job_type}` : '',
      extractedData.salary ? `Salary: ${extractedData.salary}` : '',
      extractedData.description ? `\nDescription:\n${extractedData.description}` : '',
      extractedData.responsibilities?.length ? `\nResponsibilities:\n${extractedData.responsibilities.map((r: string) => `- ${r}`).join('\n')}` : '',
      extractedData.required_qualifications?.length ? `\nRequired Qualifications:\n${extractedData.required_qualifications.map((q: string) => `- ${q}`).join('\n')}` : '',
      extractedData.required_skills?.length ? `\nRequired Skills:\n${extractedData.required_skills.map((s: string) => `- ${s}`).join('\n')}` : '',
      extractedData.preferred_skills?.length ? `\nPreferred Skills:\n${extractedData.preferred_skills.map((s: string) => `- ${s}`).join('\n')}` : '',
      extractedData.benefits?.length ? `\nBenefits:\n${extractedData.benefits.map((b: string) => `- ${b}`).join('\n')}` : '',
    ].filter(Boolean);

    let scrapedText = textSections.join('\n').trim();

    // Check if extracted content is sufficient
    if (!scrapedText || scrapedText.length < 80) {
      console.warn('[Scraper] Insufficient content extracted from URL:', normalizedUrl);
      return {
        success: false,
        extractedText: '',
        data: extractedData,
        error: 'Insufficient text extracted from page',
      };
    }

    // Safeguard max character limit for AI prompt tokens (15,000 chars max)
    if (scrapedText.length > 15000) {
      scrapedText = scrapedText.substring(0, 15000) + '\n\n[Content truncated for length]';
    }

    return {
      success: true,
      extractedText: scrapedText,
      data: extractedData,
    };
  } catch (err: any) {
    console.error('[Scraper] Exception while scraping URL:', err.message);
    return {
      success: false,
      extractedText: '',
      error: err.message || 'Scraping failed',
    };
  }
}
