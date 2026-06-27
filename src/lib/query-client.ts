import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * TanStack Query client configuration for Interview Ready
 * Optimized for mobile with appropriate cache times
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (garbage collection time)
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'always', // Always retry on network errors
    },
    mutations: {
      retry: 1,
      networkMode: 'always',
    },
  },
});

/**
 * Provider component for TanStack Query
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}
