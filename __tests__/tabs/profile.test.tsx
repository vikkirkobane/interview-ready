import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

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
});
