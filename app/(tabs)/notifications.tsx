import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useRouter } from 'expo-router';
import { useNotificationStore, AppNotification } from '../../src/stores/notification-store';
import { useAuthStore } from '../../src/stores/auth-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { Ionicons } from '@expo/vector-icons';

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { colors, isDark } = useTheme();

  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const completeness = profile?.profileCompleteness || 0;
  const isProfileIncomplete = completeness < 100 && !user?.user_metadata?.onboarding_completed;

  const displayNotifications = useMemo(() => {
    const systemAlerts: AppNotification[] = [];
    
    if (!isPro) {
      systemAlerts.push({
        id: 'system-upgrade-pro',
        title: 'Upgrade to Pro 🚀',
        description: 'Unlock advanced AI features and unlimited credits.',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'warning',
      });
    }

    if (isProfileIncomplete) {
      systemAlerts.push({
        id: 'system-complete-profile',
        title: 'Complete your profile',
        description: 'Finish setting up your profile to get tailored job matches.',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'info',
      });
    }

    return [...systemAlerts, ...notifications];
  }, [notifications, isPro, isProfileIncomplete]);

  const getGeometryColor = (type: string) => {
    switch (type) {
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'error': return colors.error;
      case 'info':
      default: return colors.primary;
    }
  };

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: { backgroundColor: colors.bgSecondary },
    header: { 
      backgroundColor: colors.bgPrimary, 
      borderBottomColor: colors.border 
    },
    headerTitle: { color: colors.textPrimary },
    countText: { color: colors.textMuted },
    actionBtnText: { color: colors.primary },
    actionBtnErrorText: { color: colors.error },
    card: { 
      backgroundColor: colors.bgPrimary, 
      borderColor: colors.border,
      shadowColor: isDark ? 'transparent' : '#000',
    },
    cardUnread: { 
      backgroundColor: colors.bgSecondary, 
      borderColor: colors.borderFocus,
    },
    title: { color: colors.textPrimary },
    description: { color: colors.textBody },
    timestamp: { color: colors.textMuted },
    emptyTitle: { color: colors.textPrimary },
    emptyDesc: { color: colors.textMuted },
  }), [colors, isDark]);

  const handleNotificationPress = (notification: AppNotification) => {
    if (notification.id === 'system-upgrade-pro') {
      router.push('/(tabs)/settings');
      return;
    }
    if (notification.id === 'system-complete-profile') {
      router.push('/(tabs)/profile');
      return;
    }
    markAsRead(notification.id);
  };

  return (
    <View style={[styles.flex, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Notifications</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.actionHeader}>
        <Text style={[styles.countText, dynamicStyles.countText]}>
          {displayNotifications.length} {displayNotifications.length === 1 ? 'Notification' : 'Notifications'}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionBtn} onPress={markAllAsRead}>
            <Text style={[styles.actionBtnText, dynamicStyles.actionBtnText]}>MARK READ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={clearAll}>
            <Text style={[styles.actionBtnText, dynamicStyles.actionBtnErrorText]}>CLEAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {displayNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done" size={48} color={colors.textMuted} style={{ marginBottom: Spacing.lg }} />
            <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>All caught up!</Text>
            <Text style={[styles.emptyDesc, dynamicStyles.emptyDesc]}>You have no new notifications.</Text>
          </View>
        ) : (
          displayNotifications.map((notification) => {
            const geomColor = getGeometryColor(notification.type);
            const isSystem = notification.id.startsWith('system-');
            return (
              <TouchableOpacity 
                key={notification.id} 
                style={[
                  styles.notificationCard, 
                  dynamicStyles.card,
                  !notification.read && dynamicStyles.cardUnread
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={[styles.geometryContainer, { backgroundColor: `${geomColor}${isDark ? '25' : '15'}` }]}>
                  <Ionicons name={isSystem ? "star" : "notifications"} size={20} color={geomColor} />
                </View>
                <View style={styles.contentContainer}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, dynamicStyles.title]}>{notification.title}</Text>
                    {!notification.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.description, dynamicStyles.description]}>{notification.description}</Text>
                  <Text style={[styles.timestamp, dynamicStyles.timestamp]}>
                    {isSystem ? 'System Action Required' : timeAgo(notification.timestamp)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  navText: {
    ...Typography.label,
    letterSpacing: 1,
  },
  headerTitle: {
    ...Typography.headingMd,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  countText: {
    ...Typography.bodySm,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    ...Typography.label,
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    ...Shadow.sm,
  },
  geometryContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.md, // Squared off tech look
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    ...Typography.bodyLg,
    fontWeight: '700',
    flex: 1,
    paddingRight: Spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  description: {
    ...Typography.bodyMd,
    marginBottom: Spacing.sm,
  },
  timestamp: {
    ...Typography.bodySm,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyTitle: {
    ...Typography.headingMd,
    marginBottom: Spacing.xs,
  },
  emptyDesc: {
    ...Typography.bodyMd,
  },
});
