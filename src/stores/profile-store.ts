import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  user_id: string;
  phone: string;
  location: string;
  country: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  summary: string;
  current_role: string;
  years_experience: number;
  target_roles: string[];
  target_industries: string[];
  work_preference: 'REMOTE' | 'HYBRID' | 'ONSITE';
  technical_skills: string[];
  soft_skills: string[];
  languages: any[];
  certifications: any[];
  education: any[];
  work_history: any[];
  projects: any[];
  profile_completeness: number;
  [key: string]: any; // Allow additional DB columns
}

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Record<string, any>) => Promise<{ error: string | null }>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
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

          set({ profile: data as UserProfile, loading: false });
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

        await get().fetchProfile();
        return { error: null };
      },

      clearProfile: () => set({ profile: null, loading: false, error: null }),
    }),
    {
      name: 'profile-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist the profile data, not loading/error state
        profile: state.profile,
      }),
    }
  )
);
