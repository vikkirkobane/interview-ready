import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import SignupScreen from '../../app/(auth)/signup';
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
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

/** Simulates a successful LinkedIn OAuth code exchange (iOS path). */
const mockLinkedInSuccess = (session: any) => {
  mockSupabase.auth.signInWithOAuth.mockResolvedValue({
    data: { url: 'https://accounts.linkedin.com/oauth/...' },
    error: null,
  });
  mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
    data: { session },
    error: null,
  });
  mockOpenAuthSession.mockResolvedValue({
    type: 'success',
    url: 'interviewready://auth/callback?code=abc123',
  });
};

describe('Signup screen — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
  });

  const renderScreen = () => renderWithProviders(<SignupScreen />);

  const fillValidForm = async (screen: any) => {
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'Password123');
    await fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Password123');
  };

  it('renders the signup form', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Create your account')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('At least 8 characters')).toBeTruthy();
    expect(screen.getByPlaceholderText('Re-enter password')).toBeTruthy();
    expect(screen.getByLabelText('Create Account')).toBeTruthy();
  });

  it('validates that all fields are filled in', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Create Account'));
    expect(screen.getByText('Please fill in all required fields.')).toBeTruthy();
  });

  it('validates the email format', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'not-an-email');
    await fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'Password123');
    await fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Password123');
    await fireEvent.press(screen.getByLabelText('Create Account'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('requires a password of at least 8 characters', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'Pass123');
    await fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Pass123');
    await fireEvent.press(screen.getByLabelText('Create Account'));
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
  });

  it('requires a password with letters and numbers', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'passwordonly');
    await fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'passwordonly');
    await fireEvent.press(screen.getByLabelText('Create Account'));
    expect(
      screen.getByText('Password must contain at least one letter and one number.')
    ).toBeTruthy();
  });

  it('requires matching passwords', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'Password123');
    await fireEvent.changeText(screen.getByPlaceholderText('Re-enter password'), 'Password124');
    await fireEvent.press(screen.getByLabelText('Create Account'));
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('creates an account and routes new users to onboarding', async () => {
    const session = buildSession({
      user_metadata: { first_name: 'Jane', onboarding_completed: false },
    });
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    });

    const screen = await renderScreen();
    await fillValidForm(screen);
    await fireEvent.press(screen.getByLabelText('Create Account'));

    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'Password123',
        options: {
          data: { first_name: '', last_name: '' },
        },
      });
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/referral-code');
    });
  });

  it('informs the user to verify their email when no session is returned', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });

    const screen = await renderScreen();
    await fillValidForm(screen);
    await fireEvent.press(screen.getByLabelText('Create Account'));

    await waitFor(() => {
      expect(
        screen.getByText('Account created. Check your email to confirm your account, then sign in.')
      ).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalledWith('/(onboarding)/referral-code');
  });

  it('shows the server error when the email is already registered', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const screen = await renderScreen();
    await fillValidForm(screen);
    await fireEvent.press(screen.getByLabelText('Create Account'));

    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeTruthy();
    });
  });

  it('navigates to the login screen from the footer', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Sign In'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('goes back when the back button is pressed', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Go back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('signs in with Google for a returning user', async () => {
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

  it('routes a new (not-onboarded) Google user to the referral step', async () => {
    const session = buildSession({
      user_metadata: { first_name: 'New', onboarding_completed: false },
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
    expect(router.replace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it('shows the server error inline when Google sign-in fails', async () => {
    mockSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Google provider error' },
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(screen.getByText('Google provider error')).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it('routes a returning user to the dashboard after LinkedIn sign-in', async () => {
    const session = buildSession();
    mockLinkedInSuccess(session);

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with LinkedIn'));

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'linkedin_oidc' })
      );
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('routes a new (not-onboarded) LinkedIn user to the referral step', async () => {
    const session = buildSession({
      user_metadata: { first_name: 'Linked', onboarding_completed: false },
    });
    mockLinkedInSuccess(session);

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with LinkedIn'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/referral-code');
    });
    expect(router.replace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it('shows the server error inline when LinkedIn sign-in fails', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'Provider not configured' },
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with LinkedIn'));

    await waitFor(() => {
      expect(screen.getByText('Provider not configured')).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalledWith('/(tabs)');
  });
});
