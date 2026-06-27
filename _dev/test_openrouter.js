const fetch = require('node-fetch'); // or using standard fetch since Node 18
const { z } = require('zod');

async function test() {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY; // The user has this set globally or I can tell them to run it
  
  if (!openrouterApiKey) {
    console.error("No OPENROUTER_API_KEY found in process.env");
    return;
  }

  const systemPrompt = `You are an expert career coach and cover letter writer.
Create a highly tailored, compelling cover letter based on the provided candidate profile, resume, and job description context.
Adhere strictly to the requested tone: PROFESSIONAL.
Ensure the response is a valid JSON with the exact following structure:
{
  "tone": "the selected tone",
  "company_name": "extracted company name",
  "job_title": "extracted job title",
  "content": "the full cover letter text as a single string",
  "opening": "the greeting string",
  "body_paragraphs": ["paragraph 1", "paragraph 2"],
  "closing": "the sign-off string"
}
Do not use placeholders like [Your Name] if the information is available in the context.
Return ONLY raw JSON, do not use Markdown code blocks.`;

  const userPrompt = `Target Role: Unknown Role at Unknown Company
Tone: PROFESSIONAL
Context Information:
Job Description: Looking for a software engineer.

Generate a standout cover letter for this application.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages,
        temperature: 0.6,
        max_tokens: 3000,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("--- RAW OUTPUT FROM OPENROUTER ---");
    console.log(content);
    console.log("----------------------------------");

    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanContent);
      console.log("JSON PARSED SUCCESSFULLY!");
    } catch (e) {
      console.error(`Invalid JSON from OpenRouter:`, e.message);
      console.error(`String chunk: ${content.substring(0, 200)}`);
      return;
    }

    const COVER_LETTER_SCHEMA = z.object({
      tone: z.enum(['PROFESSIONAL', 'ENTHUSIASTIC', 'CONCISE', 'STORYTELLING', 'FORMAL']),
      company_name: z.string().min(1),
      job_title: z.string().min(1),
      content: z.string().min(200),
      opening: z.string().min(1),
      body_paragraphs: z.array(z.string().min(1)),
      closing: z.string().min(1),
    });

    try {
      COVER_LETTER_SCHEMA.parse(parsed);
      console.log("ZOD SCHEMA VALIDATION PASSED!");
    } catch (e) {
      console.error("ZOD SCHEMA VALIDATION FAILED!", JSON.stringify(e.errors, null, 2));
    }

  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

test();
