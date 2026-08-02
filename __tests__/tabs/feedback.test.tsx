import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import FeedbackScreen from '../../app/(tabs)/feedback';
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

jest.mock('../../src/lib/interviewExport', () => ({
  exportInterviewReportPDF: jest.fn(async () => {}),
}));

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;

const FEEDBACK = {
  overall_score: 84,
  recommendation: 'Strong candidate — recommend moving forward.',
  dimension_scores: {
    communication: 88,
    technical_knowledge: 80,
    problem_solving: 85,
  },
  strengths: ['Clear communication — answers were structured.'],
  areas_for_improvement: ['Go deeper on technical trade-offs.'],
};

describe('Interview Feedback — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    router.__setMockParams({ sessionId: 'iv-1' });
  });

  const renderScreen = () => renderWithProviders(<FeedbackScreen />);

  it('loads and displays the interview feedback', async () => {
    mockApiCall.mockImplementation(async (fn: string) => {
      if (fn.includes('interviews-feedback')) {
        return { data: { feedback: FEEDBACK }, error: null };
      }
      return { data: null, error: null };
    });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'interviews-feedback?interview_id=iv-1',
        'POST',
        expect.anything()
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Interview Complete!')).toBeTruthy();
      expect(screen.getByText('Communication')).toBeTruthy();
      expect(screen.getByText('Technical Knowledge')).toBeTruthy();
      expect(screen.getByText('Problem Solving')).toBeTruthy();
      expect(screen.getByText('Core Strengths')).toBeTruthy();
      expect(screen.getByText('Improvement Areas')).toBeTruthy();
      expect(screen.getByText('Practice Again')).toBeTruthy();
    });
  });

  it('shows an empty state when no feedback is available', async () => {
    mockApiCall.mockImplementation(async (fn: string) => {
      if (fn.includes('interviews-feedback')) {
        return { data: { feedback: null }, error: null };
      }
      return { data: null, error: null };
    });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('No Feedback Available')).toBeTruthy();
    });
  });

  it('navigates back to the interviews lobby', async () => {
    mockApiCall.mockImplementation(async (fn: string) => {
      if (fn.includes('interviews-feedback')) {
        return { data: { feedback: FEEDBACK }, error: null };
      }
      return { data: null, error: null };
    });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Practice Again')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Practice Again'));
    expect(router.push).toHaveBeenCalledWith('/interviews');
  });
});
