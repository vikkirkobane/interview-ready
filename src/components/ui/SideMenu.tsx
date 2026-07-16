import { Pressable , 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useNavigationStore } from '../../stores/navigation-store';
import { useAuthStore } from '../../stores/auth-store';
import { Typography, Spacing, Radius, Shadow, useTheme } from '../../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.75, 320);

export function SideMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { isMenuOpen, closeMenu } = useNavigationStore();
  const { user, signOut } = useAuthStore();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [slideAnim] = useState(() => new Animated.Value(-DRAWER_WIDTH));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // useNativeDriver for transform/opacity is not supported on web
    const nativeDriver = Platform.OS !== 'web';
    if (isMenuOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: nativeDriver,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: nativeDriver,
        })
      ]).start();
    }
  }, [isMenuOpen, slideAnim, fadeAnim]);

  const handleNavigation = (path: string) => {
    closeMenu();
    // small delay to let menu close before navigating
    setTimeout(() => {
      router.push(path as any);
    }, 200);
  };

  const handleSignOut = () => {
    closeMenu();
    signOut();
  };

  const menuItems = [
    { name: 'Home',            path: '/(tabs)/',            icon: 'home-outline',           iconActive: 'home',            lib: 'ion' },
    { name: 'Job Match',       path: '/(tabs)/job-analyzer',icon: 'search-outline',         iconActive: 'search',          lib: 'ion' },
    { name: 'Build Resume',    path: '/(tabs)/new-resume',  icon: 'document-text-outline',  iconActive: 'document-text',   lib: 'ion' },
    { name: 'Cover Letters',   path: '/(tabs)/cover-letter',icon: 'mail-outline',           iconActive: 'mail',            lib: 'ion' },
    { name: 'Mock Interview',  path: '/interviews',          icon: 'mic-outline',            iconActive: 'mic',             lib: 'ion' },
    { name: 'Ask AI',          path: '/(tabs)/ask-ai',      icon: 'robot-outline',          iconActive: 'robot',           lib: 'mci' },
    { name: 'Tracker',         path: '/(tabs)/tracker',           icon: 'briefcase-outline',      iconActive: 'briefcase',       lib: 'ion' },
    { name: 'Company Research', path: '/(tabs)/company-research',  icon: 'business-outline',       iconActive: 'business',        lib: 'ion' },
    { name: 'LinkedIn',        path: '/(tabs)/linkedin',          icon: 'logo-linkedin',          iconActive: 'logo-linkedin',   lib: 'ion' },
    { name: 'Onboarding',      path: '/(onboarding)/role',        icon: 'compass-outline',        iconActive: 'compass',         lib: 'ion' },
    { name: 'Billing',         path: '/(tabs)/pricing',           icon: 'card-outline',           iconActive: 'card',            lib: 'ion' },
    { name: 'Referral',        path: '/(tabs)/referral',          icon: 'gift-outline',           iconActive: 'gift',            lib: 'ion' },
  ];

  const renderIcon = (item: typeof menuItems[0], isActive: boolean) => {
    const color = isActive ? colors.primary : colors.textBody;
    const iconName = isActive ? item.iconActive : item.icon;
    if (item.lib === 'mci') {
      return <MaterialCommunityIcons name={iconName as any} size={22} color={color} />;
    }
    return <Ionicons name={iconName as any} size={22} color={color} />;
  };

  return (
    <Modal
      visible={isMenuOpen}
      transparent={true}
      animationType="none"
      onRequestClose={closeMenu}
    >
      <View style={styles.overlayContainer}>
        {/* Backdrop */}
        <Pressable onPress={closeMenu} style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </Pressable>

        {/* Sliding Drawer */}
        <Animated.View style={[
          styles.drawer, 
          { 
            backgroundColor: colors.bgPrimary, 
            transform: [{ translateX: slideAnim }],
            paddingBottom: insets.bottom > 0 ? insets.bottom + Spacing.md : Spacing.xl,
            paddingTop: insets.top > 0 ? insets.top + Spacing.md : Spacing.xl,
          }
        ]}>
          <View style={styles.drawerHeader}>
            <View style={styles.headerTitleContainer}>
              <Image 
                source={require('../../../assets/logo.png')} 
                style={{ width: 24, height: 24, marginRight: 8 }} 
                resizeMode="contain" 
              />
              <Text style={[styles.appName, { color: colors.primary }]}>Interview Ready</Text>
            </View>
            <Pressable onPress={closeMenu} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.primary} style={{ color: colors.primary }} />
            </Pressable>
          </View>

          <Pressable 
            style={styles.userInfo} 
            
            onPress={() => handleNavigation('/(tabs)/profile')}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.user_metadata?.first_name?.[0] || 'J'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>
                {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
            </View>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, index) => {
              const isActive = pathname === item.path || (item.path === '/(tabs)/' && pathname === '/');
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.menuItem,
                    isActive && { backgroundColor: `${colors.primary}15` },
                  ]}
                  onPress={() => handleNavigation(item.path)}
                >
                  <View style={[
                    styles.menuIconBox,
                    { backgroundColor: isActive ? `${colors.primary}20` : 'transparent' },
                  ]}>
                    {renderIcon(item, isActive)}
                  </View>
                  <Text style={[
                    styles.menuItemText,
                    { color: isActive ? colors.primary : colors.textBody },
                    isActive && { fontWeight: '700' },
                  ]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable style={styles.logoutButton} onPress={handleSignOut}>
            <View style={[styles.menuIconBox, { backgroundColor: `${colors.error}15` }]}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
            </View>
            <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    maxWidth: 320,
    height: '100%',
    ...Shadow.lg,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appName: {
    ...Typography.headingLg,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.headingMd,
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...Typography.bodyLg,
    fontWeight: '700',
  },
  userEmail: {
    ...Typography.bodySm,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.md,
  },
  menuItems: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: 2,
    gap: Spacing.md,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    ...Typography.bodyLg,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  logoutText: {
    ...Typography.bodyLg,
    fontWeight: '600',
  },
});
