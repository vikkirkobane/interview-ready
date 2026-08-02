import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

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

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockToast = Toast as any;

const GREETING =
  'Hello! Paste a job application question here and I will help you craft the perfect answer tailored from your profile or resume.';

describe('Ask AI — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    (Clipboard.setStringAsync as jest.Mock).mockClear();
    mockToast.show.mockClear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<AskAIScreen />);

  it('renders the chat with a pre-seeded greeting', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Ask AI')).toBeTruthy();
    expect(screen.getByText(GREETING)).toBeTruthy();
    expect(screen.getByPlaceholderText('Ask a question')).toBeTruthy();
  });

  it('asks a question and shows the AI answer', async () => {
    mockApiCall.mockResolvedValue({ data: { answer: 'Highlight your Kubernetes experience first.' }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Ask a question'), 'How do I answer "why do you want this job?"');
    await fireEvent.press(screen.getByLabelText('send').parent as any);

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
    await fireEvent.changeText(screen.getByPlaceholderText('Ask a question'), 'Tell me about a conflict');
    await fireEvent.press(screen.getByLabelText('send').parent as any);

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
});
