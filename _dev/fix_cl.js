const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'supabase/functions/cover-letters-create/index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// The file is currently broken around the job application / JD context check.
// We will replace the entire block from "// Fetch job application / JD context" to "const generatedLetter"

const replacement = `    // Fetch job application / JD context
    if (input.job_application_id) {
      const { data: jobApp } = await client
        .from('job_applications')
        .select('raw_jd, jd_summary, required_skills, nice_to_have_skills')
        .eq('id', input.job_application_id)
        .single();
        
      if (jobApp) {
        contextData += \`\\nJob Description: \${jobApp.raw_jd || jobApp.jd_summary}\`;
      }
    } else if (input.job_description) {
      contextData += \`\\nJob Description: \${input.job_description}\`;
    }

    const systemPrompt = \`You are an expert career coach and cover letter writer.
Create a highly tailored, compelling cover letter based on the provided candidate profile, resume, and job description context.
Adhere strictly to the requested tone: \${input.tone}.
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
Return ONLY raw JSON, do not use Markdown code blocks.\`;

    const userPrompt = \`Target Role: \${input.job_title} at \${input.company_name}
Tone: \${input.tone}
Context Information:
\${contextData}

Generate a standout cover letter for this application.\`;

    const generatedLetter: any = await aiClient.callWithJson(`;

content = content.replace(/\s*\/\/\s*Fetch job application \/ JD context[\s\S]*?const generatedLetter:\s*any\s*=\s*await aiClient\.callWithJson\(/, replacement);

fs.writeFileSync(filePath, content);
console.log('Restored cover-letters-create/index.ts successfully');
