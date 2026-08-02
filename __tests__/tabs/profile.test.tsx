import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

import ProfileScreen from '../../app/(tabs)/profile';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
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
const mockToast = Toast as any;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

const emailIdentity = {
  id: 'e1',
  provider: 'email',
  provider_id: 'ep1',
  identity_data: { email: 'test@example.com' },
};
const googleIdentity = {
  id: 'g1',
  provider: 'google',
  provider_id: 'gp1',
  identity_data: { email: 'google@example.com' },
};
const linkedinIdentity = {
  id: 'l1',
  provider: 'linkedin_oidc',
  provider_id: 'lp1',
  identity_data: { email: 'linked@example.com' },
};

describe('Profile — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockApiCall.mockResolvedValue({ data: { success: true }, error: null });
    mockToast.show.mockClear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabase.auth.getUserIdentities.mockResolvedValue({
      data: { identities: [emailIdentity] },
      error: null,
    });
  });

  const renderScreen = () => renderWithProviders(<ProfileScreen />);

  it('renders the profile with experience section', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getByText('0% Complete')).toBeTruthy();
    expect(screen.getByText('Experience')).toBeTruthy();
    expect(screen.getByText('No work experience added yet.')).toBeTruthy();
  });

  it('opens the edit basic info modal', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Test User'));
    await waitFor(() => {
      expect(screen.getByText('Edit Basic Info')).toBeTruthy();
    });
  });

  it('saves basic info changes', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Test User'));
    await waitFor(() => {
      expect(screen.getByText('Edit Basic Info')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText('Enter first name'), 'Janet');
    await fireEvent.press(screen.getByLabelText('Save Changes'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'profile-update',
        'PUT',
        expect.objectContaining({ first_name: 'Janet' })
      );
    });
  });

  it('shows the upload resume action', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Upload Resume to Auto-Fill')).toBeTruthy();
  });

  it('navigates to the LinkedIn importer when tapping the import button', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Import Profile from LinkedIn'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/linkedin?mode=import');
  });

  describe('Linked Accounts', () => {
    it('renders linked identities with canonical provider names', async () => {
      mockSupabase.auth.getUserIdentities.mockResolvedValue({
        data: { identities: [emailIdentity, googleIdentity, linkedinIdentity] },
        error: null,
      });

      const screen = await renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Linked Accounts')).toBeTruthy();
        expect(screen.getByText('Email')).toBeTruthy();
        expect(screen.getByText('Google')).toBeTruthy();
        expect(screen.getByText('LinkedIn')).toBeTruthy();
      });

      // Linked providers should not offer a "Link" button anymore
      expect(screen.queryByText('Link Google')).toBeNull();
      expect(screen.queryByText('Link LinkedIn')).toBeNull();
    });

    it('links a Google account and shows a success toast', async () => {
      mockSupabase.auth.linkIdentity.mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/...' },
        error: null,
      });
      mockOpenAuthSession.mockResolvedValue({
        type: 'success',
        url: 'interviewready://auth/callback?code=link-code-123',
      });
      mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: buildSession() },
        error: null,
      });

      const screen = await renderScreen();
      await waitFor(() => expect(screen.getByText('Link Google')).toBeTruthy());

      // After the link completes, the provider shows up in the identities list
      mockSupabase.auth.getUserIdentities.mockResolvedValue({
        data: { identities: [emailIdentity, googleIdentity] },
        error: null,
      });

      await fireEvent.press(screen.getByText('Link Google'));

      await waitFor(() => {
        expect(mockSupabase.auth.linkIdentity).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'google' })
        );
      });
      await waitFor(() => {
        expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('link-code-123');
      });
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', text1: 'Account linked successfully!' })
        );
      });
      await waitFor(() => {
        expect(screen.getByText('Google')).toBeTruthy();
      });
    });

    it('shows an error toast when linking fails', async () => {
      mockSupabase.auth.linkIdentity.mockResolvedValue({
        data: null,
        error: { message: 'Provider not configured' },
      });

      const screen = await renderScreen();
      await waitFor(() => expect(screen.getByText('Link Google')).toBeTruthy());

      await fireEvent.press(screen.getByText('Link Google'));

      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Failed to link account' })
        );
      });
    });

    it('unlinks an identity after confirmation', async () => {
      mockSupabase.auth.getUserIdentities.mockResolvedValue({
        data: { identities: [emailIdentity, googleIdentity] },
        error: null,
      });
      mockSupabase.auth.unlinkIdentity.mockResolvedValue({ error: null });

      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const screen = await renderScreen();

      await waitFor(() => expect(screen.getAllByText('Unlink').length).toBe(2));

      await fireEvent.press(screen.getAllByText('Unlink')[1]);

      // Confirm via the destructive "Unlink" alert button
      const alertCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
      const confirmBtn = (alertCall[2] as any[]).find((b) => b.text === 'Unlink');
      expect(confirmBtn).toBeTruthy();

      mockSupabase.auth.getUserIdentities.mockResolvedValue({
        data: { identities: [emailIdentity] },
        error: null,
      });
      confirmBtn.onPress();

      await waitFor(() => {
        expect(mockSupabase.auth.unlinkIdentity).toHaveBeenCalledWith('g1');
      });
      await waitFor(() => {
        expect(mockToast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', text1: 'Account unlinked successfully!' })
        );
      });

      alertSpy.mockRestore();
    });
  });
});
