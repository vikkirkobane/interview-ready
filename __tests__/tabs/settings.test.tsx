import React from 'react';
import { Alert } from 'react-native';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import SettingsScreen from '../../app/(tabs)/settings';
import { supabase } from '../../src/lib/supabase';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { useAuthStore } from '../../src/stores/auth-store';
import { useUIStore } from '../../src/stores/ui-store';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;
const mockToast = Toast as any;

describe('Settings — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockToast.show.mockClear();
    router.__resetMockRouter();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<SettingsScreen />);

  it('shows the user profile and current plan', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Current Plan')).toBeTruthy();
    expect(screen.getByText('Edit Profile')).toBeTruthy();
  });

  it('navigates to the profile editor', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Edit Profile'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('navigates to the pricing screen to upgrade', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByLabelText('Upgrade to Pro'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/pricing');
  });

  it('shows a coming-soon toast for language selection', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Language'));
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Language selector coming soon!' })
      );
    });
  });

  it('toggles dark mode', async () => {
    expect(useUIStore.getState().isDark).toBe(true);
    const screen = await renderScreen();
    const switches = screen.getAllByRole('switch');
    await fireEvent(switches[1], 'valueChange', false);
    expect(useUIStore.getState().isDark).toBe(false);
  });

  it('logs out after confirmation', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText('Log Out'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Log Out',
      'Are you sure you want to log out?',
      expect.any(Array)
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirm = buttons.find((b: any) => b.text === 'Log Out');
    confirm.onPress();

    await waitFor(() => {
      expect(useAuthStore.getState().session).toBeNull();
    });
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});
