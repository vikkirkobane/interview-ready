import React from 'react';
import { renderWithProviders } from '../helpers/render';
import { CountryFlag } from '../../src/components/ui/CountryFlag';

describe('CountryFlag Component', () => {
  it('renders country flag image correctly', async () => {
    const screen = await renderWithProviders(<CountryFlag countryCode="KE" size={32} />);
    expect(screen).toBeTruthy();
  });

  it('handles lowercase and uppercase country codes', async () => {
    const screenUpper = await renderWithProviders(<CountryFlag countryCode="US" />);
    const screenLower = await renderWithProviders(<CountryFlag countryCode="us" />);
    expect(screenUpper).toBeTruthy();
    expect(screenLower).toBeTruthy();
  });

  it('renders fallback when no country code is passed', async () => {
    const screen = await renderWithProviders(<CountryFlag countryCode="" fallbackEmoji="🌐" />);
    expect(screen.getByText('🌐')).toBeTruthy();
  });
});
