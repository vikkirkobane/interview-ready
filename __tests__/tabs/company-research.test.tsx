import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import CompanyResearchScreen from '../../app/(tabs)/company-research';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

jest.mock('../../src/lib/api', () => {
  const { createApiMock } = require('../helpers/supabase');
  return createApiMock();
});

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockToast = Toast as any;

const RESULT = {
  company_name: 'Stripe',
  tagline: 'The payment infrastructure for the internet',
  overview: 'Stripe builds economic infrastructure for the internet.',
  industry: 'Fintech',
  business_model: 'SaaS',
  opportunity_score: 85,
  cultural_fit_score: 80,
  summary_verdict: 'Strong fit for product-minded engineers.',
  growth_signals: ['Rapidly hiring'],
  red_flags: [],
  interview_talking_points: ['Platform engineering'],
  smart_questions_to_ask: ['How do teams ship?'],
  key_products_services: ['Payments'],
  mission_values: 'Increase the GDP of the internet',
  tech_stack: ['Go', 'React'],
  competitors: ['Adyen'],
  recent_news: [],
  culture_insights: 'Fast-paced and customer obsessed.',
};

describe('Company Research — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
  });

  const renderScreen = () => renderWithProviders(<CompanyResearchScreen />);

  it('renders the research form', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Company Research')).toBeTruthy();
    expect(screen.getByText('Research Company')).toBeTruthy();
    expect(screen.getByText('Company Website URL *')).toBeTruthy();
  });

  it('keeps Research disabled until a URL is entered', async () => {
    const screen = await renderScreen();
    // Pressing with no URL does nothing (button is disabled).
    await fireEvent.press(screen.getByText('Research Company'));
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('researches a company and shows the results', async () => {
    mockApiCall.mockResolvedValue({ data: { data: RESULT, message: 'ok' }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. https://stripe.com or stripe.com'),
      'stripe.com'
    );
    await fireEvent.press(screen.getByText('Research Company'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'company-research',
        'POST',
        expect.objectContaining({ company_url: 'https://stripe.com' })
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeTruthy();
    });
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ text1: 'Stripe researched!' })
    );
  });

  it('shows the download PDF report button in the results', async () => {
    mockApiCall.mockResolvedValue({ data: { data: RESULT, message: 'ok' }, error: null });

    const screen = await renderScreen();
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. https://stripe.com or stripe.com'),
      'stripe.com'
    );
    await fireEvent.press(screen.getByText('Research Company'));

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeTruthy();
    });
    expect(screen.getByText('Download PDF Report')).toBeTruthy();
  });
});
