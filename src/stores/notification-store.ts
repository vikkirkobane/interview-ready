import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  reset: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [
        {
          id: 'welcome-notification',
          title: 'Welcome to Interview Ready!',
          description: 'Start by updating your profile to get tailored job matches.',
          timestamp: new Date().toISOString(),
          read: false,
          type: 'info',
        }
      ],
      
      addNotification: (notification) => {
        const newNotification: AppNotification = {
          ...notification,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          read: false,
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
      },
      
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },
      
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },
      
      clearAll: () => {
        set({ notifications: [] });
      },

      reset: () => {
        set({
          notifications: [
            {
              id: 'welcome-notification',
              title: 'Welcome to Interview Ready!',
              description: 'Start by updating your profile to get tailored job matches.',
              timestamp: new Date().toISOString(),
              read: false,
              type: 'info',
            }
          ]
        });
      },
      
      unreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

