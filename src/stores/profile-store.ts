import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  userId: string;
  phone: string;
  location: string;
  country: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  summary: string;
  currentRole: string;
  yearsExperience: number;
  targetRoles: string[];
  targetIndustries: string[];
  workPreference: 'REMOTE' | 'HYBRID' | 'ONSITE';
  technicalSkills: string[];
  softSkills: string[];
  languages: any[];
  certifications: any[];
  education: any[];
  workHistory: any[];
  projects: any[];
  profileCompleteness: number;
}

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: true,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false, error: 'Not authenticated' });
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        set({ loading: false, error: error.message });
        return;
      }

      set({ profile: data as any, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message });
    }
  },

  updateProfile: async (updates) => {
    const profile = get().profile;
    if (!profile) return { error: 'No profile loaded' };

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) return { error: error.message };

    set({ profile: { ...profile, ...updates } as any });
    return { error: null };
  },

  clearProfile: () => set({ profile: null, loading: true, error: null }),
}));
