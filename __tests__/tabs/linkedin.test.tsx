import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';

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

describe('LinkedIn Optimizer — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
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
});
