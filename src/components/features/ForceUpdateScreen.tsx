import { Pressable ,
  View,
  Text,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Image } from 'expo-image';

interface ForceUpdateScreenProps {
  versionInfo: {
    current_version: string;
    minimum_version: string;
    latest_version: string;
    message: string;
    store_url: string | null;
    force_update: boolean;
  };
  onRetry?: () => void;
}

export function ForceUpdateScreen({ versionInfo, onRetry }: ForceUpdateScreenProps) {
  const handleUpdate = async () => {
    if (versionInfo.store_url) {
      try {
        const supported = await Linking.canOpenURL(versionInfo.store_url);
        if (supported) {
          await Linking.openURL(versionInfo.store_url);
        } else {
          console.error('Cannot open store URL:', versionInfo.store_url);
        }
      } catch (error) {
        console.error('Error opening store URL:', error);
      }
    }
  };

  const getStoreButtonText = () => {
    if (Platform.OS === 'ios') {
      return 'Update on App Store';
    }
    return 'Update on Play Store';
  };

  const getStoreIcon = () => {
    if (Platform.OS === 'ios') {
      return 'logo-apple-appstore';
    }
    return 'logo-google-playstore';
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-download-outline" size={80} color="#fff" />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {versionInfo.force_update ? 'Update Required' : 'Update Available'}
        </Text>

        {/* Message */}
        <Text style={styles.message}>{versionInfo.message}</Text>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Current Version:</Text>
            <Text style={styles.versionValue}>{versionInfo.current_version}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Latest Version:</Text>
            <Text style={styles.versionValue}>{versionInfo.latest_version}</Text>
          </View>
        </View>

        {/* Update Button */}
        {versionInfo.store_url && (
          <Pressable
            style={styles.updateButton}
            onPress={handleUpdate}
            
          >
            <Ionicons name={getStoreIcon()} size={24} color="#667eea" />
            <Text style={styles.updateButtonText}>{getStoreButtonText()}</Text>
          </Pressable>
        )}

        {/* Retry Button (only if not force update) */}
        {!versionInfo.force_update && onRetry && (
          <Pressable
            style={styles.retryButton}
            onPress={onRetry}
            
          >
            <Text style={styles.retryButtonText}>Continue with Current Version</Text>
          </Pressable>
        )}

        {/* Info Text */}
        <Text style={styles.infoText}>
          {versionInfo.force_update
            ? 'You must update to continue using Interview Ready.'
            : 'We recommend updating for the best experience.'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    opacity: 0.95,
  },
  versionContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  versionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 12,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    textDecorationLine: 'underline',
    opacity: 0.9,
  },
  infoText: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 10,
  },
});
