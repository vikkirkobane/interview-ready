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
  
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    year: z.string().optional()
  })).optional(),
  
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.string(),
  })).optional(),
  
  recognition: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    year: z.string().optional()
  })).optional(),
  
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

// ─── LINKEDIN OPTIMIZER ──────────────────────────────────────────────────────

/**
 * LINKEDIN_ANALYSIS_SCHEMA
 * Returned by linkedin-analyze.
 * Implements Master Prompt Steps 2A (keyword research), 1C (SPIKE), and 3 (scoring).
 */
export const LINKEDIN_ANALYSIS_SCHEMA = z.object({
  // ── Section scores (0-100) ────────────────────────────────────────────────
  section_scores: z.object({
    headline:   z.number().min(0).max(100),
    about:      z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    skills:     z.number().min(0).max(100),
  }),

  overall_score: z.number().min(0).max(100),

  /** Predicted score after implementing all AI suggestions */
  estimated_score_after_optimization: z.number().min(0).max(100),

  // ── Issues per section ────────────────────────────────────────────────────
  issues: z.object({
    headline:   z.array(z.string()).optional(),
    about:      z.array(z.string()).optional(),
    experience: z.array(z.string()).optional(),
    skills:     z.array(z.string()).optional(),
  }),

  // ── Keyword Intelligence (Master Prompt Step 2A) ──────────────────────────
  keyword_intelligence: z.object({
    /**
     * Top 15 recruiter-searched keywords for the target role(s).
     * Categorised as ROLE_TITLE / SKILL / IMPACT / INDUSTRY.
     */
    top_keywords: z.array(z.object({
      keyword:            z.string(),
      category:           z.enum(['ROLE_TITLE', 'SKILL', 'IMPACT', 'INDUSTRY']),
      present_in_profile: z.boolean(),
    })).max(15),
    /** High-priority keywords completely absent from the current profile */
    missing_high_priority: z.array(z.string()),
  }),

  // ── SPIKE Differentiator (Master Prompt Step 1C) ──────────────────────────
  spike: z.object({
    /** The one thing that sets this candidate apart */
    identified_differentiator: z.string(),
    /** Concise value proposition derived from differentiator + experience */
    unique_value_proposition:  z.string(),
  }).optional(),

  // ── Quick one-line suggestions (backward compat) ─────────────────────────
  suggestions: z.object({
    headline:           z.string().optional(),
    about:              z.string().optional(),
    experience_bullets: z.array(z.string()).optional(),
  }),
});

export type LinkedInAnalysis = z.infer<typeof LINKEDIN_ANALYSIS_SCHEMA>;

// ─── LINKEDIN HEADLINE (Master Prompt Step 3 – Headline) ─────────────────────
/**
 * 3 headline variants following the universal formula:
 * [Target Role] | [Specialty] | [Quantified Metric] | [Differentiator]
 * Each variant has a distinct strategic focus.
 */
export const LINKEDIN_HEADLINE_SCHEMA = z.object({
  variants: z.array(z.object({
    /** The headline text — must be ≤ 220 characters */
    text:      z.string().max(220),
    /** Why this option was written this way */
    rationale: z.string(),
    /** Primary optimisation axis */
    focus:     z.enum(['SEARCH_RANK', 'DIFFERENTIATION', 'IMPACT_METRIC']),
  })).length(3),
});

export type LinkedInHeadline = z.infer<typeof LINKEDIN_HEADLINE_SCHEMA>;

// ─── LINKEDIN ABOUT (Master Prompt Step 3 – About Section) ───────────────────
/**
 * Full About / Summary section rewrite using the formula:
 * Hook → Credibility → Value Delivery Framework → Human Element → CTA
 */
export const LINKEDIN_ABOUT_SCHEMA = z.object({
  /** The full ready-to-paste About section (≤ 2600 characters LinkedIn limit) */
  content: z.string().max(2600),
  /** Map of keywords embedded, with placement notes for the user */
  keyword_map: z.array(z.object({
    keyword:   z.string(),
    placement: z.string(), // e.g. "opening hook", "value delivery bullet 2"
  })),
});

