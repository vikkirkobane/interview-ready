import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as Linking from 'expo-linking';

import CoverLetterScreen from '../../app/(tabs)/cover-letter';
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

const LETTER = {
  salutation: 'Dear Hiring Manager,',
  paragraphs: {
    opening: { text: 'I am excited to apply for the Senior Engineer role at Acme.' },
    body_1: { text: 'I have 6 years of experience building distributed systems.' },
    body_2: { text: '' },
    closing: { text: 'I look forward to hearing from you.' },
  },
  sign_off: { closing_phrase: 'Sincerely,', name: 'Jane Smith' },
};

describe('Cover Letter Generator — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    (Linking.openURL as jest.Mock).mockClear();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<CoverLetterScreen />);

  it('renders the cover letter form', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Cover Letter')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Acme Corp')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Senior Software Engineer')).toBeTruthy();
    expect(screen.getByText('Generate Cover Letter')).toBeTruthy();
    expect(screen.getByText('Professional')).toBeTruthy();
    expect(screen.getByText('Formal')).toBeTruthy();
  });

  it('requires both company and role', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.press(screen.getByText('Generate Cover Letter'));
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Input Required',
          text2: 'Please provide both Company Name and Role / Job Title.',
        })
      );
    });
  });

  it('requires a job description or URL', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.press(screen.getByText('Generate Cover Letter'));
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Input Required',
          text2: 'Please provide a job description via text, file, or URL.',
        })
      );
    });
  });

  it('rejects an invalid URL', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.changeText(
      screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'),
      'not a valid url'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Or paste the full job description here/),
      'We are hiring a senior engineer with experience in Go.'
    );
    await fireEvent.press(screen.getByText('Generate Cover Letter'));
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid URL')).toBeTruthy();
    });
  });

  it('generates a cover letter and shows the result', async () => {
    mockApiCall.mockResolvedValue({ data: { cover_letter: LETTER }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Senior Engineer');
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Or paste the full job description here/),
      'We are hiring a senior engineer with 5+ years of Go experience.'
    );
    await fireEvent.press(screen.getByText('Enthusiastic'));
    await fireEvent.press(screen.getByText('Generate Cover Letter'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'cover-letters-create',
        'POST',
        expect.objectContaining({
          tone: 'ENTHUSIASTIC',
          company_name: 'Acme',
          job_title: 'Senior Engineer',
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Your Cover Letter')).toBeTruthy();
      expect(
        screen.getByDisplayValue(/I am excited to apply for the Senior Engineer role at Acme/)
      ).toBeTruthy();
    });
  });

  it('emails the letter', async () => {
    mockApiCall.mockResolvedValue({ data: { cover_letter: LETTER }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Or paste the full job description here/),
      'Hiring senior engineers for a growing platform team.'
    );
    await fireEvent.press(screen.getByText('Generate Cover Letter'));

    await waitFor(() => {
      expect(screen.getByText('Your Cover Letter')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Email Letter'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('mailto:'));
    });
  });

  it('starts over with a different tone', async () => {
    mockApiCall.mockResolvedValue({ data: { cover_letter: LETTER }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Or paste the full job description here/),
      'Hiring senior engineers for a growing platform team.'
    );
    await fireEvent.press(screen.getByText('Generate Cover Letter'));
    await waitFor(() => {
      expect(screen.getByText('Your Cover Letter')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Try Another Tone'));
    await waitFor(() => {
      expect(screen.getByText('Generate Cover Letter')).toBeTruthy();
    });
  });
});
