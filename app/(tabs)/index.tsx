import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth-store';
import { useNotificationStore } from '../../src/stores/notification-store';
import { ScoreRing, GoldenBox, ShimmerEffect } from '../../src/components/ui';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDark } = useTheme();

  const userName = user?.user_metadata?.first_name || 'Alex';
  const credits = 24; // Mock
  const completeness = 85;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgSecondary }]}>
      {/* App Bar */}
      <View style={[styles.header, { 
        paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl, 
        backgroundColor: colors.bgPrimary, 
        borderBottomColor: colors.border 
      }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: colors.bgMuted }]} />
            <View style={[styles.proBadge, { backgroundColor: colors.primary, borderColor: colors.bgPrimary }]}>
              <Text style={[styles.proBadgeText, { color: colors.textInverse }]}>PRO</Text>
            </View>
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Welcome back,</Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{userName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: colors.bgSecondary }]}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.primary} style={{ color: colors.primary }} />
            {unreadCount() > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.error, borderColor: colors.bgPrimary }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.bgPrimary, borderColor: colors.primary, borderWidth: 1 }]}>
            <ShimmerEffect duration={4000} />
            <View style={styles.statHeader}>
              <Ionicons name="flash" size={14} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>AI Credits</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{credits}</Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.bgMuted }]}>
              <View style={[styles.progressBarFill, { width: `${(credits / 50) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.statSubText, { color: colors.textMuted }]}>{credits} of 50 remaining</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <ShimmerEffect duration={4000} delay={1000} />
            <View style={styles.statHeader}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completeness</Text>
            </View>
            <View style={styles.completenessContent}>
              <ScoreRing score={completeness} size="sm" color={colors.success} animate />
              <Text style={[styles.completenessText, { color: colors.textMuted }]}>Profile is ready for applications</Text>
            </View>
          </View>
        </View>

        <GoldenBox onPress={() => router.push('/referral')}>
          <View style={styles.promoContent}>
            <View style={styles.promoIconBg}>
              <Ionicons name="gift" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.promoTextContainer}>
              <Text style={styles.promoTitle}>Get Free Credits</Text>
              <Text style={styles.promoDesc}>Invite friends and earn 10 credits</Text>
            </View>
          </View>
        </GoldenBox>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { title: 'Job Match',     color: colors.primary,  route: '/(tabs)/job-analyzer', icon: 'search-outline',   lib: 'ion' },
            { title: 'Build Resume',  color: colors.success,  route: '/(tabs)/new-resume',   icon: 'document-text-outline', lib: 'ion' },
            { title: 'Ask AI',        color: colors.warning,  route: '/(tabs)/ask-ai',       icon: 'robot-outline',    lib: 'mci' },
          ].map((action, i) => (
            <TouchableOpacity 
              key={i}
              style={[styles.quickCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
              onPress={() => router.push(action.route as any)}
            >
              <ShimmerEffect duration={3500} delay={i * 500} />
              <View style={[styles.quickIconBg, { backgroundColor: `${action.color}${isDark ? '33' : '1A'}` }]}>
                {action.lib === 'mci'
                  ? <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
                  : <Ionicons name={action.icon as any} size={24} color={action.color} />
                }
              </View>
              <Text style={[styles.quickCardTitle, { color: colors.textBody }]}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.featureCard, { backgroundColor: colors.primary }]} 
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/cover-letter')}
        >
          <ShimmerEffect duration={5000} opacity={0.6} />
          <View style={styles.featureCardContent}>
            <View style={styles.featureBadge}>
              <Text style={styles.featureBadgeText}>NEW UPDATE</Text>
            </View>
            <Text style={styles.featureTitle}>Auto-tailor Cover Letters</Text>
            <Text style={styles.featureDesc}>
              Instantly generate highly personalized cover letters.
            </Text>
            <View style={styles.featureAction}>
              <Text style={styles.featureActionText}>TRY IT NOW</Text>
            </View>
          </View>
          <View style={styles.featureImagePlaceholder}>
            <Ionicons name="document-text" size={64} color="rgba(255,255,255,0.4)" />
          </View>
        </TouchableOpacity>

        <View style={styles.feedSection}>
          <View style={styles.feedHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>SEE ALL</Text>
            </TouchableOpacity>
          </View>

          {[1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.feedItem, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
              <View style={[styles.feedIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.feedContent}>
                <Text style={[styles.feedTitle, { color: colors.textPrimary }]}>Generated Resume: PM</Text>
                <Text style={[styles.feedTime, { color: colors.textMuted }]}>2 hours ago • ATS Score: 89</Text>
              </View>
              <View style={styles.feedArrow}>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  proBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 2,
  },
  proBadgeText: {
    ...Typography.label,
    fontSize: 9,
    fontWeight: '800',
  },
  greeting: {
    ...Typography.bodySm,
  },
  name: {
    ...Typography.headingMd,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  navText: { ...Typography.headingMd },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    ...Shadow.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  statLabel: {
    ...Typography.label,
  },
  statValue: {
    ...Typography.displayMd,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  statSubText: {
    ...Typography.bodySm,
    fontSize: 11,
  },
  completenessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  completenessText: {
    ...Typography.bodySm,
    flex: 1,
  },
  sectionTitle: {
    ...Typography.headingMd,
    marginBottom: Spacing.md,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  quickCard: {
    flex: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  quickIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTitle: {
    ...Typography.label,
    textAlign: 'center',
  },
  featureCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadow.md,
    overflow: 'hidden',
  },
  featureCardContent: {
    flex: 1,
    zIndex: 2,
  },
  featureBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  featureBadgeText: {
    ...Typography.label,
    fontSize: 10,
    color: '#ffffff',
  },
  featureTitle: {
    ...Typography.headingMd,
    color: '#ffffff',
    marginBottom: Spacing.xs,
  },
  featureDesc: {
    ...Typography.bodySm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.md,
  },
  featureAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureActionText: {
    ...Typography.label,
    color: '#ffffff',
  },
  featureImagePlaceholder: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  feedSection: { gap: Spacing.sm },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  seeAllText: { ...Typography.label },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  feedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedContent: { flex: 1 },
  feedTitle: { ...Typography.bodyMd, fontWeight: '600' },
  feedTime: { ...Typography.bodySm },
  feedArrow: { padding: 8 },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  promoIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoTextContainer: { flex: 1 },
  promoTitle: {
    ...Typography.headingLg,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 4,
  },
  promoDesc: {
    ...Typography.bodyMd,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
