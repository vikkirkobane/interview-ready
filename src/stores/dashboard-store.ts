import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Dashboard store for home screen state
 * Tracks recent actions, stats, and UI state
 */

export interface RecentAction {
  id: string;
  type: 'resume' | 'interview' | 'cover_letter' | 'job';
  title: string;
  subtitle?: string;
  status: 'draft' | 'complete' | 'pending';
  createdAt: Date;
  actionUrl?: string;
}

export interface DashboardStats {
  applicationsApplied: number;
  interviewsScheduled: number;
  offersReceived: number;
  profileCompleteness: number;
  interviewStreak: number;
  creditsAvailable: number;
}

interface DashboardState {
  stats: DashboardStats | null;
  recentActions: RecentAction[];
  loading: boolean;
  lastRefreshTime: number | null;

  // Actions
  setStats: (stats: DashboardStats) => void;
  setRecentActions: (actions: RecentAction[]) => void;
  addRecentAction: (action: RecentAction) => void;
  setLoading: (loading: boolean) => void;
  updateLastRefreshTime: () => void;
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      stats: null,
      recentActions: [],
      loading: false,
      lastRefreshTime: null,

      setStats: (stats) => set({ stats }),
      setRecentActions: (recentActions) => set({ recentActions }),
      addRecentAction: (action) =>
        set((state) => ({
          recentActions: [action, ...state.recentActions].slice(0, 5), // Keep last 5
        })),
      setLoading: (loading) => set({ loading }),
      updateLastRefreshTime: () => set({ lastRefreshTime: Date.now() }),
      reset: () => set({
        stats: null,
        recentActions: [],
        loading: false,
        lastRefreshTime: null,
      }),
    }),
    {
      name: 'dashboard-store',
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
