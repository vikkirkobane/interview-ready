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

  it('keeps InFeedAd badge hidden while unfilled to prevent empty placeholder displacement', async () => {
    const screen = await renderWithProviders(<InFeedAd />);
    // Badge is not shown until Google AdSense confirms filled status
    expect(screen.queryByText('SPONSORED')).toBeNull();
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

  it('keeps InArticleAd badge hidden while unfilled to prevent empty placeholder displacement', async () => {
    const screen = await renderWithProviders(<InArticleAd />);
    // Badge is not shown until Google AdSense confirms filled status
    expect(screen.queryByText('ADVERTISEMENT')).toBeNull();
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
