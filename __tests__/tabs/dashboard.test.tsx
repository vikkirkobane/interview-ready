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

  it('shows recent activity items across all available options (resumes, cover letters, job matches, interviews, company research, linkedin)', async () => {
    mockSupabase.__mockHelpers.tables['resumes'] = [
      { id: 'r1', title: 'Senior Engineer Resume', updated_at: '2026-08-06T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['cover_letters'] = [
      { id: 'c1', title: 'Google Cover Letter', updated_at: '2026-08-05T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      { id: 'j1', job_title: 'Fullstack Dev', company: 'Stripe', updated_at: '2026-08-04T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['mock_interviews'] = [
      { id: 'i1', role: 'System Architect', updated_at: '2026-08-03T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['company_research'] = [
      { id: 'cr1', company_name: 'OpenAI', updated_at: '2026-08-02T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['linkedin_tasks'] = [
      { id: 'l1', title: 'Connect with Recruiter', updated_at: '2026-08-01T10:00:00Z' },
    ];

    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Senior Engineer Resume')).toBeTruthy();
      expect(screen.getByText('Google Cover Letter')).toBeTruthy();
      expect(screen.getByText('Fullstack Dev at Stripe')).toBeTruthy();
      expect(screen.getByText('Mock Interview: System Architect')).toBeTruthy();
      expect(screen.getByText('Company Research: OpenAI')).toBeTruthy();
    });
  });

  it('navigates correctly when clicking different recent activity options', async () => {
    mockSupabase.__mockHelpers.tables['resumes'] = [
      { id: 'r1', title: 'Resume Item', updated_at: '2026-08-06T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['cover_letters'] = [
      { id: 'c1', title: 'Cover Letter Item', updated_at: '2026-08-05T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      { id: 'j1', job_title: 'Backend Eng', company: 'Meta', updated_at: '2026-08-04T10:00:00Z' },
    ];

    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Resume Item')).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Resume Item'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/new-resume?id=r1&fromList=true');

    await fireEvent.press(screen.getByText('Cover Letter Item'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/cover-letter?id=c1&fromList=true');

    await fireEvent.press(screen.getByText('Backend Eng at Meta'));
    expect(router.push).toHaveBeenCalledWith('/job-match-results?id=j1&fromList=true');
  });

  it('renders Recent Activity title on the same line as SEE ALL button', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      const title = screen.getByText('Recent Activity');
      const seeAll = screen.getByText('SEE ALL');
      expect(title).toBeTruthy();
      expect(seeAll).toBeTruthy();
      // Ensure Recent Activity has no bottom margin overriding sectionTitle defaults inside header
      expect(title.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ marginBottom: 0 }),
        ])
      );
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
