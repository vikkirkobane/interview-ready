import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import InterviewScreen from '../../app/(tabs)/interview';
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
          fileUri: 'file:///mock/interview_jd.pdf',
          fileName: 'interview_jd.pdf',
          mimeType: 'application/pdf',
          webFile: null,
        });
      }
    }),
    isPicking: false,
  }),
}));

import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockApiUpload = (require('../../src/lib/api') as any).apiUploadFile as jest.Mock;
const mockToast = Toast as any;

describe('Live Mock Interview — user stories', () => {
  jest.setTimeout(30000);

  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    (router as any).__resetMockRouter?.();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  const mockStartResponse = () => {
    mockApiCall.mockImplementation(async (fn: string) => {
      if (fn === 'interviews-start') {
        return {
          data: { interview: { id: 's1', messages: [{ content: 'Tell me about yourself.' }] } },
          error: null,
        };
      }
      if (fn === 'interviews-message') {
        return { data: { message: { content: 'Great — let us dig deeper.' } }, error: null };
      }
      return { data: null, error: null };
    });
  };

  const renderScreen = () => renderWithProviders(<InterviewScreen />);

  it('starts the interview and shows the AI greeting', async () => {
    mockStartResponse();
    const screen = await renderScreen();

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'interviews-start',
        'POST',
        expect.objectContaining({ role: 'General', interview_type: 'BEHAVIORAL', difficulty: 'INTERMEDIATE' })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });
    expect(screen.getByText('LIVE INTERVIEW SESSION')).toBeTruthy();
    expect(screen.getByText('END SESSION')).toBeTruthy();
  });

  it('sends a response and receives an AI follow-up', async () => {
    mockStartResponse();
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText('Type your response...'), 'I build distributed systems.');
    await fireEvent(screen.getByPlaceholderText('Type your response...'), 'submitEditing', {
      nativeEvent: { text: 'I build distributed systems.' },
    });

    await waitFor(() => {
      expect(screen.getByText('Great — let us dig deeper.')).toBeTruthy();
    });
    expect(mockApiCall).toHaveBeenCalledWith(
      'interviews-message',
      'POST',
      expect.objectContaining({ interview_id: 's1', content: 'I build distributed systems.' })
    );
  });

  it('ends the session and navigates to feedback after confirmation', async () => {
    mockStartResponse();
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('END SESSION'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'End Session?',
      'Are you sure you want to end this interview session?',
      expect.any(Array)
    );

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirm = buttons.find((b: any) => b.text === 'End Session');
    confirm.onPress();
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/feedback', params: expect.objectContaining({ sessionId: 's1' }) })
      );
    });
  });

  it('renders short candidate conversation messages such as "Hello" in the bubble layout', async () => {
    mockStartResponse();
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText('Type your response...'), 'Hello');
    await fireEvent(screen.getByPlaceholderText('Type your response...'), 'submitEditing', {
      nativeEvent: { text: 'Hello' },
    });

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeTruthy();
      expect(screen.getByText('Great — let us dig deeper.')).toBeTruthy();
    });
  });

  it('attaches a document file during live interview and displays the badge', async () => {
    mockStartResponse();
    mockApiUpload.mockResolvedValue({
      data: {
        extracted_text: 'Live interview JD context.',
        file_name: 'interview_jd.pdf',
        mime_type: 'application/pdf',
      },
      error: null,
    });

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Attach job description document'));

    await waitFor(() => {
      expect(screen.getByText('interview_jd.pdf')).toBeTruthy();
    });

    // Can remove the attachment
    await fireEvent.press(screen.getByLabelText('Remove file attachment'));
    await waitFor(() => {
      expect(screen.queryByText('interview_jd.pdf')).toBeNull();
    });
  });

  it('copies interview message to clipboard and sends message via send button', async () => {
    mockStartResponse();
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    // Test Copy button
    const copyButtons = screen.getAllByText('Copy');
    expect(copyButtons.length).toBeGreaterThan(0);
    await fireEvent.press(copyButtons[0]);
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Tell me about yourself.');
    });

    // Test Send button click
    await fireEvent.changeText(screen.getByPlaceholderText('Type your response...'), 'I have 5 years of fullstack experience.');
    await fireEvent.press(screen.getByLabelText('Send response'));

    await waitFor(() => {
      expect(screen.getByText('I have 5 years of fullstack experience.')).toBeTruthy();
      expect(screen.getByText('Great — let us dig deeper.')).toBeTruthy();
    });
    expect(mockApiCall).toHaveBeenCalledWith(
      'interviews-message',
      'POST',
      expect.objectContaining({ interview_id: 's1', content: 'I have 5 years of fullstack experience.' })
    );
  });

  it('redirects to pricing screen when user has fewer than 2 credits on sending response', async () => {
    mockSupabase.__mockHelpers.tables.users = [{ id: 'test-user-id', ai_credits: 1, plan: 'FREE' }];
    mockStartResponse();
    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your response...')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByPlaceholderText('Type your response...'), 'Hello interview');
    await fireEvent.press(screen.getByLabelText('Send response'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith('/(tabs)/pricing?reason=low_credits');
    });
  });
});
