import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import JdSummaryScreen from '../../app/jd-summary';
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

describe('JD Summarizer — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<JdSummaryScreen />);

  it('renders the setup view', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('JD Summarizer')).toBeTruthy();
    expect(screen.getByText('Analyze Job Description')).toBeTruthy();
    expect(screen.getByPlaceholderText('Paste the full job description text here...')).toBeTruthy();
    expect(screen.getByLabelText('SUMMARIZE →')).toBeTruthy();
  });

  it('requires a job description or URL', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('SUMMARIZE →'));
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Input Required' })
      );
    });
  });

  it('summarizes a job description and shows the breakdown', async () => {
    mockApiCall.mockResolvedValue({
      data: {
        title: 'Backend Engineer JD',
        key_requirements: ['Go', 'Kubernetes'],
        niceToHaves: ['Rust'],
        red_flags: ['On-call rotation'],
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Paste the full job description text here...'),
      'We are hiring a backend engineer with Go experience and Kubernetes knowledge for a fast growing platform team. On-call rotation is required.'
    );
    await fireEvent.press(screen.getByLabelText('SUMMARIZE →'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'utilities-jd-summary',
        'POST',
        expect.objectContaining({ job_description: expect.stringContaining('backend engineer') })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Must-Haves')).toBeTruthy();
      expect(screen.getByText('Go')).toBeTruthy();
      expect(screen.getByText('Nice-to-Haves')).toBeTruthy();
      expect(screen.getByText('Rust')).toBeTruthy();
      expect(screen.getByText('Red Flags')).toBeTruthy();
      expect(screen.getByText('On-call rotation')).toBeTruthy();
    });
  });

  it('shows fallbacks when there are no nice-to-haves or red flags', async () => {
    mockApiCall.mockResolvedValue({
      data: {
        title: 'Simple JD',
        key_requirements: ['Communication'],
        niceToHaves: [],
        red_flags: [],
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Paste the full job description text here...'),
      'We are looking for someone with great communication skills to join our team.'
    );
    await fireEvent.press(screen.getByLabelText('SUMMARIZE →'));

    await waitFor(() => {
      expect(screen.getByText('None explicitly listed.')).toBeTruthy();
      expect(screen.getByText('No obvious red flags detected.')).toBeTruthy();
    });
  });

  it('resets the form to analyze another job', async () => {
    mockApiCall.mockResolvedValue({
      data: { title: 'JD', key_requirements: ['Go'], niceToHaves: [], red_flags: [] },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('Paste the full job description text here...'),
      'A long enough job description for the summarizer to work with here.'
    );
    await fireEvent.press(screen.getByLabelText('SUMMARIZE →'));

    await waitFor(() => {
      expect(screen.getByText('Must-Haves')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('ANALYZE ANOTHER'));
    await waitFor(() => {
      expect(screen.getByText('Analyze Job Description')).toBeTruthy();
    });
  });

  it('normalizes URL and requests summary', async () => {
    mockApiCall.mockResolvedValue({
      data: {
        title: 'Backend Engineer JD',
        key_requirements: ['Go'],
        niceToHaves: [],
        red_flags: [],
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'),
      'linkedin.com/jobs/view/444'
    );
    await fireEvent.press(screen.getByLabelText('SUMMARIZE →'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'utilities-jd-summary',
        'POST',
        expect.objectContaining({ job_url: 'https://linkedin.com/jobs/view/444' })
      );
    });
  });

  it('shows concise error notification when link scrape fails', async () => {
    mockApiCall.mockResolvedValue({
      data: null,
      error: 'Could not read job link. Please paste the job text or attach a file instead.',
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'),
      'https://blocked-job.com/444'
    );
    await fireEvent.press(screen.getByLabelText('SUMMARIZE →'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Could not read job link',
          text2: 'Please paste the job text instead.',
        })
      );
    });
    expect(screen.getByText('Link inaccessible. Paste text below.')).toBeTruthy();
  });
});
