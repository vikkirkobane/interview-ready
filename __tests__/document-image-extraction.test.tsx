import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import JobFitScreen from '../app/(tabs)/job-analyzer';
import CoverLetterScreen from '../app/(tabs)/cover-letter';
import InterviewsScreen from '../app/(tabs)/interviews';
import AskAiScreen from '../app/(tabs)/ask-ai';
import OnboardingAnalyzeScreen from '../app/(onboarding)/analyze';
import { supabase } from '../src/lib/supabase';
import { apiCall, apiUploadFile } from '../src/lib/api';
import { renderWithProviders } from './helpers/render';
import { resetAllStores, mockLoggedInSession } from './helpers/stores';
import { buildSession } from './helpers/supabase';

jest.mock('../src/lib/supabase', () => {
  const helper = require('./helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

jest.mock('../src/lib/api', () => {
  const { createApiMock } = require('./helpers/supabase');
  return createApiMock();
});

let mockPickFileCallback: any = null;
jest.mock('../src/hooks/useFilePicker', () => ({
  useFilePicker: () => ({
    pickFile: jest.fn(async (options: any) => {
      mockPickFileCallback = options;
      if (options.onFilePicked) {
        await options.onFilePicked({
          fileUri: 'file:///mock/job_screenshot.jpg',
          fileName: 'job_screenshot.jpg',
          mimeType: 'image/jpeg',
          webFile: null,
        });
      }
    }),
    isPicking: false,
  }),
}));

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockApiUpload = apiUploadFile as jest.Mock;
const mockToast = Toast as any;

const EXTRACTED_IMAGE_JD =
  'Senior Full Stack Developer needed with 5+ years React Native and TypeScript experience. Remote position with comprehensive benefits and competitive compensation.';

describe('Document & Image Extraction Across Screens', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockApiUpload.mockReset();
    mockToast.show.mockClear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  });

  describe('Job Analyzer (JobFitScreen)', () => {
    it('populates text input when an image file is attached and analyzed', async () => {
      mockApiUpload.mockResolvedValue({
        data: { extracted_text: EXTRACTED_IMAGE_JD },
        error: null,
      });
      mockApiCall.mockResolvedValue({
        data: {
          job_id: 'job-img-1',
          analysis: { recommendation_level: 'GOOD_FIT', required_skills: [] },
        },
        error: null,
      });

      const screen = await renderWithProviders(<JobFitScreen />);
      
      // Tap attach button
      await fireEvent.press(screen.getByText('Attach JD Document'));

      // Check that badge shows file name
      await waitFor(() => {
        expect(screen.getByText('job_screenshot.jpg')).toBeTruthy();
      });

      // Verify that the text input is populated with extracted text
      const input = screen.getByPlaceholderText('Paste the full job listing here to start the AI gap analysis...');
      expect(input.props.value).toBe(EXTRACTED_IMAGE_JD);

      // Trigger analysis
      await fireEvent.press(screen.getByText('Analyze Job Match'));

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith(
          'jobs-analyze',
          'POST',
          expect.objectContaining({
            job_description: EXTRACTED_IMAGE_JD,
          })
        );
      });
    });
  });

  describe('Onboarding Analyze Screen', () => {
    it('populates text area and store when image is extracted in onboarding', async () => {
      mockApiUpload.mockResolvedValue({
        data: { extracted_text: EXTRACTED_IMAGE_JD },
        error: null,
      });
      mockApiCall.mockResolvedValue({
        data: {
          job_id: 'job-onboard-1',
          analysis: { recommendation_level: 'GREAT_FIT', required_skills: [] },
        },
        error: null,
      });

      const screen = await renderWithProviders(<OnboardingAnalyzeScreen />);

      await fireEvent.press(screen.getByText('Attach JD Document'));

      await waitFor(() => {
        expect(screen.getByText('job_screenshot.jpg')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText(/Paste the job description content here/);
      expect(input.props.value).toBe(EXTRACTED_IMAGE_JD);

      await fireEvent.press(screen.getByText('Analyze Job'));

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith(
          'jobs-analyze',
          'POST',
          expect.objectContaining({
            job_description: EXTRACTED_IMAGE_JD,
          })
        );
      });
    });
  });

  describe('Cover Letter Screen', () => {
    it('populates job description text area upon image extraction', async () => {
      mockApiUpload.mockResolvedValue({
        data: { extracted_text: EXTRACTED_IMAGE_JD },
        error: null,
      });

      const screen = await renderWithProviders(<CoverLetterScreen />);

      await fireEvent.press(screen.getByText('Attach JD Document'));

      await waitFor(() => {
        expect(screen.getByText('job_screenshot.jpg')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Or paste the full job description here...');
      expect(input.props.value).toBe(EXTRACTED_IMAGE_JD);
    });
  });

  describe('Interviews Screen', () => {
    it('populates interview job description upon image extraction', async () => {
      mockApiUpload.mockResolvedValue({
        data: { extracted_text: EXTRACTED_IMAGE_JD },
        error: null,
      });

      const screen = await renderWithProviders(<InterviewsScreen />);

      await fireEvent.press(screen.getByText('Attach JD Document'));

      await waitFor(() => {
        expect(screen.getByText('job_screenshot.jpg')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Or paste the target job description here to guide the interview...');
      expect(input.props.value).toBe(EXTRACTED_IMAGE_JD);
    });
  });

  describe('Ask AI Screen', () => {
    it('displays the file attachment badge upon file extraction while keeping prompt input clear for user questions', async () => {
      mockApiUpload.mockResolvedValue({
        data: { extracted_text: EXTRACTED_IMAGE_JD },
        error: null,
      });

      const screen = await renderWithProviders(<AskAiScreen />);

      await fireEvent.press(screen.getByLabelText('Attach document'));

      await waitFor(() => {
        expect(screen.getByText('job_screenshot.jpg')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Ask a question...');
      expect(input.props.value).toBe('');
    });
  });
});
