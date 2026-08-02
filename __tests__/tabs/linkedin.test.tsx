import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import LinkedinScreen from '../../app/(tabs)/linkedin';
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

describe('LinkedIn Optimizer — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    // Seed a profile row so updateProfile can succeed after an import
    mockSupabase.__mockHelpers.tables['user_profiles'] = [{
      id: 'p1',
      user_id: 'test-user-id',
      summary: '',
      work_history: [],
      technical_skills: [],
      soft_skills: [],
      target_roles: [],
    }];
  });

  const renderScreen = () => renderWithProviders(<LinkedinScreen />);

  it('shows the connect prompt for users not linked to LinkedIn', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Connect with LinkedIn')).toBeTruthy();
    expect(screen.getByText('Sign in with LinkedIn')).toBeTruthy();
  });

  it('lets users skip and enter content manually', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => {
      expect(screen.getByText('Auto-Import Profile')).toBeTruthy();
    });
    expect(screen.getByText('Import My LinkedIn')).toBeTruthy();
  });

  it('imports a profile via URL and populates the wizard + app profile', async () => {
    mockApiCall.mockResolvedValue({
      data: {
        data: {
          headline: 'Senior Product Manager | SaaS',
          about: 'I build products people love.',
          experience: [{ title: 'Senior PM', company: 'Google', description: 'Led growth' }],
          skills: ['Product Strategy', 'SQL'],
        },
        message: 'Profile successfully scraped',
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => expect(screen.getByText('Auto-Import Profile')).toBeTruthy());

    await fireEvent.changeText(
      screen.getByPlaceholderText('https://linkedin.com/in/your-profile'),
      'https://linkedin.com/in/janedoe'
    );
    await fireEvent.press(screen.getByText('Import My LinkedIn'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'linkedin-scrape',
        'POST',
        { linkedin_url: 'https://linkedin.com/in/janedoe' }
      );
    });
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Profile Imported successfully!' })
      );
    });

    // Lands on the review step with the imported content pre-filled
    await waitFor(() => {
      expect(screen.getByText('Review & Complete Content')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('Senior Product Manager | SaaS')).toBeTruthy();
    expect(screen.getByDisplayValue('I build products people love.')).toBeTruthy();
  });

  it('rejects invalid LinkedIn URLs without calling the API', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => expect(screen.getByText('Auto-Import Profile')).toBeTruthy());

    await fireEvent.changeText(
      screen.getByPlaceholderText('https://linkedin.com/in/your-profile'),
      'https://example.com/not-linkedin'
    );
    await fireEvent.press(screen.getByText('Import My LinkedIn'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Invalid URL' })
      );
    });
    expect(mockApiCall).not.toHaveBeenCalledWith(
      'linkedin-scrape',
      'POST',
      expect.anything()
    );
  });
});

