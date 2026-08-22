import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

import AskAIScreen from '../../app/(tabs)/ask-ai';
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

const GREETING =
  'Hello! Paste a job application question here and I will help you craft the perfect answer tailored from your profile or resume.';

describe('Ask AI — user stories', () => {
  jest.setTimeout(30000);

  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    (router as any).__resetMockRouter?.();
    (Clipboard.setStringAsync as jest.Mock).mockClear();
    mockToast.show.mockClear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<AskAIScreen />);

  it('renders the chat with a pre-seeded greeting and format hint', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Ask AI')).toBeTruthy();
    expect(screen.getByText(GREETING)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Ask a question/)).toBeTruthy();
    expect(screen.getByText('PDF, DOCX, PNG, JPG (Max 5MB)')).toBeTruthy();
    expect(screen.getByLabelText('Attach document')).toBeTruthy();
  });

  it('asks a question and shows the AI answer', async () => {
    mockApiCall.mockResolvedValue({ data: { answer: 'Highlight your Kubernetes experience first.' }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText(/Ask a question/), 'How do I answer "why do you want this job?"');
    await fireEvent.press(screen.getByLabelText('Send question'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'answer-question',
        'POST',
        expect.objectContaining({
          question: 'How do I answer "why do you want this job?"',
          context_source: 'profile',
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Highlight your Kubernetes experience first.')).toBeTruthy();
    });
  });

  it('copies an AI answer to the clipboard', async () => {
    mockApiCall.mockResolvedValue({ data: { answer: 'Use the STAR method.' }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText(/Ask a question/), 'Tell me about a conflict');
    await fireEvent.press(screen.getByLabelText('Send question'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'answer-question',
        'POST',
        expect.objectContaining({ question: 'Tell me about a conflict' })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Use the STAR method.')).toBeTruthy();
    });
    const copyButtons = screen.getAllByText('Copy');
    await fireEvent.press(copyButtons[copyButtons.length - 1]);
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Use the STAR method.');
    });
  });

  it('attaches a document file, displays the attachment shelf badge, and allows removing it', async () => {
    mockApiUpload.mockResolvedValue({
      data: {
        extracted_text: 'Extracted requirements from PDF job document.',
        file_name: 'job_desc.pdf',
        mime_type: 'application/pdf',
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Attach document'));

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

  it('sends a question with attached document context', async () => {
    mockApiUpload.mockResolvedValue({
      data: {
        extracted_text: 'Job description requirements for Frontend Engineer.',
        file_name: 'job_desc.pdf',
        mime_type: 'application/pdf',
      },
      error: null,
    });

    mockApiCall.mockResolvedValue({
      data: { answer: 'Based on the attached job description, highlight your React expertise.' },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Attach document'));

    await waitFor(() => {
      expect(screen.getByText('job_desc.pdf')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText(/Ask a question/), 'How should I tailor my answer?');
    await fireEvent.press(screen.getByLabelText('Send question'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'answer-question',
        'POST',
        expect.objectContaining({
          question: 'How should I tailor my answer?',
          file_context: 'Job description requirements for Frontend Engineer.',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Based on the attached job description, highlight your React expertise.')).toBeTruthy();
    });
  });

  it('renders short conversation bubble messages such as "Hello" inside the bubble layout', async () => {
    mockApiCall.mockResolvedValue({
      data: { answer: 'Hello! How can I assist you with your application today?' },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText(/Ask a question/), 'Hello');
    await fireEvent.press(screen.getByLabelText('Send question'));

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeTruthy();
      expect(screen.getByText('Hello! How can I assist you with your application today?')).toBeTruthy();
    });
  });

  it('responds with instruction to paste questions or JDs when user pastes a link', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText(/Ask a question/),
      'https://linkedin.com/jobs/view/123456'
    );
    await fireEvent.press(screen.getByLabelText('Send question'));

    await waitFor(() => {
      expect(screen.getByText('https://linkedin.com/jobs/view/123456')).toBeTruthy();
      expect(screen.getByText('Please paste only application questions or job descriptions.')).toBeTruthy();
    });
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('redirects to pricing screen when user has fewer than 2 credits on sending question', async () => {
    mockSupabase.__mockHelpers.tables.users = [{ id: 'test-user-id', ai_credits: 1, plan: 'FREE' }];
    const screen = await renderScreen();

    await fireEvent.changeText(screen.getByPlaceholderText(/Ask a question/), 'Can you review my experience?');
    await fireEvent.press(screen.getByLabelText('Send question'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(tabs)/pricing?reason=low_credits');
    });
  });

  it('renders the reset return arrow after messages are sent and resets chat on press', async () => {
    mockApiCall.mockResolvedValue({ data: { answer: 'Highlight your leadership.' }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText(/Ask a question/), 'How should I answer leadership questions?');
    await fireEvent.press(screen.getByLabelText('Send question'));

    await waitFor(() => {
      expect(screen.getByText('Highlight your leadership.')).toBeTruthy();
      expect(screen.getByLabelText('Reset chat')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Reset chat'));

    await waitFor(() => {
      expect(screen.queryByText('Highlight your leadership.')).toBeNull();
      expect(screen.getByText(GREETING)).toBeTruthy();
    });
  });
});
