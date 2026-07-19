import { z } from 'npm:zod@3.22.4';

/**
 * Zod schemas for AI outputs and database validation
 * Every AI response must be validated against one of these
 */

// ─── JOB DESCRIPTION ANALYSIS ────────────────────────────────────────────

export const JD_ANALYSIS_SCHEMA = z.object({
  title: z.string().optional().default(''),
  company: z.string().optional().default(''),
  salary_min: z.number().nullable().optional().default(null),
  salary_max: z.number().nullable().optional().default(null),
  salary_currency: z.string().nullable().optional().default(null),
  location: z.string().optional().default(''),
  remote_option: z.enum(['FULLY_REMOTE', 'HYBRID', 'ONSITE']).nullable().optional().default(null),
  job_description: z.string().optional().default(''),
  
  // Scoring
  key_responsibilities: z.array(z.string()).optional().default([]),
  required_skills: z.array(z.object({
    skill: z.string().optional().default(''),
    proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional().default('INTERMEDIATE'),
  })).optional().default([]),
  preferred_skills: z.array(z.object({
    skill: z.string().optional().default(''),
    proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional().default('INTERMEDIATE'),
  })).optional().default([]),
  nice_to_haves: z.array(z.string()).optional().default([]),
  red_flags: z.array(z.string()).optional().default([]),
  culture_signals: z.array(z.string()).optional().default([]),
  
  // Recommendation
  recommendation_level: z.enum(['GREAT_FIT', 'GOOD_FIT', 'STRETCH_GOAL']).optional().default('GOOD_FIT'),
  recommendation_reason: z.string().optional().default(''),
  top_3_strengths: z.array(z.string()).optional().default([]),
  top_3_gaps: z.array(z.string()).optional().default([]),
  
  // Meta
  posted_date: z.string().nullable().optional().default(null),
  application_deadline: z.string().nullable().optional().default(null),
  company_size: z.string().nullable().optional().default(null),
  industry: z.string().nullable().optional().default(null),
  
  // Profile Match Analysis
  fit_score: z.number().min(0).max(100).nullish().default(null),
  missing_bonus_skills: z.array(z.object({
    skill: z.string().optional().default(''),
  })).nullish().default(null),
  match_analysis: z.array(z.object({
    title: z.string().optional().default(''),
    description: z.string().optional().default(''),
    score_percentage: z.number().min(0).max(100).optional().default(50),
    type: z.enum(['SUCCESS', 'WARNING', 'INFO', 'PRIMARY']).optional().default('INFO'),
  })).nullish().default(null),
});

export type JDAnalysis = z.infer<typeof JD_ANALYSIS_SCHEMA>;

// ─── RESUME CONTENT ──────────────────────────────────────────────────────

