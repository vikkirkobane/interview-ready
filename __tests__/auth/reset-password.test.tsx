import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ResetPasswordScreen from '../../app/reset-password';
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

describe('Reset Password screen — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
  });

  const renderScreen = () => renderWithProviders(<ResetPasswordScreen />);

  it('shows a verifying state while the recovery session is checked', async () => {
    mockSupabase.auth.getSession.mockReturnValue(new Promise(() => {}));
    const screen = await renderScreen();
    expect(screen.getByText('Verifying reset link...')).toBeTruthy();
  });

  it('rejects an invalid or expired reset link', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Invalid or expired reset link. Please request a new one.')).toBeTruthy();
    });
  });

  it('validates the new password requirements', async () => {
    const session = buildSession();
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Set New Password')).toBeTruthy();
    });

    // Too short
    await fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'abc123');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirm new password'), 'abc123');
    await fireEvent.press(screen.getByLabelText('Reset Password'));
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();

    // No number
    await fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'passwordonly');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirm new password'), 'passwordonly');
    await fireEvent.press(screen.getByLabelText('Reset Password'));
    expect(screen.getByText('Password must contain both letters and numbers.')).toBeTruthy();

    // Mismatch
    await fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'NewPassword1');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirm new password'), 'NewPassword2');
    await fireEvent.press(screen.getByLabelText('Reset Password'));
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('updates the password and shows the success screen', async () => {
    const session = buildSession();
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabase.auth.updateUser.mockResolvedValue({ data: { user: session.user }, error: null });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Set New Password')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'NewPassword1');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirm new password'), 'NewPassword1');
    await fireEvent.press(screen.getByLabelText('Reset Password'));

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewPassword1' });
    });
    await waitFor(() => {
      expect(screen.getByText('Password Updated!')).toBeTruthy();
    });
  });

  it('navigates to sign in after a successful reset', async () => {
    const session = buildSession();
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabase.auth.updateUser.mockResolvedValue({ data: { user: session.user }, error: null });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Set New Password')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'NewPassword1');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirm new password'), 'NewPassword1');
    await fireEvent.press(screen.getByLabelText('Reset Password'));

    await waitFor(() => {
      expect(screen.getByText('Password Updated!')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('Go to Sign In'));
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('warns the user when the reset link has expired', async () => {
    const session = buildSession();
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabase.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'session_expired: no session found' },
    });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Set New Password')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText('Enter new password'), 'NewPassword1');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirm new password'), 'NewPassword1');
    await fireEvent.press(screen.getByLabelText('Reset Password'));

    await waitFor(() => {
      expect(
        screen.getByText('Reset link has expired. Please request a new one from the login screen.')
      ).toBeTruthy();
    });
  });
});
