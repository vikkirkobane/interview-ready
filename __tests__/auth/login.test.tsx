import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import LoginScreen from '../../app/(auth)/login';
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

describe('Login screen — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    (router as any).__resetMockRouter?.();
  });

  const renderScreen = () => renderWithProviders(<LoginScreen />);

  it('renders the login UI with email, password and social options', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(screen.getByLabelText('Sign In')).toBeTruthy();
    expect(screen.getByText('Continue with Google')).toBeTruthy();
    expect(screen.getByText('Continue with LinkedIn')).toBeTruthy();
  });

  it('shows an error when the user submits an empty form', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Sign In'));
    expect(screen.getByText('Please fill in all fields.')).toBeTruthy();
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('shows an error for an invalid email format', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'not-an-email');
    await fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password123');
    await fireEvent.press(screen.getByLabelText('Sign In'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('signs in an onboarded user and navigates to the dashboard', async () => {
    const session = buildSession();
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password123');
    await fireEvent.press(screen.getByLabelText('Sign In'));

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('routes a returning-but-not-onboarded user to the referral step', async () => {
    const session = buildSession({
      user_metadata: { first_name: 'Test', onboarding_completed: false },
    });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'new@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'password123');
    await fireEvent.press(screen.getByLabelText('Sign In'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(onboarding)/referral-code');
    });
  });

  it('shows the server error inline when credentials are invalid', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Enter your password'), 'wrong-password');
    await fireEvent.press(screen.getByLabelText('Sign In'));

    await waitFor(() => {
      expect(
        screen.getByText('Incorrect email or password. Please try again.')
      ).toBeTruthy();
    });
    expect(router.replace).not.toHaveBeenCalledWith('/(tabs)');
  });

  it('signs in an onboarded user with Google', async () => {
    const session = buildSession();
    mockSupabase.auth.signInWithIdToken.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithIdToken).toHaveBeenCalled();
    });
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

  it('routes an onboarded user to the dashboard after LinkedIn sign-in', async () => {
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
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
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

  it('toggles the password visibility', async () => {
    const screen = await renderScreen();
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByText('Show'));
    expect(screen.getByText('Hide')).toBeTruthy();
  });

  it('navigates to the forgot-password screen', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Forgot password?'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  it('navigates to the signup screen from the footer', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Sign Up'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/signup');
  });

  it('goes back when the back button is pressed', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Go back'));
    expect(router.back).toHaveBeenCalled();
  });
});
