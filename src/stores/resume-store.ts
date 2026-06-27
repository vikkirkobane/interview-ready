import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Resume store for managing resumes and generation state
 */

export interface ResumeSection {
  summary?: string;
  experience?: any[];
  education?: any[];
  skills?: Record<string, string[]>;
  projects?: any[];
  certifications?: any[];
}

export interface Resume {
  id: string;
  title: string;
  templateId?: string;
  status: 'draft' | 'ready' | 'submitted';
  atsScore?: number;
  content?: ResumeSection;
  jobApplicationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ResumeState {
  resumes: Resume[];
  currentResume: Resume | null;
  generatingResumeId: string | null;
  loading: boolean;

  // Actions
  setResumes: (resumes: Resume[]) => void;
  setCurrentResume: (resume: Resume | null) => void;
  addResume: (resume: Resume) => void;
  updateResume: (id: string, resume: Partial<Resume>) => void;
  setGeneratingResumeId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set) => ({
      resumes: [],
      currentResume: null,
      generatingResumeId: null,
      loading: false,

      setResumes: (resumes) => set({ resumes }),
      setCurrentResume: (currentResume) => set({ currentResume }),
      addResume: (resume) =>
        set((state) => ({
          resumes: [resume, ...state.resumes],
          currentResume: resume,
        })),
      updateResume: (id, updates) =>
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
          currentResume:
            state.currentResume?.id === id
              ? { ...state.currentResume, ...updates }
              : state.currentResume,
        })),
      setGeneratingResumeId: (id) => set({ generatingResumeId: id }),
      setLoading: (loading) => set({ loading }),
      reset: () => set({
        resumes: [],
        currentResume: null,
        generatingResumeId: null,
        loading: false,
      }),
    }),
    {
      name: 'resume-store',
      storage: {
        getItem: async (name) => {
          const data = await AsyncStorage.getItem(name);
          return data ? JSON.parse(data) : null;
        },
        setItem: async (name, state) => {
          await AsyncStorage.setItem(name, JSON.stringify(state));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);
