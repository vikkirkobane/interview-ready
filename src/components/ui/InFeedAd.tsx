import React, { useState } from 'react';
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
 * InFeedAd component for inserting ads inside scrollable feeds.
 * Stays 0-height and hidden without displacement while unfilled,
 * only revealing card styling and SPONSORED badge when an ad is filled.
 */
export const InFeedAd: React.FC<InFeedAdProps> = ({
  style,
  slot,
  layoutKey,
  showBadge = true,
}) => {
  const { user } = useAuthStore();
  const [isFilled, setIsFilled] = useState(false);
  const [isUnfilled, setIsUnfilled] = useState(false);

  const isPro =
    user?.user_metadata?.is_pro === true ||
    user?.user_metadata?.plan === 'pro' ||
    user?.user_metadata?.subscription === 'pro';

  if (isPro || isUnfilled) {
    return null;
  }

  const adSlot = slot || (AdUnits as any).inFeed || AdUnits.banner;
  const inFeedLayoutKey = layoutKey || (AdUnits as any).inFeedLayoutKey || '';

  return (
    <View style={[isFilled ? styles.card : styles.hiddenWrapper, style]}>
      {isFilled && showBadge && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>SPONSORED</Text>
        </View>
      )}
      <View style={isFilled ? styles.adWrapper : styles.adWrapperHidden}>
        <AdBanner
          mode="inline"
          adSlot={adSlot}
          adFormat={inFeedLayoutKey ? 'fluid' : 'auto'}
          adLayoutKey={inFeedLayoutKey || undefined}
          onStatusChange={(status) => {
            if (status === 'filled') {
              setIsFilled(true);
              setIsUnfilled(false);
            } else if (status === 'unfilled') {
              setIsUnfilled(true);
              setIsFilled(false);
            }
          }}
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
  hiddenWrapper: {
    width: '100%',
    minHeight: 0,
    height: 0,
    marginVertical: 0,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 0,
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
  adWrapperHidden: {
    width: '100%',
    height: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  adBannerStyle: {
    paddingVertical: 0,
    width: '100%',
  },
});

export default InFeedAd;
