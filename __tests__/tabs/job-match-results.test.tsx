import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import JobMatchResultsScreen from '../../app/(tabs)/job-match-results';
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

const APP_ROW = {
  id: 'app-1',
  job_title: 'Senior Backend Engineer',
  company: 'Acme',
  match_score: 88,
  ats_score: 85,
  jd_summary: JSON.stringify({
    fit_score: 88,
    required_skills: [{ skill: 'Go' }, { skill: 'Kubernetes' }],
    missing_bonus_skills: [{ skill: 'Rust' }],
    match_analysis: [{ type: 'SUCCESS', title: 'Systems Architecture', score_percentage: 100 }],
  }),
  updated_at: '2026-08-01T10:00:00Z',
};

describe('Job Match Results — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    router.__resetMockRouter();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    router.__setMockParams({ id: 'app-1', fromList: 'true' });
  });

  const renderScreen = () => renderWithProviders(<JobMatchResultsScreen />);

  it('renders the match analysis', async () => {
    mockSupabase.__mockHelpers.tables['job_applications'] = [APP_ROW];
    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Match Analysis: Senior Backend Engineer @ Acme')).toBeTruthy();
    });
    expect(screen.getByText('STRONG CANDIDATE')).toBeTruthy();
    expect(screen.getByText('Skills Inventory')).toBeTruthy();
    expect(screen.getByText('CRITICAL GAPS')).toBeTruthy();
    expect(screen.getByText('Download Roadmap')).toBeTruthy();
  });

  it('goes back to the analyzer', async () => {
    mockSupabase.__mockHelpers.tables['job_applications'] = [APP_ROW];
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Match Analysis: Senior Backend Engineer @ Acme')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Back'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/job-analyzer');
  });

  it('shows an error state when the analysis is missing', async () => {
    router.__setMockParams({ id: 'missing' });
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Failed to load match results.')).toBeTruthy();
    });
  });

  it('deletes the analysis after confirmation', async () => {
    mockSupabase.__mockHelpers.tables['job_applications'] = [APP_ROW];
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Match Analysis: Senior Backend Engineer @ Acme')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Delete Analysis'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Analysis',
      expect.stringContaining('Are you sure you want to delete this job match analysis?'),
      expect.any(Array)
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirm = buttons.find((b: any) => b.text === 'Delete');
    await confirm.onPress();

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/job-analyzer');
    });
  });
});
