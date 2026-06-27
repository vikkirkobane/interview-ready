/**
 * Shared types mirrored from supabase/functions/_shared/zod-schemas.ts
 * 
 * These are plain TypeScript types (no Zod runtime dependency) so they
 * can be safely bundled by Metro for React Native.
 * 
 * Keep in sync with zod-schemas.ts when the schema shapes change.
 */

export type JDAnalysis = {
  title: string;
  company: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  location: string;
  remote_option: 'FULLY_REMOTE' | 'HYBRID' | 'ONSITE' | null;
  job_description: string;
  key_responsibilities: string[];
  required_skills: { skill: string; proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' }[];
  preferred_skills: { skill: string; proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' }[];
  nice_to_haves: string[];
  red_flags: string[];
  culture_signals: string[];
  recommendation_level: 'GREAT_FIT' | 'GOOD_FIT' | 'STRETCH_GOAL';
  recommendation_reason: string;
  top_3_strengths: string[];
  top_3_gaps: string[];
  posted_date: string | null;
  application_deadline: string | null;
  company_size: string | null;
  industry: string | null;
  fit_score?: number;
  missing_bonus_skills?: { skill: string }[];
  match_analysis?: {
    title: string;
    description: string;
    score_percentage: number;
    type: 'SUCCESS' | 'WARNING' | 'INFO' | 'PRIMARY';
  }[];
};

export type ResumeContent = {
  meta?: {
    candidate_name: string;
    profession: string;
    target_role: string;
    generated_at: string;
    ats_keywords_used: string[];
    page_fit_estimate: 'tight' | 'comfortable' | 'overflow_risk' | '';
  };
  header: {
    name: string;
    title: string;
    subtitle: string;
    email: string;
    phone: string;
    linkedin: string;
    portfolio: string;
    location: string;
  };
  summary: { text: string };
  skills: { category: string; items: string[] }[];
  experience: {
    title: string;
    company: string;
    date_range: string;
    location: string;
    bullets: string[];
  }[];
  featured_project?: {
    name: string;
    tech_stack: string;
    bullet: string;
    include: boolean;
  };
  education: {
    degree: string;
    institution: string;
    year: string;
    note?: string;
  }[];
  certifications: string[];
  languages?: { language: string; proficiency: string }[];
  recognition?: string[];
  sections_to_include: {
    summary: boolean;
    skills: boolean;
    experience: boolean;
    featured_project: boolean;
    education: boolean;
    certifications: boolean;
    languages: boolean;
    recognition: boolean;
  };
};

export type ATSScore = {
  overall_score: number;
  scores: {
    keyword_match: number;
    formatting: number;
    structure: number;
    readability: number;
    completeness: number;
  };
  strengths: string[];
  weaknesses: string[];
  improvements: { area: string; suggestion: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }[];
  keywords_matched: string[];
  keywords_missing: string[];
  is_ats_friendly: boolean;
  pass_fail: 'PASS' | 'FAIL';
};

export type CoverLetter = {
  meta?: {
    candidate_name?: string;
    target_role?: string;
    target_company?: string;
    generated_at?: string;
    word_count?: number;
    ats_keywords_used?: string[];
    tone?: string;
  };
  header: {
    candidate_name: string;
    phone: string;
    email: string;
    linkedin: string;
    portfolio: string;
    date: string;
    hiring_manager: string;
    company_name: string;
    company_address: string;
  };
  salutation: string;
  paragraphs: {
    opening: { text: string; word_count?: number };
    body_1: { text: string; word_count?: number };
    body_2: { text: string; word_count?: number };
    closing: { text: string; word_count?: number };
  };
  sign_off: { closing_phrase: string; name: string };
};

export type InterviewScore = {
  interview_id: string;
  overall_score: number;
  dimension_scores: {
    communication: number;
    technical_knowledge: number;
    problem_solving: number;
    confidence: number;
    cultural_fit: number;
  };
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE' | 'STRONG_NO_HIRE';
  strengths: string[];
  areas_for_improvement: string[];
  question_feedback: { question: string; answer: string; score: number; feedback: string }[];
  interview_summary: string;
  suggested_follow_up?: string[];
};

export type LinkedInAnalysis = {
  section_scores: {
    headline: number;
    about: number;
    experience: number;
    skills: number;
  };
  overall_score: number;
  issues: {
    headline?: string[];
    about?: string[];
    experience?: string[];
    skills?: string[];
  };
  suggestions: {
    headline?: string;
    about?: string;
    experience_bullets?: string[];
  };
};

export type ElevatorPitch = {
  context: 'INTERVIEW' | 'NETWORKING' | 'EMAIL';
  pitch_30s: string;
  pitch_60s: string;
};

export type NetworkingMessage = {
  messages: string[];
};

export type JDSummary = {
  responsibilities: string[];
  must_haves: string[];
  nice_to_haves: string[];
  red_flags?: string[];
  culture_signals?: string[];
};
