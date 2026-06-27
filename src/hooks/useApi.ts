import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '../lib/api';
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
    mutationFn: async (formData: FormData) => {
      const response = await apiCall('profile-parse-resume', 'POST', formData);
      if (response.error) throw new Error(response.error);
      return response.data as {
        current_role: string;
        company: string;
        technical_skills: string[];
      };
    },
  });
};

/**
 * Analyze Job Description Mutation
 */
export const useAnalyzeJobMutation = () => {
  return useMutation({
    mutationFn: async (payload: { jdText?: string; jdUrl?: string; profileData?: any }) => {
      const finalPayload: any = {};
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
      return response.data; // { id: string, analysis: JD_ANALYSIS_SCHEMA }
    },
  });
};

/**
 * Create Resume Mutation
 */
export const useCreateResumeMutation = () => {
  return useMutation({
    mutationFn: async (payload: { title: string; job_analysis_id?: string }) => {
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
    mutationFn: async (payload: { role: string; type: string; difficulty: string; resume_id?: string }) => {
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
    mutationFn: async (payload: { resume_id?: string; job_description?: string; tone: string; target_company: string; target_role: string }) => {
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

export const useLinkedinAnalyzeMutation = () => {
  return useMutation({
    mutationFn: async (payload: { profile_url: string; target_role?: string }) => {
      const response = await apiCall('linkedin-analyze', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { score, improvements }
    },
  });
};

export const useLinkedinOptimizeMutation = () => {
  return useMutation({
    mutationFn: async (payload: { section: string; current_text: string }) => {
      const response = await apiCall('linkedin-optimize', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { optimized_text }
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
    mutationFn: async (payload: { jd_text: string }) => {
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
    mutationFn: async (payload: { question: string; context_source: 'profile' | 'resume'; resume_id?: string }) => {
      const response = await apiCall('answer-question', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { answer: string }
    },
  });
};