export const RESUME_CONTENT_SCHEMA = z.object({
  meta: z.object({
    candidate_name: z.string().optional().default(''),
    profession: z.string().optional().default(''),
    target_role: z.string().optional().default(''),
    generated_at: z.string().optional().default(''),
    ats_keywords_used: z.array(z.string()).optional().default([]),
    page_fit_estimate: z.enum(['tight', 'comfortable', 'overflow_risk', '']).optional().default(''),
  }).optional().default({}),
  
  header: z.object({
    name: z.string().optional().default(''),
    title: z.string().optional().default(''),
    subtitle: z.string().optional().default(''),
    email: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    linkedin: z.string().optional().default(''),
    portfolio: z.string().optional().default(''),
    location: z.string().optional().default(''),
  }).optional().default({}),
  
  summary: z.object({
    text: z.string().optional().default(''),
  }).optional().default({ text: '' }),
  
  skills: z.array(z.object({
    category: z.string().optional().default(''),
    items: z.array(z.string()).optional().default([]),
  })).optional().default([]),
  
  experience: z.array(z.object({
    title: z.string().optional().default(''),
    company: z.string().optional().default(''),
    date_range: z.string().optional().default(''),
    location: z.string().optional().default(''),
    bullets: z.array(z.string()).optional().default([]),
  })).optional().default([]),
  
  featured_project: z.object({
    name: z.string().optional().default(''),
    tech_stack: z.string().optional().default(''),
    bullet: z.string().optional().default(''),
    include: z.boolean().optional().default(false),
  }).optional().default({
    name: '',
    tech_stack: '',
    bullet: '',
    include: false,
  }),
  
  education: z.array(z.object({
    degree: z.string().optional().default(''),
    institution: z.string().optional().default(''),
    year: z.string().optional().default(''),
    note: z.string().optional().default(''),
  })).optional().default([]),
  
  certifications: z.array(z.object({
    name: z.string().optional().default(''),
    issuer: z.string().optional().default(''),
    year: z.string().optional().default('')
  })).optional().default([]),
  
  languages: z.array(z.object({
    language: z.string().optional().default(''),
    proficiency: z.string().optional().default(''),
  })).optional().default([]),
  
  recognition: z.array(z.object({
    name: z.string().optional().default(''),
    issuer: z.string().optional().default(''),
    year: z.string().optional().default('')
  })).optional().default([]),
  
  sections_to_include: z.object({
    summary: z.boolean().optional().default(true),
    skills: z.boolean().optional().default(true),
    experience: z.boolean().optional().default(true),
    featured_project: z.boolean().optional().default(false),
    education: z.boolean().optional().default(true),
    certifications: z.boolean().optional().default(false),
    languages: z.boolean().optional().default(false),
    recognition: z.boolean().optional().default(false),
  }).optional().default({
    summary: true,
    skills: true,
    experience: true,
    featured_project: false,
    education: true,
    certifications: false,
    languages: false,
    recognition: false,
  }),
});

export type ResumeContent = z.infer<typeof RESUME_CONTENT_SCHEMA>;

// ─── ATS SCORING ─────────────────────────────────────────────────────────

