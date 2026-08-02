import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Creates a fresh QueryClient with retries disabled so failed
 * queries resolve deterministically during tests.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

interface RenderWithProvidersOptions extends RenderOptions {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { queryClient, ...options }: RenderWithProvidersOptions = {}
) {
  const client = queryClient ?? createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(ui, { ...options, wrapper });
}

/** Waits a microtask turn for async state updates to flush. */
export function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
