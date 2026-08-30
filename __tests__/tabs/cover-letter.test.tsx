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

import { exportCoverLetterPDF, exportCoverLetterDOCX } from '../../src/lib/coverLetterExport';
import { usePreviewStore } from '../../src/store/previewStore';

jest.mock('../../src/lib/coverLetterExport', () => ({
  exportCoverLetterPDF: jest.fn(async () => {}),
  exportCoverLetterDOCX: jest.fn(async () => {}),
}));

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

jest.setTimeout(15000);

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

  it('renders the attachment toolbar and formats hint', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Attach JD Document')).toBeTruthy();
    expect(screen.getByText('PDF, DOCX, PNG, JPG (Max 5MB)')).toBeTruthy();
  });

  it('attaches a JD file, displays the attachment badge, and allows removing it', async () => {
    mockApiUpload.mockResolvedValue({
      data: {
        extracted_text: 'Extracted text from attached JD for Cover Letter test.',
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

  it('generates cover letter using attached JD file text', async () => {
    mockApiUpload.mockResolvedValue({
      data: {
        extracted_text: 'Attached JD content with requirements.',
        file_name: 'job_desc.pdf',
        mime_type: 'application/pdf',
      },
      error: null,
    });

    mockApiCall.mockResolvedValue({ data: { cover_letter: LETTER }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.press(screen.getByText('Attach JD Document'));

    await waitFor(() => {
      expect(screen.getByText('job_desc.pdf')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Generate Cover Letter'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'cover-letters-create',
        'POST',
        expect.objectContaining({
          company_name: 'Acme',
          job_title: 'Engineer',
          job_description: 'Attached JD content with requirements.',
        })
      );
    });
  });

  it('shows concise notification and sets inline error when link scrape fails', async () => {
    mockApiCall.mockResolvedValue({
      data: null,
      error: 'Could not read job link. Please paste the job text or attach a file instead.',
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.changeText(
      screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'),
      'https://blocked-site.com/job/123'
    );
    await fireEvent.press(screen.getByText('Generate Cover Letter'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Could not read job link',
          text2: 'Please paste the job text or attach a file instead.',
        })
      );
    });
    expect(screen.getByText('Link inaccessible. Paste text or attach file.')).toBeTruthy();
  });

  it('renders the back return arrow when viewing a generated cover letter and navigates back to form', async () => {
    mockApiCall.mockResolvedValue({ data: { cover_letter: LETTER }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.changeText(screen.getByPlaceholderText('Or paste the full job description here...'), 'Building cloud services.');
    await fireEvent.press(screen.getByText('Generate Cover Letter'));

    // Should now show the generated cover letter and the return arrow
    await waitFor(() => {
      expect(screen.getByText('Your Cover Letter')).toBeTruthy();
      expect(screen.getByLabelText('Back to cover letter generator')).toBeTruthy();
    });

    // Press the back return arrow
    await fireEvent.press(screen.getByLabelText('Back to cover letter generator'));

    // Should return back to the setup form
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Acme Corp')).toBeTruthy();
      expect(screen.getByText('Generate Cover Letter')).toBeTruthy();
    });
  });

  it('navigates to preview screen when clicking preview button', async () => {
    mockApiCall.mockResolvedValue({ data: { cover_letter: LETTER }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.changeText(screen.getByPlaceholderText('Or paste the full job description here...'), 'Building cloud services.');
    await fireEvent.press(screen.getByText('Generate Cover Letter'));

    await waitFor(() => {
      expect(screen.getByLabelText('Preview cover letter')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Preview cover letter'));

    expect(usePreviewStore.getState().documentType).toBe('cover_letter');
    expect(router.push).toHaveBeenCalledWith('/preview');
  });

  it('exports cover letter as PDF when clicking download PDF option', async () => {
    mockApiCall.mockResolvedValue({ data: { cover_letter: LETTER }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.changeText(screen.getByPlaceholderText('Or paste the full job description here...'), 'Building cloud services.');
    await fireEvent.press(screen.getByText('Generate Cover Letter'));

    await waitFor(() => {
      expect(screen.getByLabelText('Download cover letter')).toBeTruthy();
    });

    // Open Download Modal
    await fireEvent.press(screen.getByLabelText('Download cover letter'));
    await waitFor(() => {
      expect(screen.getByLabelText('Download PDF cover letter')).toBeTruthy();
    });

    // Click PDF download option
    await fireEvent.press(screen.getByLabelText('Download PDF cover letter'));

    await waitFor(() => {
      expect(exportCoverLetterPDF).toHaveBeenCalledWith(
        expect.objectContaining({
          salutation: 'Dear Hiring Manager,',
        })
      );
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'PDF Downloaded!' })
      );
    });
  });

  it('exports cover letter as DOCX when clicking download DOCX option', async () => {
    mockApiCall.mockResolvedValue({ data: { cover_letter: LETTER }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Acme Corp'), 'Acme');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Software Engineer'), 'Engineer');
    await fireEvent.changeText(screen.getByPlaceholderText('Or paste the full job description here...'), 'Building cloud services.');
    await fireEvent.press(screen.getByText('Generate Cover Letter'));

    await waitFor(() => {
      expect(screen.getByLabelText('Download cover letter')).toBeTruthy();
    });

    // Open Download Modal
    await fireEvent.press(screen.getByLabelText('Download cover letter'));
    await waitFor(() => {
      expect(screen.getByLabelText('Download DOCX cover letter')).toBeTruthy();
    });

    // Click DOCX download option
    await fireEvent.press(screen.getByLabelText('Download DOCX cover letter'));

    await waitFor(() => {
      expect(exportCoverLetterDOCX).toHaveBeenCalledWith(
        expect.objectContaining({
          salutation: 'Dear Hiring Manager,',
        })
      );
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'DOCX Downloaded!' })
      );
    });
  });
});
