import React from 'react';
import { Pressable,  View, Text, StyleSheet, ScrollView, Switch, Alert, Platform } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Typography, Spacing, Radius, useTheme } from '../../src/theme';
import { Card, Button, Badge } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { useUIStore } from '../../src/stores/ui-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { useCredits } from '../../src/hooks/useCredits';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import Toast from 'react-native-toast-message';
import { Image } from 'expo-image';

declare let window: any;

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { setIsDark, notificationsEnabled, setNotificationsEnabled, setUpgradeModal } = useUIStore();
  const { user } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { profile } = useProfileStore();
  const { balance, plan, isPro, loading: creditsLoading } = useCredits();

  const signOut = () => useAuthStore.getState().signOut();

  // Dynamic user data
  const email = user?.email || 'user@example.com';
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Your Account';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'IR';

  const avatarUri = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=ffffff&size=128`;

  const planDisplayName = plan === 'PREMIUM_PLUS'
    ? 'Premium Plus'
    : plan === 'PREMIUM'
      ? 'Premium'
      : 'Free Tier';

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if ((window as any).confirm("Are you sure you want to log out?")) {
        signOut();
      }
    } else {
      Alert.alert(
        "Log Out",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Log Out", 
            style: "destructive",
            onPress: async () => {
              await signOut();
            }
          }
        ]
      );
    }
  };

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    Toast.show({
      type: enabled ? 'success' : 'info',
      text1: enabled ? 'Notifications Enabled' : 'Notifications Muted',
      text2: enabled
        ? 'You will receive in-app alerts and updates.'
        : 'In-app notification popups have been muted.',
    });
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.bgSecondary }]} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
    >
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={[styles.backBtn, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]} 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
          <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} />
        </View>
        <Text style={[styles.nameText, { color: colors.textPrimary }]}>{name}</Text>
        <Text style={[styles.emailText, { color: colors.textSecondary }]}>{email}</Text>
        <Button 
          title="Edit Profile" 
          variant="outline" 
          size="sm" 
          style={styles.editProfileBtn}
          onPress={() => router.push('/(tabs)/profile')}
        />
      </View>

      {/* Subscription & Credits */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Subscription & AI Credits</Text>
      <Card style={[styles.settingsCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.planTitle, { color: colors.textSecondary }]}>Current Membership</Text>
            <Text style={[styles.planName, { color: colors.textPrimary }]}>{planDisplayName}</Text>
          </View>
          <Badge 
            text={isPro ? (plan === 'PREMIUM_PLUS' ? 'Active VIP' : 'Active Pro') : 'Free Plan'} 
            variant={isPro ? 'success' : 'skill'} 
          />
        </View>

        <View style={[styles.creditsBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <View style={styles.creditsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flash" size={20} color="#F59E0B" />
              <Text style={[styles.creditsLabel, { color: colors.textPrimary }]}>AI Credits Remaining</Text>
            </View>
            <Text style={[styles.creditsCount, { color: colors.primary }]}>
              {creditsLoading ? '...' : (balance?.balance ?? 10)}
            </Text>
          </View>
          <Text style={[styles.creditsSubtext, { color: colors.textMuted }]}>
            {isPro 
              ? 'Active Pro benefits: Unlimited resume scoring, tailored cover letters, and live interview coaching.' 
              : 'Used for AI resume scoring, job match analysis, and interview questions.'}
          </Text>
        </View>

        <View style={{ padding: Spacing.lg, paddingTop: Spacing.sm }}>
          <Button 
            title={isPro ? "Manage Plan & Top Up Credits" : "Upgrade Plan / Buy Credits"} 
            variant="primary" 
            onPress={() => router.push('/(tabs)/pricing' as any)}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: 0 }]} />
        <SettingRow
          iconName="receipt-outline"
          title="Billing & Payment History"
          onPress={() => router.push('/billing-history' as any)}
        />
      </Card>

      {/* Preferences */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
      <Card style={[styles.settingsCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
        <SettingRow 
          iconName="notifications-outline"
          title="Push Notifications"
          rightElement={
            <Switch 
              value={notificationsEnabled} 
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={notificationsEnabled ? colors.primary : '#f4f3f4'}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow 
          iconName={isDark ? "sunny" : "moon-outline"}
          title={isDark ? "Light Mode" : "Dark Mode"}
          rightElement={
            <Switch 
              value={isDark} 
              onValueChange={setIsDark}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? colors.primary : '#f4f3f4'}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow 
          iconName="language-outline"
          title="Language"
          rightElement={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, marginRight: 8 }}>English</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          }
          onPress={() => Toast.show({ type: 'info', text1: 'Language selector coming soon!' })}
        />
      </Card>

      {/* Support & Legal */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support & Legal</Text>
      <Card style={[styles.settingsCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
        <SettingRow title="About Interview Ready" onPress={() => router.push('/about' as any)} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow title="Contact Support" onPress={() => router.push('/contact' as any)} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow title="Privacy Policy" onPress={() => router.push('/privacy' as any)} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow title="Terms of Service" onPress={() => router.push('/terms' as any)} />
      </Card>

      {/* Danger Zone */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
      <Card style={[styles.settingsCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
        <SettingRow 
          iconName="log-out-outline"
          title="Log Out"
          titleStyle={{ color: colors.error }}
          onPress={handleLogout}
          hideChevron
        />
      </Card>

      <Text style={[styles.versionText, { color: colors.textMuted }]}>
        Interview Ready v{Constants.expoConfig?.version || '1.0.1'}
      </Text>
    </ScrollView>
  );
}

function SettingRow({ 
  iconName, title, rightElement, onPress, hideChevron, titleStyle 
}: { 
  iconName?: React.ComponentProps<typeof Ionicons>['name'],
  title: string, 
  rightElement?: React.ReactNode, 
  onPress?: () => void,
  hideChevron?: boolean,
  titleStyle?: any
}) {
  const { colors } = useTheme();
  const isDestructive = title === 'Log Out';

  const content = (
    <View style={styles.settingRow}>
      <View style={styles.settingRowLeft}>
        {iconName && (
          <View style={[styles.settingIconBox, { backgroundColor: isDestructive ? `${colors.error}15` : colors.bgSecondary }]}>
            <Ionicons
              name={iconName}
              size={20}
              color={isDestructive ? colors.error : colors.textSecondary}
            />
          </View>
        )}
        <Text style={[styles.settingTitle, { color: colors.textPrimary }, titleStyle]}>{title}</Text>
      </View>
      {rightElement ? rightElement : (
        !hideChevron && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    padding: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  headerTitle: {
    ...Typography.headingLg,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    ...Typography.headingLg,
  },
  nameText: {
    ...Typography.headingMd,
  },
  emailText: {
    ...Typography.bodyMd,
    marginBottom: Spacing.md,
  },
  editProfileBtn: {
    minWidth: 120,
  },
  sectionTitle: {
    ...Typography.subtitle1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    marginTop: Spacing.md,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  planTitle: {
    ...Typography.bodySm,
  },
  planName: {
    ...Typography.subtitle1,
    marginTop: 2,
  },
  creditsBox: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  creditsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  creditsLabel: {
    ...Typography.bodyMd,
    fontWeight: '600',
  },
  creditsCount: {
    ...Typography.headingMd,
    fontWeight: '700',
  },
  creditsSubtext: {
    ...Typography.caption,
    lineHeight: 18,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: Spacing.md,
    width: 24,
    alignItems: 'center',
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingTitle: {
    ...Typography.bodyMd,
  },
  divider: {
    height: 1,
    marginLeft: 56, // Align with text
  },
  versionText: {
    ...Typography.bodySm,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
