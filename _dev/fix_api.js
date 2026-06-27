const fs = require('fs');
const path = require('path');

const content = `import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '../lib/api';

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
 * Analyze Job Description Mutation
 */
export const useAnalyzeJobMutation = () => {
  return useMutation({
    mutationFn: async (payload: { jdText?: string; jdUrl?: string }) => {
      const response = await apiCall('jobs-analyze', 'POST', payload);
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
      const response = await apiCall(\`resumes/\${resumeId}\`, 'GET');
      if (response.error) throw new Error(response.error);
      return response.data.resume;
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
      const response = await apiCall('resumes', 'GET');
      if (response.error) throw new Error(response.error);
      return response.data.resumes; // Array of resumes
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
    mutationFn: async (payload: { session_id: string; message: string; history: any[] }) => {
      const response = await apiCall('interviews-message', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { reply }
    },
  });
};

export const useInterviewFeedbackMutation = () => {
  return useMutation({
    mutationFn: async (payload: { session_id: string; history: any[] }) => {
      const response = await apiCall('interviews-feedback', 'POST', payload);
      if (response.error) throw new Error(response.error);
      return response.data; // { feedback, score, areas_for_improvement }
    },
  });
};

export const useCreateCoverLetterMutation = () => {
  return useMutation({
    mutationFn: async (payload: { resume_id?: string; job_description?: string; tone: string; target_company: string; target_role: string }) => {
      const response = await apiCall('cover-letters-create', 'POST', payload);
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
`;

fs.writeFileSync(path.join(process.cwd(), 'src/hooks/useApi.ts'), content);
console.log('Restored useApi.ts successfully.');
