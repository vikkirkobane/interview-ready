import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCall, apiUploadFile } from '../lib/api';
import { supabase } from '../lib/supabase';

/**
 * Update Profile Mutation
 */
export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileData: Record<string, any>) => {
      const response = await apiCall('profile-update', 'PUT', profileData);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the 'me' query to refresh profile data across the app
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
};

/**
 * Parse Resume Mutation
 */
export const useParseResumeMutation = () => {
  return useMutation({
    mutationFn: async (params: { fileUri: string, fileName: string, mimeType: string, webFile?: Blob | null }) => {
      const response = await apiUploadFile('profile-parse-resume', params.fileUri, params.fileName, params.mimeType, params.webFile);
      if (response.error) throw new Error(response.error);
      return response.data as {
        current_role: string;
        company: string;
        summary: string;
        technical_skills: string[];
        soft_skills: string[];
        work_history: any[];
        education: any[];
      };
    },
  });
};

/**
 * Extract Text from JD File Mutation
 */
export const useExtractJdMutation = () => {
  return useMutation({
    mutationFn: async (params: { fileUri: string, fileName: string, mimeType: string, webFile?: Blob | null }) => {
      const response = await apiUploadFile('jd-extract-text', params.fileUri, params.fileName, params.mimeType, params.webFile);
      if (response.error) throw new Error(response.error);
      return response.data as { extracted_text: string };
    },
  });
};

/**
 * Analyze Job Description Mutation
 */
export const useAnalyzeJobMutation = () => {
  return useMutation({
    mutationFn: async (payload: { job_id?: string; jdText?: string; jdUrl?: string; profileData?: any }) => {
      const finalPayload: any = {};
      if (payload.job_id) {
        finalPayload.job_id = payload.job_id;
      }
      if (payload.jdText && payload.jdText.length > 0) {
        finalPayload.job_description = payload.jdText;
      }
      if (payload.jdUrl && payload.jdUrl.length > 0) {
        finalPayload.job_url = payload.jdUrl;
      }
      if (payload.profileData) {
        finalPayload.user_profile = payload.profileData;
      }

      const response = await apiCall('jobs-analyze', 'POST', finalPayload);
      if (response.error) throw new Error(response.error);
      return response.data; // { job_id: string, analysis: JD_ANALYSIS_SCHEMA }
    },
  });
};

/**
 * Generate 14-Day Roadmap Mutation
 */
