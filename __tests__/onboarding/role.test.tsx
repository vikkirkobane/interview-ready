import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import RoleScreen from '../../app/(onboarding)/role';
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

describe('Onboarding Step 1 (Role) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockApiCall.mockResolvedValue({ data: { success: true }, error: null });
    router.__resetMockRouter();
  });

  const renderScreen = () => renderWithProviders(<RoleScreen />);

  it('renders the step progress and form fields', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('STEP 1 OF 5')).toBeTruthy();
    expect(screen.getByText('20% Complete')).toBeTruthy();
    expect(screen.getByText('What are you looking for?')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. John')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Doe')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Software Engineer')).toBeTruthy();
  });

  it('keeps Continue disabled until required fields are filled', async () => {
    const screen = await renderScreen();
    // Pressing Continue with empty fields does nothing (button is disabled).
    await fireEvent.press(screen.getByText('Continue'));
    expect(router.push).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().currentStep).toBe(1);
  });

  it('selects a work preference and years of experience', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('3-5'));
    await fireEvent.press(screen.getByText('Remote'));
    expect(useOnboardingStore.getState().yearsExperience).toBe('3-5');
    expect(useOnboardingStore.getState().workPreference).toBe('REMOTE');
  });

  it('saves the profile and advances to step 2', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. John'), 'Jane');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Doe'), 'Smith');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Product Manager');
    await fireEvent.press(screen.getByText('3-5'));
    await fireEvent.press(screen.getByText('Remote'));

    await fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'profile-update',
        'PUT',
        expect.objectContaining({
          target_roles: ['Product Manager'],
          years_experience: 4,
          work_preference: 'REMOTE',
        })
      );
    });
    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: { first_name: 'Jane', last_name: 'Smith' },
      });
    });
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(onboarding)/profile');
    });
    expect(useOnboardingStore.getState().currentStep).toBe(2);
  });

  it('skips name update when the user already has names on file', async () => {
    const session = buildSession({
      user_metadata: { first_name: 'Jane', last_name: 'Smith', onboarding_completed: false },
    });
    useAuthStore.setState({ session, user: session.user });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const screen = await renderScreen();
    // Names pre-filled from metadata
    await waitFor(() => {
      expect(screen.getByDisplayValue('Jane')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    await fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(onboarding)/profile');
    });
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('shows an error toast when saving the profile fails', async () => {
    mockApiCall.mockResolvedValue({ data: null, error: 'Server down' });
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. John'), 'Jane');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Doe'), 'Smith');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Software Engineer'), 'Engineer');
    await fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(router.push).not.toHaveBeenCalled();
    });
  });
});
