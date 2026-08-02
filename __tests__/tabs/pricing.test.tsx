import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';

import PricingScreen from '../../app/(tabs)/pricing';
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

describe('Pricing — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<PricingScreen />);

  it('renders the pricing plans', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Choose Your Plan')).toBeTruthy();
    expect(screen.getAllByText('Premium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Premium Plus').length).toBeGreaterThan(0);
  });

  it('selects a plan and shows the subscribe action', async () => {
    const screen = await renderScreen();
    const selectButtons = screen.getAllByText('Select Plan');
    await fireEvent.press(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Subscribe to/)).toBeTruthy();
    });
  });

  it('marks the selected plan as Selected', async () => {
    const screen = await renderScreen();
    const selectButtons = screen.getAllByText('Select Plan');
    await fireEvent.press(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Selected')).toBeTruthy();
    });
  });
});
