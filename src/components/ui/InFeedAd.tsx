import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AdBanner } from './AdBanner';
import { AdUnits } from '../../lib/adUnits';
import { useAuthStore } from '../../stores/auth-store';
import { Radius, Spacing } from '../../theme';

export interface InFeedAdProps {
  style?: StyleProp<ViewStyle>;
  slot?: string;
  layoutKey?: string;
  showBadge?: boolean;
}

/**
 * InFeedAd component for inserting ads inside scrollable feeds (such as the blog post list).
 * Meets Google AdSense requirement that feed containers must be wider than 250px.
 */
export const InFeedAd: React.FC<InFeedAdProps> = ({
  style,
  slot,
  layoutKey,
  showBadge = true,
}) => {
  const { user } = useAuthStore();

  const isPro =
    user?.user_metadata?.is_pro === true ||
    user?.user_metadata?.plan === 'pro' ||
    user?.user_metadata?.subscription === 'pro';

  if (isPro) {
    return null;
  }

  const adSlot = slot || (AdUnits as any).inFeed || AdUnits.banner;
  const inFeedLayoutKey = layoutKey || (AdUnits as any).inFeedLayoutKey || '';

  return (
    <View style={[styles.card, style]}>
      {showBadge && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>SPONSORED</Text>
        </View>
      )}
      <View style={styles.adWrapper}>
        <AdBanner
          mode="inline"
          adSlot={adSlot}
          adFormat={inFeedLayoutKey ? 'fluid' : 'auto'}
          adLayoutKey={inFeedLayoutKey || undefined}
          fullWidthResponsive={true}
          style={styles.adBannerStyle}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    marginVertical: Spacing.md,
    minWidth: 260,
    width: '100%',
    overflow: 'hidden',
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  adWrapper: {
    width: '100%',
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adBannerStyle: {
    paddingVertical: 0,
    width: '100%',
  },
});

export default InFeedAd;
