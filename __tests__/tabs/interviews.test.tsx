import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import InterviewsScreen from '../../app/(tabs)/interviews';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;
const mockToast = Toast as any;

describe('Mock Interviews lobby — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockToast.show.mockClear();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<InterviewsScreen />);

  it('renders the interview setup form', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Mock Interviews')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter Job Role')).toBeTruthy();
    expect(screen.getByText('Behavioral')).toBeTruthy();
    expect(screen.getByText('Technical')).toBeTruthy();
    expect(screen.getByText('Manager')).toBeTruthy();
    expect(screen.getByText('Start Interview')).toBeTruthy();
  });

  it('requires a target role', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Start Interview'));
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Input Required' })
      );
    });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('starts an interview with the selected role and type', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Enter Job Role'), 'Backend Engineer');
    await fireEvent.press(screen.getByText('Technical'));
    await fireEvent.press(screen.getByText('Senior'));
    await fireEvent.press(screen.getByText('Start Interview'));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/interview',
          params: expect.objectContaining({
            role: 'Backend Engineer',
            type: 'TECHNICAL',
            difficulty: 'Senior',
          }),
        })
      );
    });
  });

  it('rejects an invalid job URL', async () => {
    const screen = await renderScreen();
    await fireEvent.changeText(screen.getByPlaceholderText('Enter Job Role'), 'Engineer');
    await fireEvent.changeText(
      screen.getByPlaceholderText('https://www.linkedin.com/jobs/view/...'),
      'not-a-url'
    );
    await fireEvent.press(screen.getByText('Start Interview'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid URL starting with http:// or https://')).toBeTruthy();
    });
  });

  it('lists past interviews with feedback', async () => {
    mockSupabase.__mockHelpers.tables['mock_interviews'] = [
      {
        id: 'iv-1',
        role: 'Frontend Engineer',
        type: 'Behavioral',
        difficulty: 'Intermediate',
        updated_at: '2026-08-01T10:00:00Z',
        feedback: { overall_score: 82 },
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Frontend Engineer')).toBeTruthy();
    });
    expect(screen.getByText('82%')).toBeTruthy();
  });

  it('shows View Feedback for completed interviews', async () => {
    mockSupabase.__mockHelpers.tables['mock_interviews'] = [
      {
        id: 'iv-1',
        role: 'Frontend Engineer',
        type: 'Behavioral',
        difficulty: 'Intermediate',
        updated_at: '2026-08-01T10:00:00Z',
        feedback: { overall_score: 82 },
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('View Feedback →')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('View Feedback →'));
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/feedback', params: expect.objectContaining({ sessionId: 'iv-1' }) })
    );
  });

  it('shows an empty state when there are no past interviews', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('No past interviews yet.')).toBeTruthy();
    });
  });
});