export const ATS_SCORE_SCHEMA = z.object({
  overall_score: z.number().min(0).max(100).optional().default(50),
  
  scores: z.object({
    keyword_match: z.number().min(0).max(100).optional().default(50),
    formatting: z.number().min(0).max(100).optional().default(50),
    structure: z.number().min(0).max(100).optional().default(50),
    readability: z.number().min(0).max(100).optional().default(50),
    completeness: z.number().min(0).max(100).optional().default(50),
  }).optional().default({
    keyword_match: 50,
    formatting: 50,
    structure: 50,
    readability: 50,
    completeness: 50,
  }),
  
  strengths: z.array(z.string().min(0)).optional().default([]),
  weaknesses: z.array(z.string().min(0)).optional().default([]),
  improvements: z.array(z.object({
    area: z.string().optional().default(''),
    suggestion: z.string().optional().default(''),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional().default('MEDIUM'),
  })).optional().default([]),
  
  keywords_matched: z.array(z.string()).optional().default([]),
  keywords_missing: z.array(z.string()).optional().default([]),
  
  is_ats_friendly: z.boolean().optional().default(true),
  pass_fail: z.enum(['PASS', 'FAIL']).optional().default('PASS'),
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
    candidate_name: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    email: z.string().optional().default(''),
    linkedin: z.string().optional().default(''),
    portfolio: z.string().optional().default(''),
    date: z.string().optional().default(''),
    hiring_manager: z.string().optional().default(''),
    company_name: z.string().optional().default(''),
    company_address: z.string().optional().default(''),
  }).optional().default({}),

  salutation: z.string().optional().default(''),

  paragraphs: z.object({
    opening: z.object({
      text: z.string().optional().default(''),
      word_count: z.number().optional(),
    }).optional().default({ text: '' }),
    body_1: z.object({
      text: z.string().optional().default(''),
      word_count: z.number().optional(),
    }).optional().default({ text: '' }),
    body_2: z.object({
      text: z.string().optional().default(''),
      word_count: z.number().optional(),
    }).optional().default({ text: '' }),
    closing: z.object({
      text: z.string().optional().default(''),
      word_count: z.number().optional(),
    }).optional().default({ text: '' }),
  }).optional().default({
    opening: { text: '' },
    body_1: { text: '' },
    body_2: { text: '' },
    closing: { text: '' },
  }),

  sign_off: z.object({
    closing_phrase: z.string().optional().default(''),
    name: z.string().optional().default(''),
  }).optional().default({ closing_phrase: '', name: '' }),
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
  
  strengths: z.array(z.string()),
  areas_for_improvement: z.array(z.string()),
  
  question_feedback: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    score: z.number().min(0).max(100),
    feedback: z.string(),
  })),
  
  interview_summary: z.string(),
  suggested_follow_up: z.array(z.string()),
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
    headline:   z.number().min(0).max(100).optional().default(50),
    about:      z.number().min(0).max(100).optional().default(50),
    experience: z.number().min(0).max(100).optional().default(50),
    skills:     z.number().min(0).max(100).optional().default(50),
  }).optional().default({
    headline: 50,
    about: 50,
    experience: 50,
    skills: 50,
  }),

  overall_score: z.number().min(0).max(100).optional().default(50),

  /** Predicted score after implementing all AI suggestions */
  estimated_score_after_optimization: z.number().min(0).max(100).optional().default(75),

  // ── Issues per section ────────────────────────────────────────────────────
  issues: z.object({
    headline:   z.array(z.string()).optional().default([]),
    about:      z.array(z.string()).optional().default([]),
    experience: z.array(z.string()).optional().default([]),
    skills:     z.array(z.string()).optional().default([]),
  }).optional().default({
    headline: [],
    about: [],
    experience: [],
    skills: [],
  }),

  // ── Keyword Intelligence (Master Prompt Step 2A) ──────────────────────────
  keyword_intelligence: z.object({
    /**
     * Top 15 recruiter-searched keywords for the target role(s).
     * Categorised as ROLE_TITLE / SKILL / IMPACT / INDUSTRY.
     */
    top_keywords: z.array(z.object({
      keyword:            z.string().optional().default(''),
      category:           z.enum(['ROLE_TITLE', 'SKILL', 'IMPACT', 'INDUSTRY']).optional().default('SKILL'),
      present_in_profile: z.boolean().optional().default(false),
    })).max(15).optional().default([]),
    /** High-priority keywords completely absent from the current profile */
    missing_high_priority: z.array(z.string()).optional().default([]),
  }).optional().default({
    top_keywords: [],
    missing_high_priority: [],
  }),

  // ── SPIKE Differentiator (Master Prompt Step 1C) ──────────────────────────
  spike: z.object({
    /** The one thing that sets this candidate apart */
    identified_differentiator: z.string().optional().default(''),
    /** Concise value proposition derived from differentiator + experience */
    unique_value_proposition:  z.string().optional().default(''),
  }).optional().default({
    identified_differentiator: '',
    unique_value_proposition: '',
  }),

  // ── Quick one-line suggestions (backward compat) ─────────────────────────
  suggestions: z.object({
    headline:           z.string().optional().default(''),
    about:              z.string().optional().default(''),
    experience_bullets: z.array(z.string()).optional().default([]),
  }).optional().default({
    headline: '',
    about: '',
    experience_bullets: [],
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
    text:      z.string().max(220).optional().default(''),
    /** Why this option was written this way */
    rationale: z.string().optional().default(''),
    /** Primary optimisation axis */
    focus:     z.enum(['SEARCH_RANK', 'DIFFERENTIATION', 'IMPACT_METRIC']).optional().default('SEARCH_RANK'),
  })).min(0).max(10).optional().default([]),
});

