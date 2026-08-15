import React from 'react';
import { waitFor, act } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';

import DashboardScreen from '../../app/(tabs)/index';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';
import { useAuthStore } from '../../src/stores/auth-store';
import * as SocialAuth from '../../src/lib/social-auth';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

jest.mock('../../src/lib/social-auth', () => ({
  signInWithGoogle: jest.fn(),
  initializeGoogleSignIn: jest.fn(),
  signOutFromGoogle: jest.fn(),
}));

const mockSupabase = supabase as any;
const mockOpenAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

describe('Dashboard Recent Activities across Authentication Methods', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    jest.clearAllMocks();
  });

  const renderScreen = () => renderWithProviders(<DashboardScreen />);

  const seedRecentActivities = () => {
    mockSupabase.__mockHelpers.tables['resumes'] = [
      { id: 'r101', title: 'Fullstack Architect Resume', updated_at: '2026-08-10T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['cover_letters'] = [
      { id: 'c101', title: 'Staff Engineer Cover Letter', updated_at: '2026-08-09T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['job_applications'] = [
      { id: 'j101', job_title: 'Principal Lead', company: 'Google', updated_at: '2026-08-08T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['mock_interviews'] = [
      { id: 'i101', role: 'System Design Interview', updated_at: '2026-08-07T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['company_research'] = [
      { id: 'cr101', company_name: 'Anthropic', updated_at: '2026-08-06T10:00:00Z' },
    ];
    mockSupabase.__mockHelpers.tables['linkedin_tasks'] = [
      { id: 'l101', title: 'Reach out to Hiring Manager', updated_at: '2026-08-05T10:00:00Z' },
    ];
  };

  it('displays recent activities after Email & Password authentication', async () => {
    const session = buildSession({
      user: { id: 'email-user-1', email: 'emailuser@example.com', user_metadata: { first_name: 'EmailUser' } },
    });

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });

    seedRecentActivities();

    // Authenticate via email/password
    await act(async () => {
      await useAuthStore.getState().signIn('emailuser@example.com', 'password123');
    });

    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Fullstack Architect Resume')).toBeTruthy();
      expect(screen.getByText('Staff Engineer Cover Letter')).toBeTruthy();
      expect(screen.getByText('Principal Lead at Google')).toBeTruthy();
      expect(screen.getByText('Mock Interview: System Design Interview')).toBeTruthy();
      expect(screen.getByText('Company Research: Anthropic')).toBeTruthy();
    });
  });

  it('displays recent activities after Google ID Token authentication', async () => {
    const session = buildSession({
      user: { id: 'google-user-1', email: 'googleuser@example.com', user_metadata: { first_name: 'GoogleUser' } },
    });

    (SocialAuth.signInWithGoogle as jest.Mock).mockResolvedValue({ error: null });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });

    seedRecentActivities();

    // Authenticate via Google ID Token
    await act(async () => {
      await useAuthStore.getState().signInWithGoogleIdToken();
    });

    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Fullstack Architect Resume')).toBeTruthy();
      expect(screen.getByText('Staff Engineer Cover Letter')).toBeTruthy();
      expect(screen.getByText('Principal Lead at Google')).toBeTruthy();
    });
  });

  it('displays recent activities after LinkedIn OAuth authentication', async () => {
    const session = buildSession({
      user: { id: 'linkedin-user-1', email: 'linkedinuser@example.com', user_metadata: { first_name: 'LinkedInUser' } },
    });

    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.linkedin.com/oauth/authorize' },
      error: null,
    });
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'interviewready://auth/callback?code=linkedin_code_123',
    });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });

    seedRecentActivities();

    // Authenticate via LinkedIn OAuth
    await act(async () => {
      await useAuthStore.getState().signInWithOAuth('linkedin_oidc');
    });

    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Fullstack Architect Resume')).toBeTruthy();
      expect(screen.getByText('Staff Engineer Cover Letter')).toBeTruthy();
      expect(screen.getByText('Principal Lead at Google')).toBeTruthy();
    });
  });

  it('displays recent activities after Google WebBrowser OAuth authentication', async () => {
    const session = buildSession({
      user: { id: 'google-oauth-user', email: 'googleoauth@example.com', user_metadata: { first_name: 'OAuthUser' } },
    });

    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' },
      error: null,
    });
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session },
      error: null,
    });
    mockOpenAuthSession.mockResolvedValue({
      type: 'success',
      url: 'interviewready://auth/callback?code=google_code_456',
    });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });

    seedRecentActivities();

    // Authenticate via Google OAuth WebBrowser
    await act(async () => {
      await useAuthStore.getState().signInWithOAuth('google');
    });

    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Fullstack Architect Resume')).toBeTruthy();
      expect(screen.getByText('Staff Engineer Cover Letter')).toBeTruthy();
      expect(screen.getByText('Principal Lead at Google')).toBeTruthy();
    });
  });

  it('displays recent activities after Email & Password sign-up', async () => {
    const session = buildSession({
      user: { id: 'new-signup-user', email: 'newbie@example.com', user_metadata: { first_name: 'Newbie' } },
    });

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: session.user, session },
      error: null,
    });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });

    seedRecentActivities();

    // Authenticate via sign-up
    await act(async () => {
      await useAuthStore.getState().signUp('newbie@example.com', 'password123', 'Newbie', 'Dev');
    });

    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Fullstack Architect Resume')).toBeTruthy();
      expect(screen.getByText('Staff Engineer Cover Letter')).toBeTruthy();
    });
  });

  it('displays recent activities after initial session rehydration on app startup', async () => {
    const session = buildSession({
      user: { id: 'rehydrated-user', email: 'rehydrated@example.com', user_metadata: { first_name: 'Rehydrated' } },
    });

    mockSupabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });

    seedRecentActivities();

    // App boots up and restores stored session
    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    const screen = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Fullstack Architect Resume')).toBeTruthy();
      expect(screen.getByText('Staff Engineer Cover Letter')).toBeTruthy();
    });
  });

  it('correctly updates recent activities when switching between different user accounts', async () => {
    // 1. First user signs in
    const sessionUserA = buildSession({
      user: { id: 'user-A', email: 'userA@example.com', user_metadata: { first_name: 'Alice' } },
    });
    mockLoggedInSession(mockSupabase, sessionUserA);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: sessionUserA.user }, error: null });

    mockSupabase.__mockHelpers.tables['resumes'] = [
      { id: 'r-user-a', title: 'Alice Frontend Resume', updated_at: '2026-08-10T10:00:00Z' },
    ];

    const screenA = await renderScreen();
    await waitFor(() => {
      expect(screenA.getByText('Alice Frontend Resume')).toBeTruthy();
    });

    // 2. User A signs out
    await act(async () => {
      await useAuthStore.getState().signOut();
    });

    // 3. User B signs in via Google
    const sessionUserB = buildSession({
      user: { id: 'user-B', email: 'userB@example.com', user_metadata: { first_name: 'Bob' } },
    });
    (SocialAuth.signInWithGoogle as jest.Mock).mockResolvedValue({ error: null });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: sessionUserB }, error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: sessionUserB.user }, error: null });

    mockSupabase.__mockHelpers.tables['resumes'] = [
      { id: 'r-user-b', title: 'Bob DevOps Resume', updated_at: '2026-08-10T10:00:00Z' },
    ];

    await act(async () => {
      await useAuthStore.getState().signInWithGoogleIdToken();
    });

    const screenB = await renderScreen();
    await waitFor(() => {
      expect(screenB.getByText('Bob DevOps Resume')).toBeTruthy();
      expect(screenB.queryByText('Alice Frontend Resume')).toBeNull();
    });
  });
});
