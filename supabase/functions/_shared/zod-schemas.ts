import { z } from 'npm:zod@3.22.4';

/**
 * Zod schemas for AI outputs and database validation
 * Every AI response must be validated against one of these
 */

// ─── JOB DESCRIPTION ANALYSIS ────────────────────────────────────────────

export const JD_ANALYSIS_SCHEMA = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  salary_currency: z.string().nullable(),
  location: z.string(),
  remote_option: z.enum(['FULLY_REMOTE', 'HYBRID', 'ONSITE']).nullable(),
  job_description: z.string().min(1),
  
  // Scoring
  key_responsibilities: z.array(z.string()),
  required_skills: z.array(z.object({
    skill: z.string(),
    proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  })),
  preferred_skills: z.array(z.object({
    skill: z.string(),
    proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  })),
  nice_to_haves: z.array(z.string()),
  red_flags: z.array(z.string()),
  culture_signals: z.array(z.string()),
  
  // Recommendation
  recommendation_level: z.enum(['GREAT_FIT', 'GOOD_FIT', 'STRETCH_GOAL']),
  recommendation_reason: z.string(),
  top_3_strengths: z.array(z.string()),
  top_3_gaps: z.array(z.string()),
  
  // Meta
  posted_date: z.string().nullable(),
  application_deadline: z.string().nullable(),
  company_size: z.string().nullable(),
  industry: z.string().nullable(),
  
  // Profile Match Analysis
  fit_score: z.number().min(0).max(100).optional(),
  missing_bonus_skills: z.array(z.object({
    skill: z.string(),
  })).optional(),
  match_analysis: z.array(z.object({
    title: z.string(),
    description: z.string(),
    score_percentage: z.number().min(0).max(100),
    type: z.enum(['SUCCESS', 'WARNING', 'INFO', 'PRIMARY']),
  })).optional(),
});

export type JDAnalysis = z.infer<typeof JD_ANALYSIS_SCHEMA>;

// ─── RESUME CONTENT ──────────────────────────────────────────────────────

export const RESUME_CONTENT_SCHEMA = z.object({
  meta: z.object({
    candidate_name: z.string(),
    profession: z.string(),
    target_role: z.string(),
    generated_at: z.string(),
    ats_keywords_used: z.array(z.string()),
    page_fit_estimate: z.enum(['tight', 'comfortable', 'overflow_risk', '']),
  }).optional(), // Optional since it might fail validation if LLM misses enum
  
  header: z.object({
    name: z.string(),
    title: z.string(),
    subtitle: z.string(),
    email: z.string(),
    phone: z.string(),
    linkedin: z.string(),
    portfolio: z.string(),
    location: z.string(),
  }),
  
  summary: z.object({
    text: z.string(),
  }),
  
  skills: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()),
  })),
  
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    date_range: z.string(),
    location: z.string(),
    bullets: z.array(z.string()),
  })),
  
  featured_project: z.object({
    name: z.string(),
    tech_stack: z.string(),
    bullet: z.string(),
    include: z.boolean(),
  }).optional(),
  
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.string(),
    note: z.string().optional(),
  })),
  
  certifications: z.array(z.string()),
  
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string(),
  })).optional(),
  
  recognition: z.array(z.string()).optional(),
  
  sections_to_include: z.object({
    summary: z.boolean().default(true),
    skills: z.boolean().default(true),
    experience: z.boolean().default(true),
    featured_project: z.boolean().default(false),
    education: z.boolean().default(true),
    certifications: z.boolean().default(false),
    languages: z.boolean().default(false),
    recognition: z.boolean().default(false),
  }),
});

export type ResumeContent = z.infer<typeof RESUME_CONTENT_SCHEMA>;

// ─── ATS SCORING ─────────────────────────────────────────────────────────

