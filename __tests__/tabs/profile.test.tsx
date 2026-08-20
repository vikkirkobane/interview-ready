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

  it('does not render Link New Account or Sign Out on the profile screen', async () => {
    const screen = await renderScreen();
    expect(screen.queryByText('Link New Account')).toBeNull();
    expect(screen.queryByText('Linked Accounts')).toBeNull();
    expect(screen.queryByText('Sign Out')).toBeNull();
  });
});