export type LinkedInHeadline = z.infer<typeof LINKEDIN_HEADLINE_SCHEMA>;

// ─── LINKEDIN ABOUT (Master Prompt Step 3 – About Section) ───────────────────
/**
 * Full About / Summary section rewrite using the formula:
 * Hook → Credibility → Value Delivery Framework → Human Element → CTA
 */
export const LINKEDIN_ABOUT_SCHEMA = z.object({
  /** The full ready-to-paste About section (≤ 2600 characters LinkedIn limit) */
  content: z.string().max(2600).optional().default(''),
  /** Map of keywords embedded, with placement notes for the user */
  keyword_map: z.array(z.object({
    keyword:   z.string().optional().default(''),
    placement: z.string().optional().default(''), // e.g. "opening hook", "value delivery bullet 2"
  })).optional().default([]),
});

export type LinkedInAbout = z.infer<typeof LINKEDIN_ABOUT_SCHEMA>;

// ─── LINKEDIN EXPERIENCE (Master Prompt Step 3 – Experience Bullets) ─────────
/**
 * Per-role rewrite using the bolded-outcome formula:
 * **[Quantified Outcome]**: [Action Verb] + [Scope] + [Methodology] + [Impact]
 */
export const LINKEDIN_EXPERIENCE_SCHEMA = z.object({
  rewritten_roles: z.array(z.object({
    title:   z.string().optional().default(''),
    company: z.string().optional().default(''),
    /** Each bullet starts with a **bolded quantified outcome**: … */
    bullets: z.array(z.string()).optional().default([]),
  })).optional().default([]),
});

export type LinkedInExperience = z.infer<typeof LINKEDIN_EXPERIENCE_SCHEMA>;

// ─── LINKEDIN SKILLS (Master Prompt Step 3 – Skills Section) ─────────────────
/**
 * Strategic skills list: top-5 pinned skills + categorised full list (30-50+).
 */
export const LINKEDIN_SKILLS_SCHEMA = z.object({
  /** The 5 skills to pin — ordered by recruiter search priority */
  pinned_top_5: z.array(z.string()).min(0).max(10).optional().default([]),
  /** Full categorised list for maximum Boolean-search coverage */
  categorized: z.object({
    core_technical:  z.array(z.string()).optional().default([]),
    industry_domain: z.array(z.string()).optional().default([]),
    tools_platforms: z.array(z.string()).optional().default([]),
    leadership:      z.array(z.string()).optional().default([]),
    soft_skills:     z.array(z.string()).optional().default([]),
  }).optional().default({
    core_technical: [],
    industry_domain: [],
    tools_platforms: [],
    leadership: [],
    soft_skills: [],
  }),
});

export type LinkedInSkills = z.infer<typeof LINKEDIN_SKILLS_SCHEMA>;

// ─── LINKEDIN FEATURED (Master Prompt Step 3 – Featured Section) ──────────────
/**
 * 3-5 proof artifact recommendations ordered by impact.
 */
export const LINKEDIN_FEATURED_SCHEMA = z.object({
  recommended_items: z.array(z.object({
    type:        z.enum(['CREDENTIAL', 'PORTFOLIO', 'CASE_STUDY', 'CERTIFICATION', 'THOUGHT_LEADERSHIP']).optional().default('PORTFOLIO'),
    /** Keyword-rich title for the featured card */
    title:       z.string().optional().default(''),
    /** 1-2 sentence description focused on relevance and impact */
    description: z.string().optional().default(''),
    /** Clear CTA text e.g. "View case study", "Download portfolio" */
    cta:         z.string().optional().default(''),
  })).min(0).max(10).optional().default([]),
});

export type LinkedInFeatured = z.infer<typeof LINKEDIN_FEATURED_SCHEMA>;

// ─── LINKEDIN OUTREACH KIT (Master Prompt Step 5) ────────────────────────────
/**
 * 3 customisable recruiter/hiring manager message templates.
 */
