import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ForgotPasswordScreen from '../../app/(auth)/forgot-password';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores } from '../helpers/stores';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('Forgot Password screen — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  const renderScreen = () => renderWithProviders(<ForgotPasswordScreen />);

  it('renders the forgot password form', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Forgot Password?')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByLabelText('Send Reset Link')).toBeTruthy();
  });

  it('requires an email address', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Send Reset Link'));
    expect(screen.getByText('Please enter your email address.')).toBeTruthy();
  });

  it('rejects an invalid email format', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'not-an-email');
    await fireEvent.press(screen.getByLabelText('Send Reset Link'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('sends a reset link and confirms via alert + success message', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.press(screen.getByLabelText('Send Reset Link'));

    await waitFor(() => {
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('jane@example.com', {
        redirectTo: 'interviewready://reset-password',
      });
    });
    await waitFor(() => {
      expect(screen.getByText('✓ Password reset email sent! Check your inbox.')).toBeTruthy();
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Check your email',
      expect.stringContaining('password reset link'),
      expect.any(Array)
    );
  });

  it('pressing OK on the alert navigates back', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.press(screen.getByLabelText('Send Reset Link'));

    await waitFor(() => {
      expect(screen.getByText('✓ Password reset email sent! Check your inbox.')).toBeTruthy();
    });

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const buttons = alertCalls[0][2];
    buttons[0].onPress();
    expect(router.back).toHaveBeenCalled();
  });

  it('shows the reset error from the server', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: 'Email not found' },
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await fireEvent.press(screen.getByLabelText('Send Reset Link'));

    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeTruthy();
    });
  });

  it('navigates back to sign in from the footer', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Sign In'));
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });
});
