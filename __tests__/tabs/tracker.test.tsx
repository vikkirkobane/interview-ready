import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import TrackerScreen from '../../app/(tabs)/tracker';
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

jest.setTimeout(15000);

describe('Application Tracker — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<TrackerScreen />);

  it('renders the tracker columns', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Application Tracker')).toBeTruthy();
      expect(screen.getByText('Saved')).toBeTruthy();
      expect(screen.getByText('Applied')).toBeTruthy();
      expect(screen.getByText('Offer')).toBeTruthy();
    });
    expect(screen.getByText('Add New')).toBeTruthy();
  });

  it('adds a new job application', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Add New'));
    expect(screen.getByText('Add New Job')).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Senior Product Designer'), 'Product Designer');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Stripe'), 'Stripe');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Paste the full job description here...'),
      'We are hiring a product designer with strong portfolio and design system experience.'
    );
    await fireEvent.press(screen.getByText('Save Job'));

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('job_applications');
    });
  });

  it('opens job details from a card', async () => {
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      {
        id: 'j1',
        job_title: 'Frontend Engineer',
        company: 'Acme',
        location: 'Remote',
        is_remote: true,
        ats_score: 70,
        match_score: 74,
        status: 'APPLIED',
        raw_jd: 'jd',
        jd_summary: null,
        updated_at: '2026-08-01T10:00:00Z',
        created_at: '2026-08-01T09:00:00Z',
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Frontend Engineer')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Frontend Engineer'));
    await waitFor(() => {
      expect(screen.getByText('Job Details')).toBeTruthy();
    });
  });

  it('navigates to the analyzer from a job detail', async () => {
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      {
        id: 'j1',
        job_title: 'Frontend Engineer',
        company: 'Acme',
        location: 'Remote',
        is_remote: true,
        ats_score: 0,
        match_score: 0,
        status: 'APPLIED',
        raw_jd: 'jd',
        jd_summary: null,
        updated_at: '2026-08-01T10:00:00Z',
        created_at: '2026-08-01T09:00:00Z',
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Frontend Engineer')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Frontend Engineer'));
    await waitFor(() => {
      expect(screen.getByText('Job Details')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Analyze Job Match'));
    expect(router.push).toHaveBeenCalledWith('/job-analyzer?job_id=j1');
  });

  it('deletes a job after confirmation', async () => {
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      {
        id: 'j1',
        job_title: 'Frontend Engineer',
        company: 'Acme',
        location: 'Remote',
        is_remote: true,
        ats_score: 70,
        match_score: 74,
        status: 'APPLIED',
        raw_jd: 'jd',
        jd_summary: null,
        updated_at: '2026-08-01T10:00:00Z',
        created_at: '2026-08-01T09:00:00Z',
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Frontend Engineer')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Frontend Engineer'));
    await waitFor(() => {
      expect(screen.getByText('Job Details')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Delete Job'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Job',
      expect.stringContaining('Are you sure you want to delete this job application?'),
      expect.any(Array)
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirm = buttons.find((b: any) => b.text === 'Delete');
    await confirm.onPress();

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('job_applications');
    });
  });
});
