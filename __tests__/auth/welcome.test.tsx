import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import WelcomeScreen from '../../app/(auth)/welcome';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;
const mockToast = Toast as any;

describe('Welcome screen — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
    mockToast.show.mockClear();
  });

  const renderScreen = () => renderWithProviders(<WelcomeScreen />);

  it('renders the brand, tagline and auth options', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Interview Ready')).toBeTruthy();
    expect(screen.getByText('Paste a job. Land the interview.')).toBeTruthy();
    expect(screen.getByText('Continue with Google')).toBeTruthy();
    expect(screen.getByText('Continue with LinkedIn')).toBeTruthy();
    expect(screen.getByLabelText('Sign up with Email')).toBeTruthy();
  });

  it('navigates to the email signup screen', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Sign up with Email'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/signup');
  });

  it('navigates to the login screen from the footer', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Sign In'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('routes to onboarding when a brand-new Google user signs in', async () => {
    const session = buildSession({
      user_metadata: { first_name: 'Jane', onboarding_completed: false },
    });
    mockSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/referral-code');
    });
  });

  it('routes returning Google users straight to the dashboard', async () => {
    const session = buildSession();
    mockSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('shows an error toast when Google sign-in fails', async () => {
    mockSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Provider error' },
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Sign in failed' })
      );
    });
  });

  it('silently swallows cancelled Google sign-in (no toast)', async () => {
    mockSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Sign in was cancelled' },
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with Google'));
    await waitFor(() => expect(mockToast.show).not.toHaveBeenCalled());
  });

  it('shows an error toast when LinkedIn sign-in fails', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'No LinkedIn connection' },
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with LinkedIn'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Sign in failed' })
      );
    });
  });
});