export const useGenerateRoadmapMutation = () => {
  return useMutation({
    mutationFn: async (payload: { job_id: string }) => {
      const response = await apiCall('jobs-roadmap-generate', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { data: Roadmap }
    },
  });
};

/**
 * Create Resume Mutation
 */
export const useCreateResumeMutation = () => {
  return useMutation({
    mutationFn: async (payload: { title: string; template_id?: string; job_analysis_id?: string; is_base?: boolean }) => {
      const response = await apiCall('resumes-create', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { resume_id: string, message: string, stream_channel: string }
    },
  });
};



/**
 * Complete Onboarding Mutation
 * (Sets a flag in the profile)
 */
export const useCompleteOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiCall('profile-update', 'PUT', { onboarding_completed: true });
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
};

/**
 * Get Resume Query
 */
export const useResumeQuery = (resumeId: string | null) => {
  return useQuery({
    queryKey: ['resume', resumeId],
    queryFn: async () => {
      if (!resumeId) throw new Error('No resume ID provided');
      const { data, error } = await supabase
        .from('resumes')
        .select('*, resume_contents(*)')
        .eq('id', resumeId)
        .single();
        
      if (error) throw new Error(error.message);
      
      const content = Array.isArray(data.resume_contents) ? data.resume_contents[0] : data.resume_contents;
      if (!content) return data; // Return raw data if no content yet

      // Map DB schema back to ResumeContent schema expected by buildResumeHTML
      const mappedContent = {
        meta: {
          candidate_name: content.name || '',
          profession: content.title || '',
          target_role: data.title || '',
        },
        header: content.contact || {
          name: content.name || '',
          title: content.title || '',
          location: '',
          email: '',
          phone: '',
        },
        summary: { text: content.summary || '' },
        skills: content.skills || [],
        experience: content.experience || [],
        education: content.education || [],
        featured_project: content.projects?.[0] || { include: false },
        certifications: content.certifications || [],
        languages: content.languages || [],
        recognition: content.awards || [],
        sections_to_include: {
          summary: !!content.summary,
          skills: !!(content.skills && content.skills.length > 0),
          experience: !!(content.experience && content.experience.length > 0),
          featured_project: !!(content.projects && content.projects.length > 0),
          education: !!(content.education && content.education.length > 0),
          certifications: !!(content.certifications && content.certifications.length > 0),
          languages: !!(content.languages && content.languages.length > 0),
          recognition: !!(content.awards && content.awards.length > 0),
        }
      };

      return mappedContent;
    },
    enabled: !!resumeId,
  });
};

/**
 * List Resumes Query
 */
export const useResumesListQuery = () => {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select('id, title, template_id, status, ats_score, created_at, updated_at')
        .order('created_at', { ascending: false });
        
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

/**
 * Update Resume Mutation
 */
export const useUpdateResumeMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { id: string; title?: string; template_id?: string; resume_contents?: any[] }) => {
      const response = await apiCall('resumes-update', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resume', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
};

/**
 * Rewrite Section Mutation
 */
export const useRewriteSectionMutation = () => {
  return useMutation({
    mutationFn: async (payload: { text: string; section_type: string; jd_context?: string }) => {
      const response = await apiCall('resumes-section-rewrite', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { rewritten: string }
    },
  });
};

/**
 * Delete Account Mutation
 */
export const useDeleteAccountMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiCall('auth-delete-account', 'POST');
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

/**
 * --- NEW INTEGRATIONS ---
 */

export const useStartInterviewMutation = () => {
  return useMutation({
    mutationFn: async (payload: { role: string; interview_type: string; difficulty?: string; company?: string; job_description?: string; job_application_id?: string }) => {
      const response = await apiCall('interviews-start', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { session_id, initial_message }
    },
  });
};

export const useInterviewMessageMutation = () => {
  return useMutation({
    mutationFn: async (payload: { session_id: string; content: string }) => {
      const response = await apiCall(`interviews-message/${payload.session_id}/message`, 'POST', { content: payload.content });
      if (response.error) throw new Error(response.error);
      return response.data; // { message, question_count, status }
    },
  });
};

export const useInterviewFeedbackMutation = () => {
  return useMutation({
    mutationFn: async (payload: { session_id: string }) => {
      const response = await apiCall(`interviews-feedback/${payload.session_id}/feedback`, 'POST', {});
      if (response.error) throw new Error(response.error);
      return response.data; // { feedback, message }
    },
  });
};

export const useCreateCoverLetterMutation = () => {
  return useMutation({
    mutationFn: async (payload: { resume_id?: string; job_description?: string; job_url?: string; tone: string; target_company: string; target_role: string }) => {
      const mappedPayload = {
        ...payload,
        tone: payload.tone?.toUpperCase() || 'PROFESSIONAL',
        company_name: payload.target_company || 'the specified company',
        job_title: payload.target_role || 'the specified role',
      };
      const response = await apiCall('cover-letters-create', 'POST', mappedPayload);
      if (response.error) throw new Error(response.error);
      return response.data; // { cover_letter }
    },
  });
};

// ── LinkedIn Types ────────────────────────────────────────────────────────────

export type LinkedInSpikeInput = {
  differentiator: string;
  praised_for: string;
  problems_solved: string;
};

export type LinkedInTone = 'PROFESSIONAL' | 'APPROACHABLE' | 'DATA_DRIVEN' | 'NARRATIVE' | 'INSPIRATIONAL';

export type LinkedInSection =
  | 'HEADLINE'
  | 'ABOUT'
  | 'EXPERIENCE_BULLETS'
  | 'SKILLS'
  | 'FEATURED'
  | 'OUTREACH_KIT';

/**
 * Scrape the user's LinkedIn profile using ScrapeGraphAI.
 */
export const useLinkedinScrapeMutation = () => {
  return useMutation({
    mutationFn: async (payload: { linkedin_url: string }) => {
      const response = await apiCall('linkedin-scrape', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data as {
        data: {
          headline?: string;
          about?: string;
          experience?: { title: string; company: string; description: string }[];
          skills?: string[];
        };
        message: string;
      };
    },
  });
};

export interface CompanyResearchResult {
  company_name: string;
  tagline?: string;
  overview: string;
  industry: string;
  company_size?: string;
  headquarters?: string;
  founded?: string;
  business_model: string;
  key_products_services: string[];
  mission_values: string;
  recent_news?: { headline: string; summary: string }[];
  financials?: string;
  culture_insights: string;
  tech_stack?: string[];
  competitors?: string[];
  growth_signals: string[];
  red_flags: string[];
  interview_talking_points: string[];
  smart_questions_to_ask: string[];
  cultural_fit_score?: number;
  opportunity_score: number;
  summary_verdict: string;
}

/**
 * Research a company by URL: scrapes the website then generates a full AI analysis.
 * Returns structured insights including culture, red flags, talking points, and questions to ask.
 */
export const useCompanyResearchMutation = () => {
  return useMutation({
    mutationFn: async (payload: { company_url: string; context?: string }) => {
      const response = await apiCall('company-research', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data as { data: CompanyResearchResult; message: string };
    },
  });
};


/**
 * Analyse the user's LinkedIn profile sections.
 * Implements Master Prompt Steps 2A (keyword intel) + 1C (SPIKE) + 3 (scoring).
 */
export const useLinkedinAnalyzeMutation = () => {
  return useMutation({
    mutationFn: async (payload: {
      // Profile content (manually pasted by user)
      headline?: string;
      about?: string;
      experience?: { title: string; company: string; description: string }[];
      skills?: string[];
      // Strategic context (from intake wizard)
      target_roles: string[];
      target_companies?: string[];
      years_experience?: number;
      spike?: LinkedInSpikeInput;
      tone?: LinkedInTone;
    }) => {
      const response = await apiCall('linkedin-analyze', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data as { analysis: any; message: string };
    },
  });
};

/**
 * Optimise a specific LinkedIn section using Master Prompt Step 3 formulas.
 * Each section returns its own structured result.
 */
export const useLinkedinOptimizeMutation = () => {
  return useMutation({
    mutationFn: async (payload: {
      section: LinkedInSection;
      current_content?: string;
      work_history?: { title: string; company: string; description: string }[];
      target_roles: string[];
      target_companies?: string[];
      years_experience?: number;
      spike?: LinkedInSpikeInput;
      tone?: LinkedInTone;
    }) => {
      const response = await apiCall('linkedin-optimize', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data as { result: any; section: string; message: string };
    },
  });
};

/**
 * Optional add-on: Generate a 30-day LinkedIn engagement plan.
 * Master Prompt Step 5 — costs extra credits.
 */
export const useLinkedinEngagementPlanMutation = () => {
  return useMutation({
    mutationFn: async (payload: {
      target_roles: string[];
      target_companies?: string[];
      industry?: string;
      tone?: LinkedInTone;
      top_achievement?: string;
    }) => {
      const response = await apiCall('linkedin-engagement-plan', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data as { plan: any; message: string };
    },
  });
};

export const useElevatorPitchMutation = () => {
  return useMutation({
    mutationFn: async (payload: { length: string; audience: string; key_selling_points: string[] }) => {
      const response = await apiCall('utilities-elevator-pitch', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { pitch }
    },
  });
};

export const useJdSummaryMutation = () => {
  return useMutation({
    mutationFn: async (payload: { job_description?: string, job_url?: string }) => {
      const response = await apiCall('utilities-jd-summary', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { summary, red_flags, key_requirements }
    },
  });
};

export const useAutofillMutation = () => {
  return useMutation({
    mutationFn: async (payload: { form_html: string; profile_data: any }) => {
      const response = await apiCall('utilities-autofill', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { mapped_fields }
    },
  });
};

export const useAnswerQuestionMutation = () => {
  return useMutation({
    mutationFn: async (payload: { question: string; context_source: 'profile' | 'resume'; resume_id?: string; job_url?: string }) => {
      const response = await apiCall('answer-question', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { answer: string }
    },
  });
};

/**
 * Fetch Cover Letter by ID
 */
export const useCoverLetterQuery = (id: string | null) => {
  return useQuery({
    queryKey: ['cover_letters', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

/**
 * Fetch Job Application (Match Analysis) by ID
 */
export const useJobApplicationQuery = (id: string | null) => {
  return useQuery({
    queryKey: ['job_applications', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

/**
 * Fetch List of Job Applications for Past Matches section
 */
export const useJobApplicationsListQuery = () => {
  return useQuery({
    queryKey: ['job_applications', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select('id, job_title, company, location, is_remote, ats_score, match_score, status, raw_jd, jd_summary, updated_at, created_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

/**
 * Manually create a Job Application (no AI analysis)
 */
export const useCreateJobApplicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { job_title: string; company: string; raw_jd: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          user_id: user.id,
          job_title: payload.job_title,
          company: payload.company,
          raw_jd: payload.raw_jd,
          status: 'SAVED',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', 'list'] });
    },
  });
};

/**
 * Update Job Application Status
 */
export const useUpdateJobApplicationStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('job_applications')
        .update({ status: payload.status, updated_at: new Date().toISOString() })
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', 'list'] });
    },
  });
};

/**
 * Delete Job Application Mutation
 */
export const useDeleteJobApplicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    },
  });
};

/**
 * Delete Resume Mutation
 */
export const useDeleteResumeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    },
  });
};

/**
 * Delete Cover Letter Mutation
 */
export const useDeleteCoverLetterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('cover_letters')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover_letters'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    },
  });
};

/**
 * Delete Mock Interview Mutation
 */
export const useDeleteMockInterviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mock_interviews')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock_interviews'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivities'] });
    },
  });
};

/**
 * Fetch Interview by ID
 */
export const useInterviewQuery = (id: string | null) => {
  return useQuery({
    queryKey: ['mock_interviews', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('mock_interviews')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

/**
 * Fetch Past Interviews
 */
export const usePastInterviewsQuery = () => {
  return useQuery({
    queryKey: ['mock_interviews', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_interviews')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

/**
 * Fetch Unified Recent Activities
 */
export const useRecentActivitiesQuery = () => {
  return useQuery({
    queryKey: ['recentActivities'],
    queryFn: async () => {
      const [
        { data: resumes },
        { data: covers },
        { data: jobs },
        { data: interviews }
      ] = await Promise.all([
        supabase.from('resumes').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
        supabase.from('cover_letters').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5),
        supabase.from('job_applications').select('id, job_title, company, updated_at').order('updated_at', { ascending: false }).limit(5),
        supabase.from('mock_interviews').select('id, role, updated_at').order('updated_at', { ascending: false }).limit(5)
      ]);

      const activities: Array<{ id: string; type: string; title: string; date: string; icon: string; color: string }> = [];
      
      if (resumes) {
        resumes.forEach(r => activities.push({ id: r.id, type: 'resume', title: r.title || 'Untitled Resume', date: r.updated_at, icon: 'document-text-outline', color: '#10b981' }));
      }
      if (covers) {
        covers.forEach(c => activities.push({ id: c.id, type: 'cover_letter', title: c.title || 'Untitled Cover Letter', date: c.updated_at, icon: 'mail-outline', color: '#6366f1' }));
      }
      if (jobs) {
        jobs.forEach(j => activities.push({ id: j.id, type: 'job_match', title: `${j.job_title || 'Unknown Role'} at ${j.company || 'Unknown Company'}`, date: j.updated_at, icon: 'search-outline', color: '#f59e0b' }));
      }
      if (interviews) {
        interviews.forEach(i => activities.push({ id: i.id, type: 'interview', title: `Mock Interview: ${i.role || 'General'}`, date: i.updated_at, icon: 'chatbubbles-outline', color: '#ec4899' }));
      }

      // Sort combined array by date descending
      return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    },
  });
};