export type LinkedInAbout = z.infer<typeof LINKEDIN_ABOUT_SCHEMA>;

// ─── LINKEDIN EXPERIENCE (Master Prompt Step 3 – Experience Bullets) ─────────
/**
 * Per-role rewrite using the bolded-outcome formula:
 * **[Quantified Outcome]**: [Action Verb] + [Scope] + [Methodology] + [Impact]
 */
export const LINKEDIN_EXPERIENCE_SCHEMA = z.object({
  rewritten_roles: z.array(z.object({
    title:   z.string(),
    company: z.string(),
    /** Each bullet starts with a **bolded quantified outcome**: … */
    bullets: z.array(z.string()),
  })),
});

export type LinkedInExperience = z.infer<typeof LINKEDIN_EXPERIENCE_SCHEMA>;

// ─── LINKEDIN SKILLS (Master Prompt Step 3 – Skills Section) ─────────────────
/**
 * Strategic skills list: top-5 pinned skills + categorised full list (30-50+).
 */
export const LINKEDIN_SKILLS_SCHEMA = z.object({
  /** The 5 skills to pin — ordered by recruiter search priority */
  pinned_top_5: z.array(z.string()).length(5),
  /** Full categorised list for maximum Boolean-search coverage */
  categorized: z.object({
    core_technical:  z.array(z.string()),
    industry_domain: z.array(z.string()),
    tools_platforms: z.array(z.string()),
    leadership:      z.array(z.string()),
    soft_skills:     z.array(z.string()),
  }),
});

export type LinkedInSkills = z.infer<typeof LINKEDIN_SKILLS_SCHEMA>;

// ─── LINKEDIN FEATURED (Master Prompt Step 3 – Featured Section) ──────────────
/**
 * 3-5 proof artifact recommendations ordered by impact.
 */
export const LINKEDIN_FEATURED_SCHEMA = z.object({
  recommended_items: z.array(z.object({
    type:        z.enum(['CREDENTIAL', 'PORTFOLIO', 'CASE_STUDY', 'CERTIFICATION', 'THOUGHT_LEADERSHIP']),
    /** Keyword-rich title for the featured card */
    title:       z.string(),
    /** 1-2 sentence description focused on relevance and impact */
    description: z.string(),
    /** Clear CTA text e.g. "View case study", "Download portfolio" */
    cta:         z.string(),
  })).min(3).max(5),
});

export type LinkedInFeatured = z.infer<typeof LINKEDIN_FEATURED_SCHEMA>;

// ─── LINKEDIN OUTREACH KIT (Master Prompt Step 5) ────────────────────────────
/**
 * 3 customisable recruiter/hiring manager message templates.
 */
export const LINKEDIN_OUTREACH_SCHEMA = z.object({
  /** For responding to an inbound recruiter message */
  inbound_response: z.string(),
  /** For proactive outreach to a hiring manager at a target company */
  proactive_outreach: z.string(),
  /** For requesting a referral from a mutual connection */
  referral_request: z.string(),
});

export type LinkedInOutreach = z.infer<typeof LINKEDIN_OUTREACH_SCHEMA>;

// ─── LINKEDIN ENGAGEMENT PLAN (Master Prompt Step 5 – Optional Add-on) ───────
/**
 * 30-day content + networking engagement plan.
 * Generated by the separate linkedin-engagement-plan edge function.
 */
export const LINKEDIN_ENGAGEMENT_SCHEMA = z.object({
  weeks: z.array(z.object({
    week_label: z.string(), // e.g. "Week 1-2: Profile Launch"
    theme:      z.string(),
    tasks:      z.array(z.object({
      day:         z.string(), // e.g. "Day 1", "Day 3-4"
      action:      z.string(),
      time_needed: z.string(), // e.g. "10 min"
      type:        z.enum(['POST', 'COMMENT', 'CONNECT', 'PUBLISH', 'UPDATE', 'OUTREACH']),
    })),
  })),
  monthly_cadence: z.array(z.string()),
});

export type LinkedInEngagementPlan = z.infer<typeof LINKEDIN_ENGAGEMENT_SCHEMA>;

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
