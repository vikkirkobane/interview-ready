import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import AnalyzeScreen from '../../app/(onboarding)/analyze';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
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

let mockPickFileOptions: any = null;
jest.mock('../../src/hooks/useFilePicker', () => ({
  useFilePicker: () => ({
    pickFile: jest.fn(async (options: any) => {
      mockPickFileOptions = options;
      if (options.onFilePicked) {
        await options.onFilePicked({
          fileUri: 'file:///mock/job_desc.pdf',
          fileName: 'job_desc.pdf',
          mimeType: 'application/pdf',
          webFile: null,
        });
      }
    }),
    isPicking: false,
  }),
}));

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockApiUpload = (require('../../src/lib/api') as any).apiUploadFile as jest.Mock;
const mockToast = Toast as any;

const JD_TEXT = 'We are hiring a Senior Software Engineer with 5+ years of experience in distributed systems. Strong experience with Kubernetes, Go and cloud architecture required. Nice to have: Rust and data pipelines.';

const ANALYSIS = {
  recommendation_level: 'GREAT_FIT',
  required_skills: [{ skill: 'Kubernetes' }, { skill: 'Go' }],
  nice_to_haves: ['Rust', 'Data Pipelines'],
  red_flags: [],
};

describe('Onboarding Step 3 (Analyze) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    useOnboardingStore.setState({ currentStep: 3 });
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    router.__resetMockRouter();
    const session = buildSession({ user_metadata: { onboarding_completed: false } });
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<AnalyzeScreen />);

  it('renders the step and input controls', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('STEP 3 OF 5')).toBeTruthy();
    expect(screen.getByText('Paste your dream job 🎯')).toBeTruthy();
    expect(screen.getByText('Paste Text')).toBeTruthy();
    expect(screen.getByText('Enter URL')).toBeTruthy();
    expect(screen.getByText('Analyze Job')).toBeTruthy();
  });

  it('disables Analyze until enough text is pasted', async () => {
    const screen = await renderScreen();
    // Button is disabled while input is too short, so pressing does nothing.
    await fireEvent.press(screen.getByText('Analyze Job'));
    expect(mockApiCall).not.toHaveBeenCalled();

    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste the job description content here/),
      'Too short'
    );
    await fireEvent.press(screen.getByText('Analyze Job'));
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('analyzes a pasted job description and shows results', async () => {
    mockApiCall.mockResolvedValue({
      data: { job_id: 'job-1', analysis: ANALYSIS },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste the job description content here/),
      JD_TEXT
    );
    await fireEvent.press(screen.getByText('Analyze Job'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'jobs-analyze',
        'POST',
        expect.objectContaining({ job_description: JD_TEXT })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('ANALYSIS RESULT')).toBeTruthy();
      expect(screen.getByText('Fit Score')).toBeTruthy();
      expect(screen.getByText('Required Skills')).toBeTruthy();
      expect(screen.getByText('Kubernetes')).toBeTruthy();
      expect(screen.getByText('Analysis Complete')).toBeTruthy();
    });
    expect(useOnboardingStore.getState().analysisId).toBe('job-1');
  });

  it('continues to the resume step after analysis', async () => {
    mockApiCall.mockResolvedValue({
      data: { job_id: 'job-1', analysis: ANALYSIS },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste the job description content here/),
      JD_TEXT
    );
    await fireEvent.press(screen.getByText('Analyze Job'));
    await waitFor(() => {
      expect(screen.getByText('ANALYSIS RESULT')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Continue'));
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(onboarding)/resume');
    });
    expect(useOnboardingStore.getState().currentStep).toBe(4);
  });

  it('analyzes a job from a URL', async () => {
    mockApiCall.mockResolvedValue({
      data: { job_id: 'job-2', analysis: { ...ANALYSIS, recommendation_level: 'GOOD_FIT' } },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Enter URL'));
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Enter the job posting URL/),
      'https://www.linkedin.com/jobs/view/12345'
    );
    await fireEvent.press(screen.getByText('Analyze Job'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'jobs-analyze',
        'POST',
        expect.objectContaining({ job_url: 'https://www.linkedin.com/jobs/view/12345' })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('ANALYSIS RESULT')).toBeTruthy();
    });
  });

  it('shows an error toast when analysis fails', async () => {
    mockApiCall.mockResolvedValue({ data: null, error: 'The AI is unavailable right now' });
    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste the job description content here/),
      JD_TEXT
    );
    await fireEvent.press(screen.getByText('Analyze Job'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Analysis Failed' })
      );
    });
  });

  it('shows red flags when the job posting has them', async () => {
    mockApiCall.mockResolvedValue({
      data: {
        job_id: 'job-3',
        analysis: { ...ANALYSIS, red_flags: ['On-call rotation', 'Legacy codebase'] },
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Paste the job description content here/),
      JD_TEXT
    );
    await fireEvent.press(screen.getByText('Analyze Job'));

    await waitFor(() => {
      expect(screen.getByText('Red Flags')).toBeTruthy();
      expect(screen.getByText('On-call rotation')).toBeTruthy();
    });
  });

  it('renders the attachment toolbar and formats hint', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Attach JD Document')).toBeTruthy();
    expect(screen.getByText('PDF, DOCX, PNG, JPG (Max 5MB)')).toBeTruthy();
  });

  it('attaches a JD file, displays the attachment badge, and allows removing it', async () => {
    mockApiUpload.mockResolvedValue({
      data: {
        extracted_text: 'Extracted text for onboarding job matching.',
        file_name: 'job_desc.pdf',
        mime_type: 'application/pdf',
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Attach JD Document'));

    await waitFor(() => {
      expect(screen.getByText('Attached File:')).toBeTruthy();
      expect(screen.getByText('job_desc.pdf')).toBeTruthy();
    });

    // Remove attachment
    await fireEvent.press(screen.getByLabelText('Remove file attachment'));
    await waitFor(() => {
      expect(screen.queryByText('Attached File:')).toBeNull();
    });
  });
});
