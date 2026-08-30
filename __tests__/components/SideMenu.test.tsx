import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { SideMenu } from '../../src/components/ui/SideMenu';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { useNavigationStore } from '../../src/stores/navigation-store';
import { supabase } from '../../src/lib/supabase';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

const mockSupabase = supabase as any;

describe('SideMenu', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    const session = buildSession({
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        user_metadata: { first_name: 'Alex', last_name: 'Smith' },
      } as any,
    });
    mockLoggedInSession(mockSupabase, session);
    useNavigationStore.setState({ isMenuOpen: true });
  });

  const renderComponent = () => renderWithProviders(<SideMenu />);

  it('renders all menu items when opened', async () => {
    const screen = await renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Interview Ready')).toBeTruthy();
      expect(screen.getByText('Alex Smith')).toBeTruthy();
      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('Job Match')).toBeTruthy();
      expect(screen.getByText('Build Resume')).toBeTruthy();
      expect(screen.getByText('Cover Letters')).toBeTruthy();
      expect(screen.getByText('Mock Interview')).toBeTruthy();
      expect(screen.getByText('Ask AI')).toBeTruthy();
      expect(screen.getByText('Tracker')).toBeTruthy();
      expect(screen.getByText('Company Research')).toBeTruthy();
      expect(screen.getByText('LinkedIn')).toBeTruthy();
      expect(screen.getByText('Onboarding')).toBeTruthy();
      expect(screen.getByText('Billing')).toBeTruthy();
      expect(screen.getByText('Referral')).toBeTruthy();
      expect(screen.getByText('Log Out')).toBeTruthy();
    });
  });

  it('allows closing the menu', async () => {
    const screen = await renderComponent();
    const closeBtn = screen.getByLabelText('Close menu');
    expect(closeBtn).toBeTruthy();
    fireEvent.press(closeBtn);
    expect(useNavigationStore.getState().isMenuOpen).toBe(false);
  });
});
