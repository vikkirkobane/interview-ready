import React from 'react';
import { render } from '@testing-library/react-native';
import { PWAInstallBanner } from '../../src/components/features/PWAInstallBanner';

describe('PWAInstallBanner', () => {
  it('renders without crashing', () => {
    const screen = render(<PWAInstallBanner />);
    expect(screen).toBeDefined();
  });
});
