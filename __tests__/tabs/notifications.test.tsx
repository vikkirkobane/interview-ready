import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import NotificationsScreen from '../../app/(tabs)/notifications';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { useNotificationStore } from '../../src/stores/notification-store';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('Notifications — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    router.__resetMockRouter();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<NotificationsScreen />);

  it('shows the welcome notification and the free-tier upgrade alert', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Welcome to Interview Ready!')).toBeTruthy();
    expect(screen.getByText('Upgrade to Pro 🚀')).toBeTruthy();
    expect(screen.getByText('2 Notifications')).toBeTruthy();
  });

  it('marks a notification as read when pressed', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Welcome to Interview Ready!'));
    await waitFor(() => {
      expect(useNotificationStore.getState().notifications[0].read).toBe(true);
    });
  });

  it('marks all notifications as read', async () => {
    useNotificationStore.setState({
      notifications: [
        {
          id: 'n1',
          title: 'First',
          description: 'desc',
          timestamp: new Date().toISOString(),
          read: false,
          type: 'info',
        },
        {
          id: 'n2',
          title: 'Second',
          description: 'desc',
          timestamp: new Date().toISOString(),
          read: false,
          type: 'info',
        },
      ],
    });
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('MARK READ'));
    await waitFor(() => {
      expect(useNotificationStore.getState().notifications.every((n) => n.read)).toBe(true);
    });
  });

  it('clears notifications and shows an empty state for a pro user', async () => {
    const proSession = buildSession({
      user_metadata: { onboarding_completed: true, is_pro: true },
    });
    mockLoggedInSession(mockSupabase, proSession);

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('CLEAR'));
    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
    expect(screen.getByText('All caught up!')).toBeTruthy();
  });

  it('navigates to settings from the upgrade alert', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Upgrade to Pro 🚀'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/settings');
  });
});
