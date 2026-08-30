import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PrivacyPolicyScreen from '../../app/privacy';
import TermsOfServiceScreen from '../../app/terms';
import AboutScreen from '../../app/about';
import ContactScreen from '../../app/contact';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores } from '../helpers/stores';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

describe('Compliance & Public Informational Pages', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('renders Privacy Policy with AdSense and GDPR disclosure', async () => {
    const screen = await renderWithProviders(<PrivacyPolicyScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('3. Advertising & Google AdSense Disclosure')).toBeTruthy();
    expect(screen.getByText('5. Data Protection Rights (GDPR & CCPA/CPRA)')).toBeTruthy();
  });

  it('renders Terms of Service with service descriptions', async () => {
    const screen = await renderWithProviders(<TermsOfServiceScreen />);
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('1. Acceptance of Terms')).toBeTruthy();
    expect(screen.getByText('4. AI Guidance & Career Disclaimers')).toBeTruthy();
  });

  it('renders About Us screen with mission and features', async () => {
    const screen = await renderWithProviders(<AboutScreen />);
    expect(screen.getByText('About Us')).toBeTruthy();
    expect(screen.getByText('Our Mission')).toBeTruthy();
    expect(screen.getByText('AI Mock Interview Coach')).toBeTruthy();
  });

  it('renders Contact screen and validates fields', async () => {
    const screen = await renderWithProviders(<ContactScreen />);
    expect(screen.getByText('Contact & Support')).toBeTruthy();
    expect(screen.getByText('Send us a Message')).toBeTruthy();
    expect(screen.getByText('info@appinterviewready.top')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Alex Smith')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. alex@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('How can we help you?')).toBeTruthy();
  });

  it('submits contact form successfully', async () => {
    const screen = await renderWithProviders(<ContactScreen />);
    const nameInput = screen.getByPlaceholderText('e.g. Alex Smith');
    const emailInput = screen.getByPlaceholderText('e.g. alex@example.com');
    const messageInput = screen.getByPlaceholderText('How can we help you?');
    const submitBtn = screen.getByTestId('submit-contact-btn');

    await fireEvent.changeText(nameInput, 'Jane Doe');
    await fireEvent.changeText(emailInput, 'jane@example.com');
    await fireEvent.changeText(messageInput, 'I need help with my subscription.');
    await fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Message Sent!')).toBeTruthy();
    });
  });
});
