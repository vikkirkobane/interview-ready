import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ResumesScreen from '../../app/(tabs)/resumes';
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

describe('My Resumes — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<ResumesScreen />);

  it('renders the resumes list header', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('My Resumes')).toBeTruthy();
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('shows resume cards with title and status', async () => {
    mockSupabase.__mockHelpers.tables['resumes'] = [
      {
        id: 'r1',
        title: 'Senior Engineer Resume',
        template_id: 'executive',
        status: 'READY',
        ats_score: 88,
        created_at: '2026-08-01T10:00:00Z',
        updated_at: '2026-08-01T10:00:00Z',
      },
      {
        id: 'r2',
        title: 'Untitled',
        template_id: 'minimal',
        status: 'DRAFT',
        ats_score: 0,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-01T10:00:00Z',
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Senior Engineer Resume')).toBeTruthy();
    });
    expect(screen.getByText('READY')).toBeTruthy();
    expect(screen.getByText('DRAFT')).toBeTruthy();
  });

  it('opens the resume editor from a card', async () => {
    mockSupabase.__mockHelpers.tables['resumes'] = [
      {
        id: 'r1',
        title: 'Senior Engineer Resume',
        template_id: 'executive',
        status: 'READY',
        ats_score: 88,
        created_at: '2026-08-01T10:00:00Z',
        updated_at: '2026-08-01T10:00:00Z',
      },
    ];

    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Senior Engineer Resume')).toBeTruthy();
    });
    await fireEvent.press(screen.getByText('Senior Engineer Resume'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/new-resume?id=r1&fromList=true');
  });

  it('starts a new resume from the New button', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('New'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/new-resume');
  });

  it('navigates back when back button is pressed', async () => {
    const screen = await renderScreen();
    const backBtn = screen.getByLabelText('Go back');
    expect(backBtn).toBeTruthy();
    fireEvent.press(backBtn);
    expect(router.back).toHaveBeenCalled();
  });

  it('shows an empty state when there are no resumes', async () => {
    const screen = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText('No resumes yet')).toBeTruthy();
    });
  });
});