export const ATS_SCORE_SCHEMA = z.object({
  overall_score: z.number().min(0).max(100),
  
  scores: z.object({
    keyword_match: z.number().min(0).max(100),
    formatting: z.number().min(0).max(100),
    structure: z.number().min(0).max(100),
    readability: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
  }),
  
  strengths: z.array(z.string().min(1)),
  weaknesses: z.array(z.string().min(1)),
  improvements: z.array(z.object({
    area: z.string(),
    suggestion: z.string(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })),
  
  keywords_matched: z.array(z.string()),
  keywords_missing: z.array(z.string()),
  
  is_ats_friendly: z.boolean(),
  pass_fail: z.enum(['PASS', 'FAIL']),
});

export type ATSScore = z.infer<typeof ATS_SCORE_SCHEMA>;

// ─── COVER LETTER ────────────────────────────────────────────────────────

export const COVER_LETTER_SCHEMA = z.object({
  meta: z.object({
    candidate_name: z.string().optional(),
    target_role: z.string().optional(),
    target_company: z.string().optional(),
    generated_at: z.string().optional(),
    word_count: z.number().optional(),
    ats_keywords_used: z.array(z.string()).optional(),
    tone: z.string().optional(),
  }).optional(),
  
  header: z.object({
    candidate_name: z.string(),
    phone: z.string(),
    email: z.string(),
    linkedin: z.string(),
    portfolio: z.string(),
    date: z.string(),
    hiring_manager: z.string(),
    company_name: z.string(),
    company_address: z.string(),
  }),

  salutation: z.string(),

  paragraphs: z.object({
    opening: z.object({
      text: z.string(),
      word_count: z.number().optional(),
    }),
    body_1: z.object({
      text: z.string(),
      word_count: z.number().optional(),
    }),
    body_2: z.object({
      text: z.string(),
      word_count: z.number().optional(),
    }),
    closing: z.object({
      text: z.string(),
      word_count: z.number().optional(),
    }),
  }),

  sign_off: z.object({
    closing_phrase: z.string(),
    name: z.string(),
  }),
});

export type CoverLetter = z.infer<typeof COVER_LETTER_SCHEMA>;

// ─── INTERVIEW FEEDBACK ──────────────────────────────────────────────────

export const INTERVIEW_SCORE_SCHEMA = z.object({
  interview_id: z.string(),
  overall_score: z.number().min(0).max(100),
  
  dimension_scores: z.object({
    communication: z.number().min(0).max(100),
    technical_knowledge: z.number().min(0).max(100),
    problem_solving: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    cultural_fit: z.number().min(0).max(100),
  }),
  
  recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE', 'STRONG_NO_HIRE']),
  
  strengths: z.array(z.string().min(1)).min(2).max(5),
  areas_for_improvement: z.array(z.string().min(1)).min(2).max(5),
  
  question_feedback: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    score: z.number().min(0).max(100),
    feedback: z.string(),
  })),
  
  interview_summary: z.string().min(50),
  suggested_follow_up: z.array(z.string()).optional(),
});

export type InterviewScore = z.infer<typeof INTERVIEW_SCORE_SCHEMA>;

// ─── LINKEDIN OPTIMIZER ──────────────────────────────────────────────────

export const LINKEDIN_ANALYSIS_SCHEMA = z.object({
  section_scores: z.object({
    headline: z.number().min(0).max(100),
    about: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    skills: z.number().min(0).max(100),
  }),
  
  overall_score: z.number().min(0).max(100),
  
  issues: z.object({
    headline: z.array(z.string()).optional(),
    about: z.array(z.string()).optional(),
    experience: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
  }),
  
  suggestions: z.object({
    headline: z.string().optional(),
    about: z.string().optional(),
    experience_bullets: z.array(z.string()).optional(),
  }),
});

export type LinkedInAnalysis = z.infer<typeof LINKEDIN_ANALYSIS_SCHEMA>;

// ─── ELEVATOR PITCH ──────────────────────────────────────────────────────

export const ELEVATOR_PITCH_SCHEMA = z.object({
  context: z.enum(['INTERVIEW', 'NETWORKING', 'EMAIL']),
  pitch_30s: z.string().min(30).max(100),
  pitch_60s: z.string().min(80).max(200),
});

export type ElevatorPitch = z.infer<typeof ELEVATOR_PITCH_SCHEMA>;

// ─── NETWORKING MESSAGE ──────────────────────────────────────────────────

export const NETWORKING_MESSAGE_SCHEMA = z.object({
  messages: z.array(z.string().min(30).max(500)).min(3).max(3),
});

export type NetworkingMessage = z.infer<typeof NETWORKING_MESSAGE_SCHEMA>;

// ─── JD SUMMARY ──────────────────────────────────────────────────────────

export const JD_SUMMARY_SCHEMA = z.object({
  responsibilities: z.array(z.string().min(1)).min(3).max(5),
  must_haves: z.array(z.string().min(1)).min(3).max(8),
  nice_to_haves: z.array(z.string().min(1)).min(2).max(5),
  red_flags: z.array(z.string().min(1)).optional(),
  culture_signals: z.array(z.string().min(1)).optional(),
});

export type JDSummary = z.infer<typeof JD_SUMMARY_SCHEMA>;