export const LINKEDIN_OUTREACH_SCHEMA = z.object({
  /** For responding to an inbound recruiter message */
  inbound_response: z.string().optional().default(''),
  /** For proactive outreach to a hiring manager at a target company */
  proactive_outreach: z.string().optional().default(''),
  /** For requesting a referral from a mutual connection */
  referral_request: z.string().optional().default(''),
}).optional().default({
  inbound_response: '',
  proactive_outreach: '',
  referral_request: '',
});

export type LinkedInOutreach = z.infer<typeof LINKEDIN_OUTREACH_SCHEMA>;

// ─── LINKEDIN ENGAGEMENT PLAN (Master Prompt Step 5 – Optional Add-on) ───────
/**
 * 30-day content + networking engagement plan.
 * Generated by the separate linkedin-engagement-plan edge function.
 */
export const LINKEDIN_ENGAGEMENT_SCHEMA = z.object({
  weeks: z.array(z.object({
    week_label: z.string().optional().default(''), // e.g. "Week 1-2: Profile Launch"
    theme:      z.string().optional().default(''),
    tasks:      z.array(z.object({
      day:         z.string().optional().default(''), // e.g. "Day 1", "Day 3-4"
      action:      z.string().optional().default(''),
      time_needed: z.string().optional().default(''), // e.g. "10 min"
      type:        z.enum(['POST', 'COMMENT', 'CONNECT', 'PUBLISH', 'UPDATE', 'OUTREACH']).optional().default('POST'),
    })).optional().default([]),
  })).optional().default([]),
  monthly_cadence: z.array(z.string()).optional().default([]),
});

export type LinkedInEngagementPlan = z.infer<typeof LINKEDIN_ENGAGEMENT_SCHEMA>;

// ─── ELEVATOR PITCH ──────────────────────────────────────────────────────

export const ELEVATOR_PITCH_SCHEMA = z.object({
  context: z.enum(['INTERVIEW', 'NETWORKING', 'EMAIL']).optional().default('INTERVIEW'),
  pitch_30s: z.string().min(0).max(100).optional().default(''),
  pitch_60s: z.string().min(0).max(200).optional().default(''),
});

export type ElevatorPitch = z.infer<typeof ELEVATOR_PITCH_SCHEMA>;

// ─── NETWORKING MESSAGE ──────────────────────────────────────────────────

export const NETWORKING_MESSAGE_SCHEMA = z.object({
  messages: z.array(z.string().min(0).max(500)).min(0).max(10).optional().default([]),
});

export type NetworkingMessage = z.infer<typeof NETWORKING_MESSAGE_SCHEMA>;

// ─── JD SUMMARY ──────────────────────────────────────────────────────────

export const JD_SUMMARY_SCHEMA = z.object({
  responsibilities: z.array(z.string().min(0)).min(0).max(10).optional().default([]),
  must_haves: z.array(z.string().min(0)).min(0).max(20).optional().default([]),
  nice_to_haves: z.array(z.string().min(0)).min(0).max(10).optional().default([]),
  red_flags: z.array(z.string().min(0)).optional().default([]),
  culture_signals: z.array(z.string().min(0)).optional().default([]),
});

export type JDSummary = z.infer<typeof JD_SUMMARY_SCHEMA>;

// ─── ROADMAP GENERATION ──────────────────────────────────────────────────

export const ROADMAP_SCHEMA = z.object({
  duration_days: z.number().min(1).max(30),
  title: z.string().min(0),
  overview: z.string().min(0),
  modules: z.array(z.object({
    module_title: z.string(),
    days_allocated: z.string(),
    focus_skill: z.string(),
    action_items: z.array(z.string()).min(0),
    estimated_hours: z.number().min(0),
    resources_to_use: z.array(z.string()),
  })).min(0).max(20),
});

export type Roadmap = z.infer<typeof ROADMAP_SCHEMA>;
