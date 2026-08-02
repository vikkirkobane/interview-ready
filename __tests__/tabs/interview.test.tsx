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

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;

describe('Live Mock Interview — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    router.__resetMockRouter();
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
});
