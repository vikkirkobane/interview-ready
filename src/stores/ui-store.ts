import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UIState {
  // Theme — default is dark
  isDark: boolean;
  setIsDark: (v: boolean) => void;

  // Loading states for AI operations
  isAnalyzing: boolean;
  isGeneratingResume: boolean;
  isGeneratingCoverLetter: boolean;

  // Modals
  showUpgradeModal: boolean;
  showExportSheet: boolean;

  // Actions
  setAnalyzing: (v: boolean) => void;
  setGeneratingResume: (v: boolean) => void;
  setGeneratingCoverLetter: (v: boolean) => void;
  setUpgradeModal: (v: boolean) => void;
  setExportSheet: (v: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Dark mode is the default
      isDark: true,
      setIsDark: (v) => set({ isDark: v }),

      isAnalyzing: false,
      isGeneratingResume: false,
      isGeneratingCoverLetter: false,
      showUpgradeModal: false,
      showExportSheet: false,

      setAnalyzing: (v) => set({ isAnalyzing: v }),
      setGeneratingResume: (v) => set({ isGeneratingResume: v }),
      setGeneratingCoverLetter: (v) => set({ isGeneratingCoverLetter: v }),
      setUpgradeModal: (v) => set({ showUpgradeModal: v }),
      setExportSheet: (v) => set({ showExportSheet: v }),
    }),
    {
      name: 'ui-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the theme preference
      partialize: (state) => ({ isDark: state.isDark }),
    }
  )
);
