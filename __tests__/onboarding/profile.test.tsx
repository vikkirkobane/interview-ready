import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ProfileScreen from '../../app/(onboarding)/profile';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores } from '../helpers/stores';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
import { useAuthStore } from '../../src/stores/auth-store';
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

describe('Onboarding Step 2 (Profile) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockApiCall.mockResolvedValue({ data: { success: true }, error: null });
    router.__resetMockRouter();
    const session = buildSession({ user_metadata: { onboarding_completed: false } });
    useAuthStore.setState({ session, user: session.user });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  });

  const renderScreen = () => renderWithProviders(<ProfileScreen />);

  it('renders the profile form with suggested skills', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('STEP 2 OF 5')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Senior Product Manager')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Acme Corp')).toBeTruthy();
    expect(screen.getByText('Upload Resume (PDF) to auto-fill')).toBeTruthy();
    expect(screen.getByText('Data Encrypted')).toBeTruthy();
  });

  it('adds and removes skill chips', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Leadership'));
    expect(useOnboardingStore.getState().skills).toContain('Leadership');

    await fireEvent.press(screen.getByText('Effective Communication'));
    expect(useOnboardingStore.getState().skills).toContain('Effective Communication');

    await fireEvent.press(screen.getByText('Leadership'));
    expect(useOnboardingStore.getState().skills).not.toContain('Leadership');
  });

  it('saves the profile and continues to analyze', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. Senior Product Manager'),
      'Product Designer'
    );
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Stripe');
    await fireEvent.press(screen.getByText('Leadership'));
    await fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'profile-update',
        'PUT',
        expect.objectContaining({
          current_role: 'Product Designer',
          technical_skills: ['Leadership'],
        })
      );
    });
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(onboarding)/analyze');
    });
  });

  it('warns the user when they already have a saved resume', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { resume_raw_text: 'Existing resume text' },
        error: null,
      }),
    });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(
        screen.getByText(
          'You already have a resume saved. Uploading a new one will replace your existing resume.'
        )
      ).toBeTruthy();
    });
  });
});
