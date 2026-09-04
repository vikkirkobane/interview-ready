import React, { useState } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { AdBanner } from './AdBanner';
import { AdUnits } from '../../lib/adUnits';
import { useAuthStore } from '../../stores/auth-store';
import { Radius, Spacing } from '../../theme';

export interface InArticleAdProps {
  style?: StyleProp<ViewStyle>;
  slot?: string;
  showBadge?: boolean;
}

/**
 * InArticleAd component for inserting ads inside long-form articles.
 * Collapses completely to 0-height without displacement when unfilled,
 * and renders clean styling and ADVERTISEMENT tag only when filled.
 */
export const InArticleAd: React.FC<InArticleAdProps> = ({
  style,
  slot,
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

  const adSlot = slot || (AdUnits as any).inArticle || AdUnits.banner;

  return (
    <View style={[isFilled ? styles.container : styles.hiddenWrapper, style]}>
      {isFilled && showBadge && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>ADVERTISEMENT</Text>
        </View>
      )}
      <View style={isFilled ? styles.adWrapper : styles.adWrapperHidden}>
        <AdBanner
          mode="inline"
          adSlot={adSlot}
          adFormat="fluid"
          adLayout="in-article"
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
  container: {
    backgroundColor: '#FAFAFA',
    borderRadius: Radius.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginVertical: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
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

export default InArticleAd;
