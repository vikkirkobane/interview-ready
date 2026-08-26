import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../theme';

const STORAGE_KEY = 'interview_ready_pwa_banner_dismissed_until';
const DISMISS_DURATION_DAYS = 7;

/**
 * PWA Install & "Add to Home Screen" Banner
 * Only appears on Web browsers when the app is not already running in standalone mode.
 * Provides custom Safari "Add to Home Screen" instructions for iOS users.
 */
export function PWAInstallBanner() {
  const { colors } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const checkPWAStatus = async () => {
      try {
        // Check if already running in standalone / PWA mode
        const isStandalone =
          window.matchMedia?.('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true ||
          document.referrer.includes('android-app://');

        if (isStandalone) {
          return;
        }

        // Check if user previously dismissed the prompt
        const dismissedUntil = await AsyncStorage.getItem(STORAGE_KEY);
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
          return;
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent || '';
        const isIOSDevice =
          /iPad|iPhone|iPod/.test(userAgent) ||
          (/Macintosh/.test(userAgent) && (window.navigator.maxTouchPoints || 0) > 1);

        setIsIOS(isIOSDevice);

        if (isIOSDevice) {
          // On iOS Safari, display the instruction banner
          setIsVisible(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        } else {
          // On Chrome / Edge / Android, listen for beforeinstallprompt
          const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start();
          };

          window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

          return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          };
        }
      } catch (err) {
        console.warn('PWA banner check error:', err);
      }
    };

    checkPWAStatus();
  }, [fadeAnim]);

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsVisible(false));

    try {
      const dismissUntil = Date.now() + DISMISS_DURATION_DAYS * 24 * 60 * 60 * 1000;
      await AsyncStorage.setItem(STORAGE_KEY, dismissUntil.toString());
    } catch {
      // Ignored
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA prompt install error:', err);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
      accessibilityRole="region"
      accessibilityLabel="Install App Banner"
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Install Interview Ready
          </Text>

          {isIOS ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Install on your iPhone: Tap{' '}
              <Ionicons name="share-outline" size={14} color={colors.primary} />{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Share</Text> in
              Safari, then tap{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                &quot;Add to Home Screen&quot;
              </Text>{' '}
              for the best full-screen experience.
            </Text>
          ) : (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Install our app to your home screen for quick access and full-screen coaching.
            </Text>
          )}
        </View>

        <Pressable
          onPress={handleDismiss}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss install banner"
        >
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {!isIOS && deferredPrompt && (
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleInstallClick}
            style={[styles.installBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Install app now"
          >
            <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.installBtnText}>Install App</Text>
          </Pressable>
          <Pressable onPress={handleDismiss} style={styles.laterBtn}>
            <Text style={[styles.laterBtnText, { color: colors.textMuted }]}>Maybe Later</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    maxWidth: 520,
    alignSelf: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    zIndex: 9999,
    ...Shadow.lg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: Spacing.xs,
  },
  title: {
    ...Typography.headingSm,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    ...Typography.bodySm,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  installBtnText: {
    color: '#FFFFFF',
    ...Typography.bodySm,
    fontWeight: '600',
  },
  laterBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  laterBtnText: {
    ...Typography.bodySm,
  },
});
