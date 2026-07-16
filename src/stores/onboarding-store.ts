import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  currentStep: number; // 0–5
  completed: boolean;

  // Step data
  firstName: string;
  lastName: string;
  targetRole: string;
  yearsExperience: string;
  workPreference: 'REMOTE' | 'HYBRID' | 'ONSITE';
  currentRole: string;
  company: string;
  skills: string[];
  jdText: string;
  jdUrl: string;
  analysisId: string | null;
  resumeId: string | null;

  // Referral
  referralCode: string | null;        // Deep link referral code
  referralCodeSkipped: boolean;       // User explicitly skipped referral step

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setFirstName: (name: string) => void;
  setLastName: (name: string) => void;
  setTargetRole: (role: string) => void;
  setYearsExperience: (years: string) => void;
  setWorkPreference: (pref: 'REMOTE' | 'HYBRID' | 'ONSITE') => void;
  setCurrentRole: (role: string) => void;
  setCompany: (company: string) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  setSkills: (skills: string[]) => void;
  setJdText: (text: string) => void;
  setJdUrl: (url: string) => void;
  setAnalysisId: (id: string) => void;
  setResumeId: (id: string) => void;
  setReferralCode: (code: string | null) => void;
  clearReferralCode: () => void;
  setReferralCodeSkipped: (skipped: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 1,
      completed: false,
      firstName: '',
      lastName: '',
      targetRole: '',
      yearsExperience: '',
      workPreference: 'HYBRID',
      currentRole: '',
      company: '',
      skills: [],
      jdText: '',
      jdUrl: '',
      analysisId: null,
      resumeId: null,
      referralCode: null,
      referralCodeSkipped: false,

      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 5) })),
      prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
      setFirstName: (name) => set({ firstName: name }),
      setLastName: (name) => set({ lastName: name }),
      setTargetRole: (role) => set({ targetRole: role }),
      setYearsExperience: (years) => set({ yearsExperience: years }),
      setWorkPreference: (pref) => set({ workPreference: pref }),
      setCurrentRole: (role) => set({ currentRole: role }),
      setCompany: (company) => set({ company }),
      addSkill: (skill) => set((s) => ({
        skills: s.skills.includes(skill) ? s.skills : [...s.skills, skill],
      })),
      removeSkill: (skill) => set((s) => ({
        skills: s.skills.filter((sk) => sk !== skill),
      })),
      setSkills: (skills) => set({ skills }),
      setJdText: (text) => set({ jdText: text }),
      setJdUrl: (url) => set({ jdUrl: url }),
      setAnalysisId: (id) => set({ analysisId: id }),
      setResumeId: (id) => set({ resumeId: id }),
      setReferralCode: (code) => set({ referralCode: code }),
      clearReferralCode: () => set({ referralCode: null }),
      setReferralCodeSkipped: (skipped) => set({ referralCodeSkipped: skipped }),
      completeOnboarding: () => set({ completed: true }),
      resetOnboarding: () => set({
        currentStep: 1,
        completed: false,
        firstName: '',
        lastName: '',
        targetRole: '',
        yearsExperience: '',
        workPreference: 'HYBRID',
        currentRole: '',
        company: '',
        skills: [],
        jdText: '',
        jdUrl: '',
        analysisId: null,
        resumeId: null,
        referralCode: null,
        referralCodeSkipped: false,
      }),
    }),
    {
      name: 'onboarding-storage', // unique name
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
