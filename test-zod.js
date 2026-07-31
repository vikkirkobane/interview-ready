const { z } = require('zod');

const CreateCoverLetterInput = z.object({
  job_application_id: z.string().uuid().optional(),
  job_title: z.string().min(1),
  company_name: z.string().min(1),
  tone: z.enum(['PROFESSIONAL', 'ENTHUSIASTIC', 'CONCISE', 'STORYTELLING', 'FORMAL']),
  resume_id: z.string().uuid().optional(),
  job_description: z.string().optional(),
  job_url: z.string().url().optional(),
});

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const payload = {
  tone: 'Professional', // UI passes this
  job_description: 'Software Engineer at Acme',
  job_url: undefined, // UI passes undefined when empty
  target_company: 'Acme',
  target_role: 'Engineer',
};

// API mapping
const mappedPayload = {
  ...payload,
  tone: payload.tone?.toUpperCase() || 'PROFESSIONAL',
  company_name: payload.target_company || 'the specified company',
  job_title: payload.target_role || 'the specified role',
};

// Serialize over network
const networkPayload = serialize(mappedPayload);

try {
  CreateCoverLetterInput.parse(networkPayload);
  console.log("payload passed");
} catch(e) {
  console.log("payload failed", JSON.stringify(e.errors, null, 2));
}

