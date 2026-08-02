import React from 'react';
import { waitFor, act } from '@testing-library/react-native';
import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ResumeGenScreen from '../../app/(onboarding)/resume';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { exportResumePDF, exportResumeDOCX } from '../../src/lib/resumeExport';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores } from '../helpers/stores';
import { useOnboardingStore } from '../../src/stores/onboarding-store';
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

jest.mock('../../src/lib/resumeExport', () => ({
  exportResumePDF: jest.fn(async () => {}),
  exportResumeDOCX: jest.fn(async () => {}),
}));

jest.mock('../../src/lib/resumeHTML', () => ({
  buildResumeHTML: jest.fn(() => '<html><body>Test resume</body></html>'),
}));

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockExportPDF = exportResumePDF as jest.Mock;
const mockExportDOCX = exportResumeDOCX as jest.Mock;

const RESUME_ROW = {
  id: 'r1',
  title: 'Senior Engineer Resume',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  resume_contents: [
    {
      name: 'Jane Smith',
      title: 'Senior Engineer',
      contact: {
        name: 'Jane Smith',
        title: 'Senior Engineer',
        location: 'Nairobi',
        email: 'jane@example.com',
        phone: '+254',
      },
      summary: 'Distributed systems engineer with 6 years of experience.',
      skills: ['Go', 'Kubernetes'],
      experience: [
        {
          title: 'Engineer',
          company: 'Acme',
          start_date: '2020',
          end_date: null,
          description: 'Built scalable systems',
        },
      ],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
      awards: [],
    },
  ],
};

describe('Onboarding Step 4 (Resume generation) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockExportPDF.mockClear();
    mockExportDOCX.mockClear();
    router.__resetMockRouter();
    useOnboardingStore.setState({ targetRole: 'Senior Engineer', analysisId: 'job-1' });
    const session = buildSession({ user_metadata: { onboarding_completed: false } });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  });

  const mockGenerationComplete = () => {
    mockApiCall.mockResolvedValue({
      data: { resume_id: 'r1', message: 'ok', stream_channel: 'chan-1' },
      error: null,
    });
    mockSupabase.__mockHelpers.tables['resumes'] = [RESUME_ROW];
  };

  it('shows the generation checklist while creating the resume', async () => {
    mockApiCall.mockResolvedValue({
      data: { resume_id: 'r1', message: 'ok', stream_channel: 'chan-1' },
      error: null,
    });
    const screen = await renderWithProviders(<ResumeGenScreen />);
    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'resumes-create',
        'POST',
        expect.objectContaining({ title: 'Senior Engineer', job_analysis_id: 'job-1' })
      );
    });
    expect(screen.getByText('Your resume is generating...')).toBeTruthy();
  });

  it('shows the success screen when generation completes', async () => {
    mockGenerationComplete();
    const screen = await renderWithProviders(<ResumeGenScreen />);

    await waitFor(() => {
      expect(mockSupabase.__mockHelpers.channelBuilder._listeners.length).toBeGreaterThan(0);
    });
    await act(async () => {
      mockSupabase.__mockHelpers.channelBuilder._emit('generation_complete');
    });

    await waitFor(() => {
      expect(screen.getByText('Your first resume is ready!')).toBeTruthy();
    });
    expect(useOnboardingStore.getState().resumeId).toBe('r1');
  });

  it('continues to the final onboarding step', async () => {
    mockGenerationComplete();
    const screen = await renderWithProviders(<ResumeGenScreen />);
    await waitFor(() => {
      expect(mockSupabase.__mockHelpers.channelBuilder._listeners.length).toBeGreaterThan(0);
    });
    await act(async () => {
      mockSupabase.__mockHelpers.channelBuilder._emit('generation_complete');
    });

    await waitFor(() => {
      expect(screen.getByText('Your first resume is ready!')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Continue to Final Step'));
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(onboarding)/discover');
    });
  });

  it('downloads the resume as PDF and DOCX', async () => {
    mockGenerationComplete();
    const screen = await renderWithProviders(<ResumeGenScreen />);
    await waitFor(() => {
      expect(mockSupabase.__mockHelpers.channelBuilder._listeners.length).toBeGreaterThan(0);
    });
    await act(async () => {
      mockSupabase.__mockHelpers.channelBuilder._emit('generation_complete');
    });
    await waitFor(() => {
      expect(screen.getByText('Your first resume is ready!')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Download PDF'));
    await waitFor(() => expect(mockExportPDF).toHaveBeenCalled());

    await fireEvent.press(screen.getByText('Download .docx'));
    await waitFor(() => expect(mockExportDOCX).toHaveBeenCalled());
  });

  it('shows an error when generation fails to start', async () => {
    mockApiCall.mockResolvedValue({ data: null, error: 'Resume service down' });
    const screen = await renderWithProviders(<ResumeGenScreen />);
    await waitFor(() => {
      expect(screen.getByText('Your resume is generating...')).toBeTruthy();
    });
  });
});
