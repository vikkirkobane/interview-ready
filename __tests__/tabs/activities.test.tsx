import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ActivitiesScreen from '../../app/(tabs)/activities';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('All Recent Activity — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<ActivitiesScreen />);

  it('renders the activity header', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('All Recent Activity')).toBeTruthy();
  });

  it('shows recent activity from multiple sources', async () => {
    mockSupabase.__mockHelpers.tables['resumes'] = [
      { id: 'r1', title: 'Product Designer Resume', updated_at: '2026-08-01T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['cover_letters'] = [
      { id: 'c1', title: 'Stripe Cover Letter', updated_at: '2026-08-01T09:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      {
        id: 'j1',
        job_title: 'Backend Engineer',
        company: 'Acme',
        updated_at: '2026-08-01T08:00:00Z',
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Product Designer Resume')).toBeTruthy();
    });
    expect(screen.getByText('Stripe Cover Letter')).toBeTruthy();
    expect(screen.getByText('Backend Engineer at Acme')).toBeTruthy();
  });

  it('opens a resume activity', async () => {
    mockSupabase.__mockHelpers.tables['resumes'] = [
      { id: 'r1', title: 'Product Designer Resume', updated_at: '2026-08-01T10:00:00Z' },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Product Designer Resume')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Product Designer Resume'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/new-resume?id=r1&fromList=true');
  });

  it('shows an empty state', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('No recent activities found.')).toBeTruthy();
    });
  });
});
