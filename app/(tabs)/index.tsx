import { Pressable ,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import React, { useState } from 'react';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth-store';
import { useNotificationStore } from '../../src/stores/notification-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { useRecentActivitiesQuery } from '../../src/hooks/useApi';
import { ScoreRing, GoldenBox, ShimmerEffect } from '../../src/components/ui';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCredits } from '../../src/hooks/useCredits';
import { Image } from 'expo-image';

export default function DashboardScreen() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile, fetchProfile } = useProfileStore();
  const { unreadCount } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDark } = useTheme();
  const { balance, refreshBalance } = useCredits();

  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';
  const bottomNavPadding = useSafeAreaInsets().bottom + 72 + (!isPro ? 65 : 0);

  const userName = user?.user_metadata?.first_name || 'Alex';
  const credits = balance?.balance ?? 0;
  const plan = balance?.plan || 'FREE';
  
  let maxCredits = 10;
  if (plan === 'PREMIUM') maxCredits = 150;
  if (plan === 'PREMIUM_PLUS') maxCredits = 400;

  if (plan === 'FREE' && credits > maxCredits) {
    maxCredits = credits;
  }
  const completeness = (profile as any)?.profile_completeness ?? 0;

  const avatarUri = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=ffffff&size=128`;

  const getCompletenessMessage = (score: number) => {
    if (score === 0) return 'Start your profile';
    if (score < 40) return 'Basic info added';
    if (score < 70) return 'Profile is half-way';
    if (score < 100) return 'Almost ready!';
    return 'Ready for jobs!';
  };

  const { data: recentActivities, isLoading: isActivitiesLoading } = useRecentActivitiesQuery();

  const [shakeAnim] = useState(() => new Animated.Value(0));

  React.useEffect(() => {
    const startShaking = () => {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]).start();
    };

    const interval = setInterval(startShaking, 4000);
    // Initial delay so it doesn't shake immediately on mount before loading
    const timeout = setTimeout(startShaking, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [shakeAnim]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchProfile(),
        refreshBalance(),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProfile, refreshBalance]);

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
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            {isPro && (
              <View style={[styles.proBadge, { backgroundColor: colors.primary, borderColor: colors.bgPrimary }]}>
                <Text style={[styles.proBadgeText, { color: colors.textInverse }]}>PRO</Text>
              </View>
            )}
          </View>
          <View style={{ justifyContent: 'center' }}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Welcome back,</Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{userName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable 
            style={[styles.iconBtn, { backgroundColor: colors.bgSecondary }]}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.primary} style={{ color: colors.primary }} />
            {unreadCount() > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.error, borderColor: colors.bgPrimary }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount()}</Text>
              </View>
            )}
          </Pressable>
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
          <Pressable 
            style={[
              styles.statCard, 
              { 
                backgroundColor: colors.bgPrimary, 
                borderColor: (!isPro && credits < 2) ? colors.warning : colors.primary, 
                borderWidth: 1.5 
              }
            ]}
            onPress={() => router.push('/(tabs)/pricing?reason=low_credits' as any)}
          >
            <ShimmerEffect duration={4000} />
            <View style={styles.statHeader}>
              <Ionicons name="flash" size={14} color={(!isPro && credits < 2) ? colors.warning : colors.primary} />
              <Text style={[styles.statLabel, { color: (!isPro && credits < 2) ? colors.warning : colors.textMuted }]}>
                {(!isPro && credits < 2) ? 'Credits (Low)' : 'AI Credits'}
              </Text>
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{credits}</Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.bgMuted }]}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, (credits / maxCredits) * 100)}%`, backgroundColor: (!isPro && credits < 2) ? colors.warning : colors.primary }]} />
            </View>
          </Pressable>

          <View style={[styles.statCard, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}>
            <ShimmerEffect duration={4000} delay={1000} />
            <View style={styles.statHeader}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completeness</Text>
            </View>
            <View style={styles.completenessContent}>
              <ScoreRing score={completeness} size="sm" color={colors.success} animate />
              <Text 
                style={[styles.completenessText, { color: colors.textMuted, fontSize: 12 }]} 
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {getCompletenessMessage(completeness)}
              </Text>
            </View>
          </View>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
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
        </Animated.View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { title: 'Job Match',     color: colors.primary,  route: '/(tabs)/job-analyzer', icon: 'search-outline',   lib: 'ion' },
            { title: 'Build Resume',  color: colors.success,  route: '/(tabs)/new-resume',   icon: 'document-text-outline', lib: 'ion' },
            { title: 'Ask AI',        color: colors.warning,  route: '/(tabs)/ask-ai',       icon: 'robot-outline',    lib: 'mci' },
          ].map((action, i) => (
            <Pressable 
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
            </Pressable>
          ))}
        </View>

        <Pressable 
          style={[styles.featureCard, { backgroundColor: colors.primary }]} 
          
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
        </Pressable>

        <View style={styles.feedSection}>
          <View style={styles.feedHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]} numberOfLines={1}>Recent Activity</Text>
            <Pressable onPress={() => router.push('/(tabs)/activities' as any)}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>SEE ALL</Text>
            </Pressable>
          </View>

          {isActivitiesLoading ? (
            <Text style={{ color: colors.textMuted, padding: Spacing.md }}>Loading...</Text>
          ) : recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity, i) => {
              const handlePress = () => {
                if (activity.type === 'resume') router.push(`/(tabs)/new-resume?id=${activity.id}&fromList=true` as any);
                else if (activity.type === 'cover_letter') router.push(`/(tabs)/cover-letter?id=${activity.id}&fromList=true` as any);
                else if (activity.type === 'job_match') router.push(`/job-match-results?id=${activity.id}&fromList=true` as any);
                else if (activity.type === 'interview') router.push(`/feedback?id=${activity.id}&fromList=true` as any);
                else if (activity.type === 'company_research') router.push(`/(tabs)/company-research?id=${activity.id}` as any);
                else if (activity.type === 'linkedin') router.push(`/(tabs)/linkedin?id=${activity.id}` as any);
              };

              return (
                <Pressable 
                  key={i} 
                  style={[styles.feedItem, { backgroundColor: colors.bgPrimary, borderColor: colors.border }]}
                  onPress={handlePress}
                  
                >
                  <View style={[styles.feedIcon, { backgroundColor: `${activity.color}15` }]}>
                    <Ionicons name={activity.icon as any} size={18} color={activity.color} />
                  </View>
                  <View style={styles.feedContent}>
                    <Text style={[styles.feedTitle, { color: colors.textPrimary }]} numberOfLines={1}>{activity.title}</Text>
                    <Text style={[styles.feedTime, { color: colors.textMuted }]}>
                      {new Date(activity.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.feedArrow}>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text style={{ color: colors.textMuted, padding: Spacing.md }}>No recent activities found.</Text>
          )}
        </View>

        </ScrollView>

        <View style={{ height: bottomNavPadding }} />
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
