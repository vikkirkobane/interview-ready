import React from 'react';
import { waitFor, fireEvent, act } from '@testing-library/react-native';

import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import NewResumeScreen from '../../app/(tabs)/new-resume';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { renderWithProviders, flushPromises } from '../helpers/render';
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

// Generation tests exercise AI + Realtime flows with async state settling;
// raise the per-test budget so slow/cold runs don't trip the 5s default.
jest.setTimeout(15000);

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockToast = Toast as any;

describe('Resume Builder (new-resume) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<NewResumeScreen key={Math.random()} />);


  /** Simulate the server's Realtime generation_complete broadcast for a channel. */
  const emitGenerationComplete = async (content: any) => {
    const { channelBuilder } = mockSupabase.__mockHelpers;
    await act(async () => {
      channelBuilder._emit('generation_complete', {
        payload: { content },
      });
      await flushPromises();
    });
  };


  it('renders the resume builder form', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Resume Builder')).toBeTruthy();
    expect(screen.getByText('1. Target Job Description (Optional)')).toBeTruthy();
    expect(screen.getByText('2. Choose a Template')).toBeTruthy();
    expect(screen.getByText('Generate Resume')).toBeTruthy();
  });

  it('generates a base resume without a job description', async () => {
    mockApiCall.mockResolvedValue({
      data: { resume_id: 'r1', message: 'ok', stream_channel: 'chan-1' },
      error: null,
    });

    const screen = await renderScreen();
    await act(async () => {
      await fireEvent.press(screen.getByText('Generate Resume'));
      await flushPromises();
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'resumes-create',
        'POST',
        expect.objectContaining({
          title: 'Base Resume',
          template_id: 'executive',
          is_base: true,
        })
      );
    });
    await waitFor(() => {
      expect(router.setParams).toHaveBeenCalledWith({ id: 'r1' });
    });

    // Show the "Generating" info toast immediately (not success).
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ text1: 'Generating resume...' })
    );

    // Success toast only appears after the Realtime broadcast arrives.
    await emitGenerationComplete({
      header: { name: 'Jane Smith', title: 'Software Engineer', email: 'j@x.com' },
      summary: { text: 'Summary' },
      experience: [],
      skills: [],
      education: [],
      recognition: [],
      featured_project: { include: false },
    });

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Resume generated!' })
      );
    });
  });

  it('generates a tailored resume when a job description is provided', async () => {


    router.__setMockParams({});
    mockApiCall.mockImplementation((fn: string) => {
      if (fn === 'jobs-analyze') {
        return { data: { job_id: 'job-9' }, error: null };
      }
      if (fn === 'resumes-create') {
        return { data: { resume_id: 'r2', message: 'ok', stream_channel: 'chan-2' }, error: null };
      }
      return { data: null, error: null };
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      await screen.findByPlaceholderText('Or paste the full job description here...'),
      'We are hiring a senior engineer with 5+ years of experience in distributed systems and Go.'
    );

    await act(async () => {
      await fireEvent.press(screen.getByText('Generate Tailored Resume'));
      await flushPromises();
    });

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'jobs-analyze',
        'POST',
        expect.objectContaining({ job_description: expect.stringContaining('distributed systems') })
      );
    });
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'resumes-create',
        'POST',
        expect.objectContaining({ title: 'Tailored Resume', job_analysis_id: 'job-9' })
      );
    });

    // Emit the Realtime completion so the screen's 90s fallback timer is
    // cleared and the Jest process can exit cleanly (mirrors test 2).
    await emitGenerationComplete({
      header: { name: 'Jane Smith', title: 'Software Engineer', email: 'j@x.com' },
      summary: { text: 'Summary' },
      experience: [],
      skills: [],
      education: [],
      recognition: [],
      featured_project: { include: false },
    });

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Resume generated!' })
      );
    });
  });
});
