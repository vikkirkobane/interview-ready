import React from 'react';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores } from '../helpers/stores';
import { InFeedAd } from '../../src/components/ui/InFeedAd';
import { InArticleAd } from '../../src/components/ui/InArticleAd';
import { useAuthStore } from '../../src/stores/auth-store';

describe('Website Blog Ads Components', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('renders InFeedAd with sponsored badge for free users', async () => {
    const screen = await renderWithProviders(<InFeedAd />);
    expect(screen.getByText('SPONSORED')).toBeTruthy();
  });

  it('hides InFeedAd for Pro users', async () => {
    useAuthStore.setState({
      user: {
        id: 'pro-user-1',
        email: 'pro@test.com',
        user_metadata: { is_pro: true },
      } as any,
    });

    const screen = await renderWithProviders(<InFeedAd />);
    expect(screen.queryByText('SPONSORED')).toBeNull();
  });

  it('renders InArticleAd with advertisement badge for free users', async () => {
    const screen = await renderWithProviders(<InArticleAd />);
    expect(screen.getByText('ADVERTISEMENT')).toBeTruthy();
  });

  it('hides InArticleAd for Pro users', async () => {
    useAuthStore.setState({
      user: {
        id: 'pro-user-2',
        email: 'pro2@test.com',
        user_metadata: { plan: 'pro' },
      } as any,
    });

    const screen = await renderWithProviders(<InArticleAd />);
    expect(screen.queryByText('ADVERTISEMENT')).toBeNull();
  });
});
