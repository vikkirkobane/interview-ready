import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import JobFitScreen from '../../app/(tabs)/job-analyzer';
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

const JD_TEXT =
  'We are hiring a Senior Backend Engineer with 5+ years of Go and Kubernetes experience building distributed systems. Cloud architecture and microservices are a must.';

const ANALYSIS = {
  job_id: 'job-9',
  analysis: {
    recommendation_level: 'GOOD_FIT',
    required_skills: [{ skill: 'Go' }],
    nice_to_haves: [],
    red_flags: [],
  },
};

describe('Job Fit Analyzer — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  });

  const renderScreen = () => renderWithProviders(<JobFitScreen />);

  it('renders the analyzer form', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Job Fit Analyzer')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('Paste the full job listing here to start the AI gap analysis...')
    ).toBeTruthy();
    expect(screen.getByText('Analyze Job Match')).toBeTruthy();
  });

  it('analyzes a pasted job description and opens the results screen', async () => {
    mockApiCall.mockResolvedValue({ data: ANALYSIS, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Paste the full job listing here to start the AI gap analysis...'),
      JD_TEXT
    );
    await fireEvent.press(screen.getByText('Analyze Job Match'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'jobs-analyze',
        'POST',
        expect.objectContaining({ job_description: JD_TEXT })
      );
    });
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/job-match-results?id=job-9');
    });
  });

  it('shows a validation toast when nothing is provided', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Analyze Job Match'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Input missing' })
      );
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('lists past job matches', async () => {
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      {
        id: 'app-1',
        job_title: 'Senior Backend Engineer',
        company: 'Acme',
        location: 'Remote',
        is_remote: true,
        ats_score: 78,
        match_score: 82,
        status: 'SAVED',
        raw_jd: JD_TEXT,
        jd_summary: null,
        updated_at: '2026-08-01T10:00:00Z',
        created_at: '2026-08-01T09:00:00Z',
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Senior Backend Engineer')).toBeTruthy();
    });
    expect(screen.getByText('82%')).toBeTruthy();
  });

  it('shows an empty state when there are no past matches', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('No past job matches found. Paste a JD above to start!')).toBeTruthy();
    });
  });

  it('opens a past match from the list', async () => {
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      {
        id: 'app-2',
        job_title: 'Frontend Engineer',
        company: 'Stripe',
        location: 'NYC',
        is_remote: false,
        ats_score: 60,
        match_score: 65,
        status: 'APPLIED',
        raw_jd: JD_TEXT,
        jd_summary: null,
        updated_at: '2026-07-20T10:00:00Z',
        created_at: '2026-07-20T09:00:00Z',
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Frontend Engineer')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Frontend Engineer'));
    expect(router.push).toHaveBeenCalledWith('/job-match-results?id=app-2&fromList=true');
  });
});
