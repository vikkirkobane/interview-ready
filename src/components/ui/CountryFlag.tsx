import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, StyleProp } from 'react-native';

interface CountryFlagProps {
  countryCode: string;
  fallbackEmoji?: string;
  size?: number; // width in pixels
  style?: StyleProp<ImageStyle>;
}

/**
 * Universal Country Flag component that renders real flag images on all operating systems
 * (including Windows desktop browsers where standard flag emojis render as letters KE, NG, US, etc.)
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  fallbackEmoji,
  size = 28,
  style,
}) => {
  const [hasError, setHasError] = useState(false);
  const code = (countryCode || '').toLowerCase();
  const height = Math.round((size * 3) / 4);

  if (!code || hasError) {
    return (
      <View style={[styles.fallbackContainer, { width: size, height }]}>
        <Text style={styles.fallbackText}>{fallbackEmoji || countryCode}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flagWrapper, { width: size, height }]}>
      <Image
        source={{ uri: `https://flagcdn.com/w80/${code}.png` }}
        style={[
          styles.flagImage,
          { width: size, height },
          style,
        ]}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flagWrapper: {
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  flagImage: {
    borderRadius: 3,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 16,
  },
});
