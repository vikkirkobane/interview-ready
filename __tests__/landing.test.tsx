import React from 'react';
import { waitFor, fireEvent, act } from '@testing-library/react-native';
import { router } from 'expo-router';

import IndexScreen from '../app/index';
import LandingPage from '../src/components/landing/LandingPage';
import { supabase } from '../src/lib/supabase';
import { renderWithProviders } from './helpers/render';
import { resetAllStores, mockLoggedInSession } from './helpers/stores';
import { buildSession } from './helpers/supabase';

jest.mock('../src/lib/supabase', () => {
  const helper = require('./helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('Landing Page & Root Index — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
  });

  it('renders all core landing page sections at root index', async () => {
    const screen = await renderWithProviders(<IndexScreen />);

    // Brand and Hero
    expect(screen.getAllByText('Interview Ready').length).toBeGreaterThan(0);
    expect(screen.getByText(/Land More/i)).toBeTruthy();
    expect(screen.getByText('Interviews Faster.')).toBeTruthy();

    // Problem section
    expect(screen.getByText('Job applications are broken.')).toBeTruthy();
    expect(screen.getByText('The ATS Blocker')).toBeTruthy();
    expect(screen.getByText('The Time Sink')).toBeTruthy();
    expect(screen.getByText('The Formatting Nightmare')).toBeTruthy();

    // Feature items
    expect(screen.getByText('AI Resume Tailoring')).toBeTruthy();
    expect(screen.getByText('Recruiter-Tested Cover Letters')).toBeTruthy();
    expect(screen.getByText('ATS Keyword Integration')).toBeTruthy();
    expect(screen.getByText('Universal Careers & Word Export')).toBeTruthy();

    // How it works & FAQs
    expect(screen.getByText('Three Steps to Your Next Callback')).toBeTruthy();
    expect(screen.getByText('Frequently Asked Questions')).toBeTruthy();
    expect(screen.getByText('Your next opportunity is one application away.')).toBeTruthy();
  });

  it('navigates to the welcome screen when clicking Get Started as a guest', async () => {
    const screen = await renderWithProviders(<LandingPage />);

    // Find and press the Get Started CTA in hero
    const getStartedBtns = screen.getAllByText(/Get Started/i);
    expect(getStartedBtns.length).toBeGreaterThan(0);

    await fireEvent.press(getStartedBtns[0]);
    expect(router.push).toHaveBeenCalledWith('/(auth)/welcome');
  });

  it('navigates to the login screen when clicking Sign In', async () => {
    const screen = await renderWithProviders(<LandingPage />);

    const signInBtns = screen.getAllByText('Sign In');
    expect(signInBtns.length).toBeGreaterThan(0);

    await fireEvent.press(signInBtns[0]);
    expect(router.push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('allows switching simulator profession tabs and updates content', async () => {
    const screen = await renderWithProviders(<LandingPage />);

    // Initially on Software
    expect(screen.getByText('Software')).toBeTruthy();
    expect(screen.getByText('Nurse')).toBeTruthy();

    // Switch to Nurse
    await act(async () => {
      await fireEvent.press(screen.getByText('Nurse'));
    });

    // Check that Lagos location or nurse keywords appear
    expect(screen.getAllByText('Lagos, Nigeria').length).toBeGreaterThan(0);
  });

  it('renders Go to Dashboard CTA when user is already authenticated', async () => {
    const session = buildSession({
      user_metadata: { onboarding_completed: true },
    });
    mockLoggedInSession(mockSupabase, session);

    const screen = await renderWithProviders(<LandingPage />);

    const dashboardBtns = screen.getAllByText(/Go to Dashboard|Launch Dashboard/i);
    expect(dashboardBtns.length).toBeGreaterThan(0);

    await fireEvent.press(dashboardBtns[0]);
    expect(router.push).toHaveBeenCalledWith('/(tabs)');
  });
});
