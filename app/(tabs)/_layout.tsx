import React, { useState, useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Pressable,  View, Text, StyleSheet, Platform, ColorValue } from 'react-native';
import { Typography, Spacing, useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/stores/auth-store';
import { useNavigationStore } from '../../src/stores/navigation-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { SideMenu } from '../../src/components/ui/SideMenu';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { AdBanner } from '../../src/components/ui/AdBanner';

// Custom Animated Icon Component for Bottom Tabs
const AnimatedTabIcon = ({ focused, color, size, name, isMaterial }: { focused: boolean, color: ColorValue, size: number, name: any, isMaterial?: boolean }) => {
  const colorString = typeof color === 'string' ? color : '#000';
  return (
    <MotiView
      from={{ translateY: 0, scale: 1 }}
      animate={{ 
        translateY: focused ? -8 : 0, 
        scale: focused ? 1.15 : 1 
      }}
      transition={{ 
        type: 'spring', 
        damping: 14, 
        stiffness: 200 
      }}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: focused ? 'rgba(51, 119, 255, 0.15)' : 'transparent',
      }}
    >
      {isMaterial ? (
        <MaterialCommunityIcons name={name} size={size + 4} color={colorString} />
      ) : (
        <Ionicons name={name} size={size + 4} color={colorString} />
      )}
      {focused && (
        <MotiView
          from={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 50, damping: 10, stiffness: 150 }}
          style={{
            position: 'absolute',
            bottom: -6,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colorString,
          }}
        />
      )}
    </MotiView>
  );
};

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  // Font-based icons from @expo/vector-icons are SSR-safe on web,
  // but we still guard to avoid any hydration flash.
  const [isMounted, setIsMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setIsMounted(true); }, []);

  const { openMenu } = useNavigationStore();
  const { profile, loading: profileLoading, fetchProfile } = useProfileStore();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const isCompleted = user?.user_metadata?.onboarding_completed;
    const hasFirstName = !!(user?.user_metadata?.first_name || (profile as any)?.first_name);
    const hasLastName = !!(user?.user_metadata?.last_name || (profile as any)?.last_name);
    const hasCurrentRole = !!(profile as any)?.current_role;

    if (!profileLoading && (!profile || !hasFirstName || !hasLastName || !hasCurrentRole) && !isCompleted) {
      router.replace('/(onboarding)/role');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profileLoading, user]);

  const isPro = user?.user_metadata?.is_pro === true || user?.user_metadata?.plan === 'pro' || user?.user_metadata?.subscription === 'pro';

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              style={[styles.headerTitleContainer, { paddingLeft: Spacing.md }]}
              onPress={openMenu}
            >
              <View style={[styles.menuIcon, { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }]}>
                {isMounted && (
                  <Image 
                    source={require('../../assets/logo.png')} 
                    style={{ width: 28, height: 28 }} 
                    resizeMode="contain" 
                  />
                )}
              </View>
              <Text style={[styles.headerTitleText, { color: colors.primary }]}>Interview Ready</Text>
            </Pressable>
          ),
          headerTitle: '',
          headerRight: () => (
            <Pressable
              style={styles.headerRight}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                {isMounted && (
                  <Ionicons name="settings-outline" size={24} color={colors.primary} />
                )}
              </View>
            </Pressable>
          ),
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: 'absolute',
            bottom: insets.bottom > 0 ? insets.bottom + 8 : Spacing.md,
            left: Spacing.lg,
            right: Spacing.lg,
            backgroundColor: colors.bgCard,
            borderTopWidth: 0,
            borderRadius: 36,
            height: 72,
            paddingBottom: 0,
            paddingTop: 0,
            paddingHorizontal: Spacing.sm,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 10,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name={focused ? 'home' : 'home-outline'} size={size} color={color} focused={focused} /> : null,
          }}
        />
        <Tabs.Screen
          name="new-resume"
          options={{
            title: 'Resume',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name={focused ? 'document-text' : 'document-text-outline'} size={size} color={color} focused={focused} /> : null,
          }}
        />
        <Tabs.Screen
          name="cover-letter"
          options={{
            title: 'Cover Letter',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name={focused ? 'mail' : 'mail-outline'} size={size} color={color} focused={focused} /> : null,
          }}
        />
        <Tabs.Screen
          name="ask-ai"
          options={{
            title: 'Ask AI',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name={focused ? 'robot' : 'robot-outline'} size={size} color={color} focused={focused} isMaterial /> : null,
          }}
        />
        <Tabs.Screen
          name="resumes"
          options={{
            title: 'Resumes',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name="documents-outline" size={size} color={color} focused={focused} /> : null,
            href: null,
          }}
        />
        <Tabs.Screen
          name="tracker"
          options={{
            title: 'Tracker',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name={focused ? 'briefcase' : 'briefcase-outline'} size={size} color={color} focused={focused} /> : null,
            href: null,
          }}
        />
        <Tabs.Screen name="job-analyzer" options={{ href: null }} />
        <Tabs.Screen name="activities" options={{ href: null }} />
        <Tabs.Screen name="job-match-results" options={{ href: null }} />
        <Tabs.Screen name="feedback" options={{ href: null }} />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name={focused ? 'person' : 'person-outline'} size={size} color={color} focused={focused} /> : null,
            href: null,
          }}
        />
        <Tabs.Screen
          name="linkedin"
          options={{
            title: 'LinkedIn',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name="linkedin" size={size} color={color} focused={focused} isMaterial /> : null,
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size, focused }) =>
              isMounted ? <AnimatedTabIcon name={focused ? 'settings' : 'settings-outline'} size={size} color={color} focused={focused} /> : null,
            href: null,
          }}
        />
        <Tabs.Screen name="pricing" options={{ href: null }} />
        <Tabs.Screen name="interview" options={{ href: null }} />
        <Tabs.Screen name="interviews" options={{ href: null }} />
        <Tabs.Screen name="referral" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="company-research" options={{ href: null }} />
      </Tabs>
      {!isPro && <AdBanner />}
      <SideMenu />
    </>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    paddingRight: Spacing.md,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 10,
  },
  headerTitleText: {
    ...Typography.headingLg,
  },
});
