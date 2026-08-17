import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import DiscoverScreen from '../../app/(onboarding)/discover';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores } from '../helpers/stores';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

jest.mock('../../src/lib/api', () => {
  const { createApiMock } = require('../helpers/supabase');
  return createApiMock();
});

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;

jest.setTimeout(15000);

describe('Onboarding Step 5 (Discover) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockApiCall.mockResolvedValue({ data: { success: true }, error: null });
    router.__resetMockRouter();
    const session = buildSession({ user_metadata: { onboarding_completed: false } });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  });

  const renderScreen = () => renderWithProviders(<DiscoverScreen />);

  it('renders the completion screen with feature discovery cards', async () => {
    const screen = await renderScreen();
    expect(screen.getByText("You're all set!")).toBeTruthy();
    expect(screen.getByText('EXPLORE TOOL')).toBeTruthy();
    expect(screen.getByText('START SESSION')).toBeTruthy();
    expect(screen.getByText('ANALYZE PROFILE')).toBeTruthy();
    expect(screen.getByText('Go to Dashboard')).toBeTruthy();
  });

  it('completes onboarding and navigates to the dashboard', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Go to Dashboard'));

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: { onboarding_completed: true },
      });
    });
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('profile-update', 'PUT', {
        onboarding_completed: true,
      });
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('still completes onboarding if the server call fails', async () => {
    mockApiCall.mockResolvedValue({ data: null, error: 'profile-update unavailable' });
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Go to Dashboard'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('finishes onboarding from a feature card', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('START SESSION'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
