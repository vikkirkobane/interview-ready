import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import DashboardScreen from '../../app/(tabs)/index';
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

const USER = {
  id: 'test-user-id',
  email: 'jane@example.com',
  user_metadata: { first_name: 'Jane', last_name: 'Smith', onboarding_completed: true },
};

describe('Dashboard (Home tab) — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
    const session = buildSession({ user: USER });
    mockLoggedInSession(mockSupabase, session);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    mockSupabase.__mockHelpers.tables['users'] = [
      {
        id: USER.id,
        ai_credits: 7,
        total_credits_earned: 10,
        total_credits_used: 3,
        credits_expire_at: null,
        plan: 'FREE',
      },
    ];
  });

  const renderScreen = () => renderWithProviders(<DashboardScreen />);

  it('greets the user and shows their credit balance', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Jane')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('7')).toBeTruthy();
      expect(screen.getByText('AI Credits')).toBeTruthy();
    });
  });

  it('shows the quick action cards', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Job Match')).toBeTruthy();
    expect(screen.getByText('Build Resume')).toBeTruthy();
    expect(screen.getByText('Ask AI')).toBeTruthy();
  });

  it('navigates to the job analyzer from Quick Actions', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Job Match'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/job-analyzer');
  });

  it('navigates to the resume builder from Quick Actions', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Build Resume'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/new-resume');
  });

  it('navigates to Ask AI from Quick Actions', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Ask AI'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/ask-ai');
  });

  it('navigates to the referral screen from the credits box', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Get Free Credits'));
    expect(router.push).toHaveBeenCalledWith('/referral');
  });

  it('opens notifications from the bell icon', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('notifications-outline'));
    expect(router.push).toHaveBeenCalledWith('/notifications');
  });

  it('shows the cover letter feature card', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Auto-tailor Cover Letters')).toBeTruthy();
    await fireEvent.press(screen.getByText('TRY IT NOW'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/cover-letter');
  });

  it('shows recent activity items', async () => {
    mockSupabase.__mockHelpers.tables['resumes'] = [
      { id: 'r1', title: 'Senior Engineer Resume', updated_at: '2026-08-01T10:00:00Z' },
    ];
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Senior Engineer Resume')).toBeTruthy();
    });
  });

  it('shows an empty state when there is no recent activity', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('No recent activities found.')).toBeTruthy();
    });
  });

  it('navigates to all recent activity', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('SEE ALL'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/activities');
  });
});
